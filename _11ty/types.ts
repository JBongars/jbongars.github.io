import type { MarkdownLibrary } from "./markdown.ts";

export type Environment = NodeJS.ProcessEnv;

export interface PageInfo {
  url?: string;
  inputPath?: string;
  fileSlug?: string;
  date?: Date;
}

export interface CollectionItem {
  url?: string;
  fileSlug?: string;
  inputPath?: string;
  filePathStem?: string;
  date?: Date;
  data?: {
    title?: string;
    notePath?: string;
  };
}

export interface PageCollections {
  blog?: CollectionItem[];
  writeUps?: CollectionItem[];
}

export interface PageData {
  page?: PageInfo;
  title?: string;
  description?: string;
  metaDescription?: string;
  date?: Date;
  dateModified?: Date | string;
  collections?: PageCollections;
  layout?: string;
  author?: string;
  note_tags?: string | string[];
  banner_path?: unknown;
}

export interface FrontMatterLink {
  href: string;
  label: string;
}

export interface PassthroughConfig {
  addPassthroughCopy(mapping: string | Record<string, string>): void;
}

export interface CollectionApi {
  getFilteredByGlob(glob: string | string[]): CollectionItem[];
}

export interface EleventyDirectories {
  input: string;
  output: string;
}

export interface EleventyEvent {
  directories: EleventyDirectories;
  runMode: string;
}

export type EleventyConfig = PassthroughConfig & {
  addPlugin(plugin: unknown, options?: unknown): void;
  addGlobalData(name: string, value: unknown): void;
  setServerOptions(options: unknown): void;
  addWatchTarget(target: string): void;
  on(name: string, handler: (event: EleventyEvent) => void | Promise<void>): void;
  addFilter(name: string, filter: (...arguments_: unknown[]) => unknown): void;
  addShortcode(name: string, shortcode: (...arguments_: unknown[]) => unknown): void;
  addExtension(name: string, options: { key: string }): void;
  addTemplateFormats(format: string): void;
  amendLibrary(name: string, callback: (library: MarkdownLibrary) => void): void;
  addCollection(name: string, builder: (api: CollectionApi) => CollectionItem[]): void;
  ignores: { add(pattern: string): void };
};

export interface EleventyUserConfigResult {
  pathPrefix: string;
  dir: {
    input: string;
    output: string;
    includes: string;
    data: string;
  };
  markdownTemplateEngine: false;
  htmlTemplateEngine: string;
}
