import fs from "node:fs";
import { CHURCHES } from "./churches.js";
import { applyChurchPublishing } from "./site-publish.js";
import { applyPublishFixes } from "./scripts/publish-fixes.js";

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
  eleventyConfig.addPassthroughCopy({
    "_src/og-sermon-steward-a.jpg": "og-sermon-steward-a.jpg",
  });

  eleventyConfig.on("eleventy.after", ({ dir }) => {
    // Link and emphasis fixes run before church publishing so a regenerated
    // sermon folder is corrected in the same build. Church routes, robots,
    // and the sitemap stay in applyChurchPublishing.
    applyPublishFixes(dir.output);
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
