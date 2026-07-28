const fs = require("node:fs");
const path = require("node:path");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

function isContentMarkdown(inputPath, folder) {
  return (
    typeof inputPath === "string" &&
    inputPath.includes(`${path.sep}${folder}${path.sep}`) &&
    inputPath.endsWith(".md")
  );
}

function passthroughMediaFolders(eleventyConfig, folder) {
  // Dotfolders like .media are skipped by default globs; map each entry's
  // .media dir explicitly so relative ![](.media/...) paths resolve.
  // Read-only scan — does not modify anything under src/{folder}.
  const dir = path.join(__dirname, "src", folder);
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const mediaSrc = path.join("src", folder, entry.name, ".media");
    if (fs.existsSync(mediaSrc)) {
      eleventyConfig.addPassthroughCopy({
        [mediaSrc]: path.join(folder, entry.name, ".media"),
      });
    }
  }
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  eleventyConfig.addPassthroughCopy("src/css");
  passthroughMediaFolders(eleventyConfig, "posts");
  passthroughMediaFolders(eleventyConfig, "projects");

  // Apply shared post layout without writing data files into posts/ or projects/
  eleventyConfig.addGlobalData("eleventyComputed", {
    layout: (data) => {
      const inputPath = data.page?.inputPath;
      if (
        isContentMarkdown(inputPath, "posts") ||
        isContentMarkdown(inputPath, "projects")
      ) {
        return data.layout || "post.njk";
      }
      return data.layout;
    },
    title: (data) => {
      if (data.title) return data.title;
      const inputPath = data.page?.inputPath;
      if (
        isContentMarkdown(inputPath, "posts") ||
        isContentMarkdown(inputPath, "projects")
      ) {
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

  eleventyConfig.addCollection("projects", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/projects/**/*.md")
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
