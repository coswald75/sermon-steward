export default function (eleventyConfig) {
  return {
    dir: {
      input: "_src",
      output: "_dryrun",
      data: "_data",
    },
    templateFormats: ["njk", "html"],
    htmlTemplateEngine: "njk",
  };
}
