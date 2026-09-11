declare module "prismjs" {
  type Grammar = object;
  const Prism: {
    languages: Record<string, Grammar | undefined>;
    highlight(code: string, grammar: Grammar, language: string): string;
  };
  export default Prism;
}

declare module "prismjs/components/index.js" {
  type LoadLanguages = ((languages: string[]) => void) & { silent: boolean };
  const loadLanguages: LoadLanguages;
  export default loadLanguages;
}

declare module "@11ty/eleventy-plugin-syntaxhighlight" {
  const plugin: unknown;
  export default plugin;
}

declare module "@11ty/eleventy-img" {
  export const eleventyImageTransformPlugin: unknown;
}
