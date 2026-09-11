import { bundleCss } from "../../_11ty/css.js";

export function data() {
  return {
    permalink: "/css/style.css",
    eleventyExcludeFromCollections: true,
  };
}

export function render() {
  return bundleCss();
}
