export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("*.html");
  eleventyConfig.addPassthroughCopy("CoGElPaso");
  eleventyConfig.addPassthroughCopy("ProvidenceLenexa");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("biblestory");
  eleventyConfig.addPassthroughCopy("7391842");
  eleventyConfig.addPassthroughCopy({
    "_src/prep-media/wordmark-url.jpg": "prep/wordmark-url.jpg",
  });
  eleventyConfig.addPassthroughCopy({
    "_src/prep-media/character-b.jpg": "prep/character-b.jpg",
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
