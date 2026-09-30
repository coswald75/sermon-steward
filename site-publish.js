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
  isDelistedProductPath,
  rewriteLandingHrefs,
  robotsTxt,
  sitemapXml,
  stripDelistedProductLinks,
  urlPathForOutputFile,
} from "./churches.js";

// Sermon Steward is the only product for sale. The ingest pipeline copies
// HTML and then runs Eleventy, so this replacement runs on every build.
export const PRICE_CARD =
  "Guildhall — free. Sermon Steward — $30/month. Past-sermon ingest $100 per year of sermons. First month free, cancel anytime, no contract.";

const RETIRED_PRICE_CARD =
  "Guildhall — free. Sermon Steward, Coach, Prep King — $30/month each; suite $75/month. Past-sermon ingest $100 per year of sermons. First month free, cancel anytime, no contract.";

export function rewritePublicProductCopy(html) {
  if (!html.includes(RETIRED_PRICE_CARD)) return html;
  return html.split(RETIRED_PRICE_CARD).join(PRICE_CARD);
}

function isPastorsOutput(urlPath, rel) {
  return (
    urlPath === "/pastors" ||
    urlPath.startsWith("/pastors/") ||
    rel === "pastors" ||
    rel.startsWith("pastors/")
  );
}

export function applyChurchPublishing(outputDir) {
  const urls = [];
  for (const file of walkHtml(outputDir)) {
    const rel = path.relative(outputDir, file).split(path.sep).join("/");
    const urlPath = urlPathForOutputFile(rel);
    const original = fs.readFileSync(file, "utf8");
    const pastors = isPastorsOutput(urlPath, rel);
    let html = pastors ? original : rewritePublicProductCopy(original);
    if (!pastors) html = stripDelistedProductLinks(html);
    html = rewriteLandingHrefs(html);
    const delistedChurch =
      isDelistedLegacyPath(urlPath) || isDelistedLegacyPath(`/${rel}`);
    const delistedProduct =
      isDelistedProductPath(urlPath) || isDelistedProductPath(`/${rel}`);
    if (delistedChurch) html = injectRobotsMeta(html);
    if (delistedProduct) html = injectRobotsMeta(html, "noindex");
    if (html !== original) fs.writeFileSync(file, html);
    if (!delistedChurch && !delistedProduct && includeInSitemap(urlPath)) urls.push(urlPath);
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
