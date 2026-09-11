import { bundleCss } from "../../_11ty/css.ts";

export function data(): {
  permalink: string;
  eleventyExcludeFromCollections: boolean;
} {
  return {
    permalink: "/css/style.css",
    eleventyExcludeFromCollections: true,
  };
}

export function render(): string {
  return bundleCss();
}
