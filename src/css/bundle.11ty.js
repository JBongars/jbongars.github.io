const { bundleCss } = require("../../_11ty/css");

module.exports.data = () => ({
  permalink: "/css/style.css",
  eleventyExcludeFromCollections: true,
});

module.exports.render = () => bundleCss();
