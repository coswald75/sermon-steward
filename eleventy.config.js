export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("*.html");
  eleventyConfig.addPassthroughCopy("CoGElPaso");
  eleventyConfig.addPassthroughCopy("ProvidenceLenexa");
  eleventyConfig.addPassthroughCopy("admin");

  return {
    dir: {
      input: "_src",
      output: "_site",
      data: "_data",
    },
    templateFormats: ["njk", "html"],
    htmlTemplateEngine: "njk",
  };
}
