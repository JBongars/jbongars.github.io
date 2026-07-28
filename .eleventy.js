const fs = require("node:fs");
const path = require("node:path");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

function isPostMarkdown(inputPath) {
  return (
    typeof inputPath === "string" &&
    inputPath.includes(`${path.sep}posts${path.sep}`) &&
    inputPath.endsWith(".md")
  );
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  eleventyConfig.addPassthroughCopy("src/css");

  // Dotfolders like .media are skipped by default globs; map each post's
  // .media dir explicitly so relative ![](.media/...) paths resolve.
  // Does not modify anything under src/posts — read-only scan for copy targets.
  const postsDir = path.join(__dirname, "src", "posts");
  if (fs.existsSync(postsDir)) {
    for (const entry of fs.readdirSync(postsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const mediaSrc = path.join("src", "posts", entry.name, ".media");
      if (fs.existsSync(mediaSrc)) {
        eleventyConfig.addPassthroughCopy({
          [mediaSrc]: path.join("posts", entry.name, ".media"),
        });
      }
    }
  }

  // Apply post layout without writing data files or front matter into posts/
  eleventyConfig.addGlobalData("eleventyComputed", {
    layout: (data) => {
      if (isPostMarkdown(data.page?.inputPath)) {
        return data.layout || "post.njk";
      }
      return data.layout;
    },
    title: (data) => {
      if (data.title) return data.title;
      if (isPostMarkdown(data.page?.inputPath)) {
        return data.page.fileSlug;
      }
      return data.title;
    },
  });

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/posts/**/*.md")
      .sort((a, b) => b.date - a.date);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
