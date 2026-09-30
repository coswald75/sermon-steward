// Runs after Eleventy copies the church folders into _site.
// The ingest pipeline regenerates those folders, then builds. This step
// puts noindex, the header rules, robots.txt, and sitemap.xml back on
// every build so a sermon deploy cannot relist the legacy church pages.
import fs from "node:fs";
import path from "node:path";
import {
  headersDocument,
  includeInSitemap,
  injectRobotsMeta,
  isDelistedLegacyPath,
  rewriteLandingHrefs,
  robotsTxt,
  sitemapXml,
  urlPathForOutputFile,
} from "./churches.js";

export function applyChurchPublishing(outputDir) {
  const urls = [];
  for (const file of walkHtml(outputDir)) {
    const rel = path.relative(outputDir, file).split(path.sep).join("/");
    const urlPath = urlPathForOutputFile(rel);
    const original = fs.readFileSync(file, "utf8");
    let html = rewriteLandingHrefs(original);
    const delisted =
      isDelistedLegacyPath(urlPath) || isDelistedLegacyPath(`/${rel}`);
    if (delisted) html = injectRobotsMeta(html);
    if (html !== original) fs.writeFileSync(file, html);
    if (!delisted && includeInSitemap(urlPath)) urls.push(urlPath);
  }

  fs.writeFileSync(path.join(outputDir, "_headers"), headersDocument());
  fs.writeFileSync(path.join(outputDir, "robots.txt"), robotsTxt());
  fs.writeFileSync(path.join(outputDir, "sitemap.xml"), sitemapXml(urls));
  return urls;
}

function walkHtml(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}
