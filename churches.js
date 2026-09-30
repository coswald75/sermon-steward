// Public church URLs for sermonsteward.com.
//
// Sovereign Grace churches:  /SGchurch/<ChurchNameCity>
// Every other church:       /church/<ChurchNameCity>
//
// This file is the only map. Add a row here when a church comes online.
// `slug` is the folder name (ChurchNameCity). `network` is "sg" or "other".
// `sermonsPath` is the sermon list that the public URL sends people to.
//
// Nothing in here lives inside a church folder. The ingest pipeline
// (shepherds-guild-pipeline: scripts/deploy_sermon_pages.py and
// scripts/build_church_indexes.py) rewrites files inside those folders,
// commits them, then runs Eleventy and `wrangler deploy`. It does not
// edit this file or worker.js. The Eleventy publish step reads this map
// again, so a rebuilt sermon index cannot drop the routes or the noindex.

export const SITE_ORIGIN = "https://sermonsteward.com";

export const CHURCHES = [
  {
    slug: "ProvidenceLenexa",
    name: "Providence Community Church",
    network: "sg",
    sermonsPath: "/ProvidenceLenexa/sermons/",
  },
  {
    slug: "CoGElPaso",
    name: "Cross of Grace Church",
    network: "sg",
    sermonsPath: "/CoGElPaso/sermons/",
  },
];

const PREFIX_BY_NETWORK = {
  sg: "SGchurch",
  other: "church",
};

export function publicChurchPath(church) {
  const prefix = PREFIX_BY_NETWORK[church.network];
  if (!prefix) {
    throw new Error(`Unknown church network "${church.network}" for ${church.slug}`);
  }
  return `/${prefix}/${church.slug}`;
}

// Vanity URL → where the Worker should send the request.
// null means this path is not a church vanity URL.
// { status: 404 } means the prefix matched but the church does not.
// { status: 302, location } means redirect to the sermon list.
export function matchChurchRoute(pathname, churches = CHURCHES) {
  const parts = pathname.split("/").filter((part) => part.length > 0);
  if (parts.length === 0) return null;

  const prefix = parts[0].toLowerCase();
  const network = Object.entries(PREFIX_BY_NETWORK).find(
    ([, label]) => label.toLowerCase() === prefix
  )?.[0];
  if (!network) return null;

  // /SGchurch and /SGchurch/foo/bar are not a church root.
  // Deeper paths stay free for a future church site.
  if (parts.length !== 2) return { status: 404 };

  const church = churches.find(
    (candidate) =>
      candidate.network === network &&
      candidate.slug.toLowerCase() === parts[1].toLowerCase()
  );
  if (!church) return { status: 404 };
  return { status: 302, location: church.sermonsPath };
}

// Legacy church product pages stay on disk and answer by direct URL,
// but they are not the public church site. Everything under /<slug>/
// except /<slug>/sermons/ is delisted.
export function isDelistedLegacyPath(pathname, churches = CHURCHES) {
  let path = pathname.split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path.endsWith("/index.html")) path = path.slice(0, -"/index.html".length);
  if (path === "") path = "/";

  for (const church of churches) {
    const root = `/${church.slug}`;
    if (path !== root && !path.startsWith(`${root}/`)) continue;
    if (path === root) return true;
    const rest = path.slice(root.length);
    if (rest === "/sermons" || rest.startsWith("/sermons/")) return false;
    return true;
  }
  return false;
}

export function injectRobotsMeta(html) {
  if (/<meta\s[^>]*name=["']robots["']/i.test(html)) return html;
  if (!/<head[^>]*>/i.test(html)) return html;
  return html.replace(
    /<head[^>]*>/i,
    (open) => `${open}\n<meta name="robots" content="noindex, follow">`
  );
}

// Point links that target a legacy church landing at the public church URL.
// Sermon, topic, and other deeper hrefs are left alone.
export function rewriteLandingHrefs(html, churches = CHURCHES) {
  let out = html;
  for (const church of churches) {
    const pub = publicChurchPath(church);
    const slug = church.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // The closing quote has to come right after the slug so
    // /ProvidenceLenexa/sermons/… is not treated as the landing.
    out = out.replace(
      new RegExp(
        `href=(["'])(?:https://sermonsteward\\.com)?/${slug}/?\\1`,
        "g"
      ),
      `href=$1${pub}$1`
    );
  }
  return out;
}

export function headersDocument(churches = CHURCHES) {
  const blocks = [
    "# Generated from churches.js during the Eleventy build.",
    "# Legacy church product pages are noindex. /<slug>/sermons/ stays indexable.",
    "# A repeated header is joined with a comma, so sermons detach the tag",
    "# instead of setting a second value.",
  ];
  for (const church of churches) {
    const root = `/${church.slug}`;
    blocks.push(
      `${root}`,
      `  X-Robots-Tag: noindex, follow`,
      `${root}/`,
      `  X-Robots-Tag: noindex, follow`,
      `${root}/*`,
      `  X-Robots-Tag: noindex, follow`,
      `${root}/sermons`,
      `  ! X-Robots-Tag`,
      `${root}/sermons/`,
      `  ! X-Robots-Tag`,
      `${root}/sermons/*`,
      `  ! X-Robots-Tag`
    );
  }
  return `${blocks.join("\n")}\n`;
}

export function robotsTxt() {
  return `# Sermon Steward
# Legacy church landings (everything under a church folder except /sermons/)
# stay reachable and are marked noindex in the HTML and in _headers.
# Do not Disallow those paths. A crawler has to fetch the page to see noindex.

User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
}

export function sitemapXml(paths, origin = SITE_ORIGIN) {
  const body = [...paths]
    .sort()
    .map((path) => `  <url><loc>${origin}${escapeXml(path === "/" ? "/" : path)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function urlPathForOutputFile(relPosix) {
  let path = `/${relPosix.replaceAll("\\", "/")}`;
  if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);
  if (path === "") path = "/";
  return path;
}

export function includeInSitemap(urlPath) {
  if (isDelistedLegacyPath(urlPath)) return false;
  if (urlPath === "/admin" || urlPath.startsWith("/admin/")) return false;
  if (urlPath === "/pastors" || urlPath.startsWith("/pastors/")) return false;
  return true;
}
