export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("*.html");
  eleventyConfig.addPassthroughCopy("CoGElPaso");
  eleventyConfig.addPassthroughCopy("ProvidenceLenexa");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("biblestory");
  eleventyConfig.addPassthroughCopy({
    "_src/og-sermon-steward-a.png": "og-sermon-steward-a.png",
  });

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
