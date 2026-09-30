import fs from "node:fs";
import { CHURCHES } from "./churches.js";
import { applyChurchPublishing } from "./site-publish.js";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("*.html");
  // Root and /product share one landing: product.html is also the homepage.
  eleventyConfig.addPassthroughCopy({ "product.html": "index.html" });
  eleventyConfig.addPassthroughCopy("hall");
  // Church folders follow churches.js. A slug with no folder yet (the
  // next non-SG church, before its sermons exist) is skipped.
  for (const church of CHURCHES) {
    if (fs.existsSync(church.slug)) eleventyConfig.addPassthroughCopy(church.slug);
  }
  eleventyConfig.addPassthroughCopy("SignificantSermons");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("biblestory");
  eleventyConfig.addPassthroughCopy("7391842");
  eleventyConfig.addPassthroughCopy({
    "_src/prep-media/wordmark-url.jpg": "prep/wordmark-url.jpg",
  });
  eleventyConfig.addPassthroughCopy({
    "_src/prep-media/character-b.jpg": "prep/character-b.jpg",
  });
  eleventyConfig.addPassthroughCopy({
    "_src/img": "img",
  });

  eleventyConfig.on("eleventy.after", ({ dir }) => {
    applyChurchPublishing(dir.output);
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
