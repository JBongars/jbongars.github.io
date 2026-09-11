import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import type { OutputChunk, Plugin, RollupCache } from "rollup";
import { rollup } from "rollup";
import * as typescriptNamespace from "@rollup/plugin-typescript";
import { minify as minifyJavaScript } from "terser";
import { pathPrefix, ROOT } from "./paths.ts";

const INLINE_ENTRIES = new Set(["theme-init"]);
const CLASSIC_FILE_ENTRIES = new Set(["hacklas-disclaimer-init"]);
const ENTRY_EXTENSIONS = new Set([".js", ".ts"]);
const TREESHAKER = { moduleSideEffects: true } as const;
const rollupState: { cache: RollupCache | undefined; shouldWriteSourceMap: boolean } = {
  cache: undefined,
  shouldWriteSourceMap: true,
};

function isPluginFactory(value: unknown): value is (options?: object) => Plugin {
  return typeof value === "function";
}

function pluginFactory(imported: unknown): (options?: object) => Plugin {
  if (isPluginFactory(imported)) {
    return imported;
  }
  if (typeof imported === "object" && imported !== null && "default" in imported) {
    const candidate = imported.default;
    if (isPluginFactory(candidate)) {
      return candidate;
    }
  }
  throw new Error("Rollup plugin module did not export a factory");
}

const typescript = pluginFactory(typescriptNamespace);

function minifyPlugin(): Plugin {
  return {
    name: "minify-in-process",
    async renderChunk(code, chunk, outputOptions) {
      const result = await minifyJavaScript(code, {
        module: outputOptions.format === "es",
      });
      if (!result.code) {
        throw new Error(`Terser produced empty output for ${chunk.fileName}`);
      }
      return result.code;
    },
  };
}

export interface BundleOptions {
  entryDir: string;
  outDir: string;
  minify: boolean;
}

export interface InlineBundle {
  code: string;
  sha256: string;
}

export interface BundleResult {
  rev: string;
  inline: Record<string, InlineBundle>;
  preloadTags: (entry: string) => string;
}

interface ListedEntries {
  modules: Record<string, string>;
  inline: Record<string, string>;
  classic: Record<string, string>;
}

function resetJsDirectory(jsDirectory: string): void {
  rmSync(jsDirectory, { recursive: true, force: true });
  mkdirSync(jsDirectory, { recursive: true });
}

function sha256Base64(value: string): string {
  return createHash("sha256").update(value).digest("base64");
}

function contentRev(parts: string[]): string {
  return createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 8);
}

function isEntryFile(name: string): boolean {
  return ENTRY_EXTENSIONS.has(path.extname(name)) && !name.includes(".test.");
}

function entryName(file: string): string {
  return path.basename(file, path.extname(file));
}

function listEntries(entryDirectory: string): ListedEntries {
  const modules: Record<string, string> = {};
  const inline: Record<string, string> = {};
  const classic: Record<string, string> = {};
  const names = readdirSync(entryDirectory).toSorted((left, right) => left.localeCompare(right));
  for (const name of names) {
    if (!isEntryFile(name)) {
      continue;
    }
    const file = path.join(entryDirectory, name);
    const key = entryName(file);
    if (INLINE_ENTRIES.has(key)) {
      inline[key] = file;
    } else if (CLASSIC_FILE_ENTRIES.has(key)) {
      classic[key] = file;
    } else {
      modules[key] = file;
    }
  }
  return { modules, inline, classic };
}

function hasTypeScriptInput(entries: ListedEntries): boolean {
  for (const group of [entries.modules, entries.inline, entries.classic]) {
    for (const file of Object.values(group)) {
      if (file.endsWith(".ts")) {
        return true;
      }
    }
  }
  return false;
}

function hasTypeScriptFile(directory: string): boolean {
  const entries = readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (hasTypeScriptFile(fullPath)) {
        return true;
      }
      continue;
    }
    if (entry.name.endsWith(".ts") && !entry.name.includes(".test.")) {
      return true;
    }
  }
  return false;
}

function pluginsFor(
  shouldMinify: boolean,
  jsDirectory: string,
  shouldCompileTs: boolean,
): Plugin[] {
  const plugins: Plugin[] = [];
  if (shouldCompileTs) {
    plugins.push(
      typescript({
        tsconfig: path.join(ROOT, "src/js/tsconfig.json"),
        compilerOptions: {
          declaration: false,
          declarationMap: false,
          outDir: jsDirectory,
          sourceMap: false,
        },
        include: ["**/*.ts", "!**/*.test.ts"],
        outputToFilesystem: false,
      }),
    );
  }
  if (shouldMinify) {
    plugins.push(minifyPlugin());
  }
  return plugins;
}

function jsHref(fileName: string): string {
  const href = `/js/${fileName}`;
  if (pathPrefix === "/") {
    return href;
  }
  return pathPrefix.replace(/\/$/, "") + href;
}

function preloadTag(fileName: string): string {
  return `<link rel="modulepreload" href="${jsHref(fileName)}">`;
}

function preloadTagsFor(importsByEntry: Map<string, string[]>): (entry: string) => string {
  return (entry: string): string => {
    const files = importsByEntry.get(entry) ?? [];
    return files.map((fileName) => preloadTag(fileName)).join("");
  };
}

function importedChunks(chunks: OutputChunk[]): Map<string, string[]> {
  const importsByEntry = new Map<string, string[]>();
  for (const chunk of chunks) {
    if (chunk.isEntry) {
      importsByEntry.set(chunk.name, [...chunk.imports]);
    }
  }
  return importsByEntry;
}

function isOutputChunk(value: { type: string }): value is OutputChunk {
  return value.type === "chunk";
}

async function generateIife(input: string, plugins: Plugin[]): Promise<string> {
  const bundle = await rollup({ input, plugins, treeshake: TREESHAKER });
  try {
    const { output } = await bundle.generate({
      format: "iife",
      exports: "none",
      sourcemap: false,
    });
    const chunk = output.find((item) => isOutputChunk(item));
    if (!chunk) {
      throw new Error(`Rollup produced no IIFE chunk for ${input}`);
    }
    return chunk.code;
  } finally {
    await bundle.close();
  }
}

async function buildInline(
  entries: Record<string, string>,
  plugins: Plugin[],
): Promise<Record<string, InlineBundle>> {
  const inline: Record<string, InlineBundle> = {};
  for (const [name, input] of Object.entries(entries)) {
    const code = await generateIife(input, plugins);
    inline[name] = { code, sha256: sha256Base64(code) };
  }
  return inline;
}

async function writeClassicFile(
  entry: { name: string; input: string },
  jsDirectory: string,
  plugins: Plugin[],
): Promise<string[]> {
  const bundle = await rollup({ input: entry.input, plugins, treeshake: TREESHAKER });
  try {
    const { output } = await bundle.write({
      file: path.join(jsDirectory, `${entry.name}.js`),
      format: "iife",
      exports: "none",
      sourcemap: rollupState.shouldWriteSourceMap,
    });
    return output.filter((item) => isOutputChunk(item)).map((item) => item.code);
  } finally {
    await bundle.close();
  }
}

async function writeClassicFiles(
  entries: Record<string, string>,
  jsDirectory: string,
  plugins: Plugin[],
): Promise<string[]> {
  const codes: string[] = [];
  mkdirSync(jsDirectory, { recursive: true });
  for (const [name, input] of Object.entries(entries)) {
    codes.push(...(await writeClassicFile({ name, input }, jsDirectory, plugins)));
  }
  return codes;
}

async function writeModuleEntries(
  entries: Record<string, string>,
  jsDirectory: string,
  plugins: Plugin[],
): Promise<OutputChunk[]> {
  if (Object.keys(entries).length === 0) {
    return [];
  }
  const bundle = await rollup({
    input: entries,
    cache: rollupState.cache,
    plugins,
    treeshake: TREESHAKER,
  });
  rollupState.cache = bundle.cache;
  try {
    const { output } = await bundle.write({
      dir: jsDirectory,
      format: "es",
      entryFileNames: "[name].js",
      chunkFileNames: "chunks/[name]-[hash].js",
      sourcemap: rollupState.shouldWriteSourceMap,
    });
    return output.filter((item) => isOutputChunk(item));
  } finally {
    await bundle.close();
  }
}

function createResult(
  chunks: OutputChunk[],
  inline: Record<string, InlineBundle>,
  classicCodes: string[],
): BundleResult {
  const parts = [
    ...chunks.map((chunk) => chunk.code),
    ...Object.values(inline).map((entry) => entry.code),
    ...classicCodes,
  ];
  return {
    rev: contentRev(parts),
    inline,
    preloadTags: preloadTagsFor(importedChunks(chunks)),
  };
}

export function inlineScriptCode(bundle: BundleResult | undefined, name: unknown): string {
  if (!bundle || typeof name !== "string") {
    return "";
  }
  return bundle.inline[name]?.code ?? "";
}

export function modulePreloadTags(bundle: BundleResult | undefined, entry: unknown): string {
  if (!bundle || typeof entry !== "string") {
    return "";
  }
  return bundle.preloadTags(entry);
}

export async function bundleClient({
  entryDir: entryDirectory,
  outDir: outputDirectory,
  minify: shouldMinify,
}: BundleOptions): Promise<BundleResult> {
  const resolvedEntryDirectory = path.resolve(entryDirectory);
  const entries = listEntries(resolvedEntryDirectory);
  const jsDirectory = path.join(path.resolve(outputDirectory), "js");
  resetJsDirectory(jsDirectory);
  const shouldCompileTs =
    hasTypeScriptInput(entries) || hasTypeScriptFile(path.dirname(resolvedEntryDirectory));
  const plugins = pluginsFor(shouldMinify, jsDirectory, shouldCompileTs);
  rollupState.shouldWriteSourceMap = !shouldMinify;
  const chunks = await writeModuleEntries(entries.modules, jsDirectory, plugins);
  const inline = await buildInline(entries.inline, plugins);
  const classicCodes = await writeClassicFiles(entries.classic, jsDirectory, plugins);
  return createResult(chunks, inline, classicCodes);
}
