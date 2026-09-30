// Fixes applied on every Eleventy build, after sermon HTML is copied
// into the output and before church publishing (noindex, sitemap).
// The ingest pipeline rewrites CoGElPaso/ and ProvidenceLenexa/ and then
// runs Eleventy, so this step — not a one-time edit of the HTML — is
// what keeps the next automated build from republishing broken links,
// literal *emphasis*, or a sermon index with no preview image.
import fs from "node:fs";
import path from "node:path";

const CONTENT_ROOTS = ["CoGElPaso", "ProvidenceLenexa", "SignificantSermons"];
const DEAD_CHURCH_PAGES = new Set(["about", "visit", "topics", "what-we-believe"]);
const PREVIEW_IMAGE = "https://sermonsteward.com/og-sermon-steward-a.jpg";
const PREVIEW_ALT =
  "Sermon Steward — Scottish steward character beside sermonsteward.com and Simply Superior Sermon Hosting.";
const MOBILE_STYLE_ID = "sermon-mobile-fit";

const MOBILE_STYLE = `<style id="${MOBILE_STYLE_ID}">
@media (max-width: 420px) {
  .asx { left: 12px; right: 12px; width: auto; display: flex; justify-content: flex-end; }
  .asx-btn { max-width: 100%; height: auto; min-height: 44px; padding: 10px 14px; white-space: normal; text-align: left; }
  .asx-panel { left: 0; right: 0; width: auto; }
}
pre, code { max-width: 100%; }
pre { overflow-x: auto; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>`;

export function applyPublishFixes(root) {
  const index = buildPathIndex(root);
  let updated = 0;
  for (const name of CONTENT_ROOTS) {
    const dir = path.join(root, name);
    if (!fs.existsSync(dir)) continue;
    for (const file of walkHtml(dir)) {
      const original = fs.readFileSync(file, "utf8");
      const next = fixHtml(original, index);
      if (next !== original) {
        fs.writeFileSync(file, next);
        updated += 1;
      }
    }
  }
  return updated;
}

export function fixHtml(html, index) {
  let out = rewriteAnchors(html, index);
  out = rewriteMarkdownLinks(out, index);
  out = emphasizeOutsideTags(out);
  out = injectMobileStyle(out);
  out = injectProvidenceIndexPreview(out);
  return out;
}

export function buildPathIndex(root) {
  const paths = new Set();
  const dated = new Map();
  if (!fs.existsSync(root)) return { paths, dated };
  for (const file of walkHtml(root)) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    for (const urlPath of pathsForFile(rel)) paths.add(urlPath);
    const datedMatch = rel.match(
      /^(CoGElPaso|ProvidenceLenexa)\/sermons\/(.+)-(\d{4})-(\d{2})-(\d{2})\.html$/
    );
    if (!datedMatch) continue;
    const [, church, slug, year, month] = datedMatch;
    const key = `${church}/${year}/${month}/${slug}`;
    const list = dated.get(key) || [];
    list.push(`/${church}/sermons/${slug}-${year}-${month}-${datedMatch[5]}`);
    dated.set(key, list);
  }
  return { paths, dated };
}

function pathsForFile(rel) {
  const urls = [];
  if (rel.endsWith("/index.html")) {
    const dir = rel.slice(0, -"index.html".length).replace(/\/$/, "");
    urls.push(dir ? `/${dir}` : "/");
  } else if (rel.endsWith(".html")) {
    const bare = rel.slice(0, -".html".length);
    urls.push(`/${bare}`);
    urls.push(`/${rel}`);
  }
  return urls;
}

function normalizeHref(href) {
  if (!href) return null;
  let value = href.trim();
  if (
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("javascript:") ||
    value.startsWith("#")
  ) {
    return null;
  }
  value = value.split("#")[0].split("?")[0];
  if (value.startsWith("https://sermonsteward.com")) {
    value = value.slice("https://sermonsteward.com".length);
  } else if (value.startsWith("http://sermonsteward.com")) {
    value = value.slice("http://sermonsteward.com".length);
  } else if (/^[a-z]+:/i.test(value)) {
    return null;
  }
  if (!value.startsWith("/")) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (value.length > 1 && value.endsWith("/")) value = value.slice(0, -1);
  if (value.endsWith("/index.html")) value = value.slice(0, -"/index.html".length) || "/";
  return value;
}

function pathExists(index, urlPath) {
  if (!urlPath) return false;
  if (index.paths.has(urlPath)) return true;
  if (urlPath.endsWith(".html")) return index.paths.has(urlPath.slice(0, -".html".length));
  return index.paths.has(`${urlPath}.html`);
}

// Returns the href to write, "" to drop the anchor, or null to leave it.
export function retargetHref(href, index) {
  const urlPath = normalizeHref(href);
  if (!urlPath) return null;
  if (pathExists(index, urlPath)) return null;

  const dated = urlPath.match(
    /^\/(CoGElPaso|ProvidenceLenexa)\/sermons\/(\d{4})\/(\d{2})\/([^/]+)$/
  );
  if (dated) {
    const key = `${dated[1]}/${dated[2]}/${dated[3]}/${dated[4]}`;
    const matches = index.dated.get(key) || [];
    if (matches.length === 1) return matches[0];
    return `/${dated[1]}/sermons/`;
  }

  const series = urlPath.match(
    /^\/(CoGElPaso|ProvidenceLenexa)\/sermons\/series\/([^/]+)$/
  );
  if (series) {
    const indexPath = `/${series[1]}/sermons/series`;
    if (pathExists(index, indexPath)) return `${indexPath}/`;
    return `/${series[1]}/sermons/`;
  }

  const dead = urlPath.match(
    /^\/(CoGElPaso|ProvidenceLenexa)\/(about|visit|topics|what-we-believe)$/
  );
  if (dead && DEAD_CHURCH_PAGES.has(dead[2])) return "";

  if (urlPath === "/about" || urlPath === "/visit" || urlPath === "/topics") return "";

  return null;
}

function rewriteAnchors(html, index) {
  const rewritten = html.replace(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi, (full, attrs, inner) => {
    const hrefMatch = attrs.match(/\shref\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) return full;
    const next = retargetHref(hrefMatch[2], index);
    if (next === null) return full;
    if (next === "") return "";
    const attrsNext = attrs.replace(hrefMatch[0], ` href=${hrefMatch[1]}${next}${hrefMatch[1]}`);
    return `<a${attrsNext}>${inner}</a>`;
  });
  return rewritten
    .replace(/[ \t]*·[ \t]*(?=<\/div>)/g, "")
    .replace(/(<br>\s*)+[ \t]*·[ \t]*/g, "$1")
    .replace(/^[ \t]*·[ \t]*$/gm, "");
}

function rewriteMarkdownLinks(html, index) {
  return html
    .split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/gi)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (full, label, href) => {
        const next = retargetHref(href, index);
        if (next === null) return full;
        if (next === "") return label;
        return `[${label}](${next})`;
      });
    })
    .join("");
}

export function emphasizeOutsideTags(html) {
  return html
    .split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/gi)
    .map((part) => (part.startsWith("<") ? part : emphasizeText(part)))
    .join("");
}

function emphasizeText(text) {
  return text.replace(
    /(^|[^*<\w])\*([A-Za-z0-9](?:[^*\n<]*[A-Za-z0-9])?)\*(?!\*)/g,
    (full, prefix, inner) => {
      if (!/[A-Za-z]/.test(inner)) return full;
      return `${prefix}<em>${inner}</em>`;
    }
  );
}

function injectMobileStyle(html) {
  if (html.includes(`id="${MOBILE_STYLE_ID}"`)) return html;
  if (!html.includes("</head>")) return html;
  if (!html.includes("sermon-title") && !html.includes("asx-btn") && !html.includes("<pre")) {
    return html;
  }
  return html.replace("</head>", `${MOBILE_STYLE}\n</head>`);
}

function injectProvidenceIndexPreview(html) {
  if (!html.includes("Providence Community Church")) return html;
  if (!html.includes('rel="canonical" href="https://sermonsteward.com/ProvidenceLenexa/sermons"') &&
      !html.includes('rel="canonical" href="https://sermonsteward.com/ProvidenceLenexa/sermons/"')) {
    return html;
  }
  if (html.includes("og-sermon-steward-a.jpg")) return html;
  const block = [
    '<meta property="og:title" content="Sermons of Providence Community Church — Sermon Steward">',
    '<meta property="og:description" content="Sermons of Providence Community Church — sermon hosting and extras from the sermon.">',
    '<meta property="og:url" content="https://sermonsteward.com/ProvidenceLenexa/sermons/">',
    `<meta property="og:image" content="${PREVIEW_IMAGE}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${PREVIEW_ALT}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="Sermons of Providence Community Church — Sermon Steward">',
    '<meta name="twitter:description" content="Sermons of Providence Community Church — sermon hosting and extras from the sermon.">',
    `<meta name="twitter:image" content="${PREVIEW_IMAGE}">`,
    `<meta name="twitter:image:alt" content="${PREVIEW_ALT}">`,
  ].join("\n");
  if (html.includes('property="og:type"')) {
    return html.replace(
      /<meta property="og:type" content="website">[\s\S]*?<meta property="og:site_name" content="Sermon Steward">/,
      `<meta property="og:type" content="website">\n${block}\n<meta property="og:site_name" content="Sermon Steward">`
    );
  }
  return html.replace("</head>", `${block}\n</head>`);
}

function walkHtml(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules" || entry.name === "_site") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const updated = applyPublishFixes(root);
  console.log(`publish-fixes: updated ${updated} file(s) under ${root}`);
}
