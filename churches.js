// Public church URLs for sermonsteward.com.
//
// Sovereign Grace churches:  /SGchurch/<ChurchNameCity>
// Every other church:       /church/<ChurchNameCity>
//
// This file is the only map. Add a row here when a church comes online.
// `slug` is the folder name (ChurchNameCity). `network` is "sg" or "other".
// `sermonsPath` is the sermon list that the public URL sends people to.
//
// Topic pages are the exception under the public prefix: they are real
// HTML at /SGchurch/<slug>/topics/ (or /church/<slug>/topics/), built
// from one drop-in file per topic. The bare church URL still 302s.
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

// Topic pages live under the public church path, not the legacy folder.
// /SGchurch/ProvidenceLenexa still 302s to the sermon list. This path does not.
export function publicTopicsPath(church) {
  return `${publicChurchPath(church)}/topics/`;
}

// Vanity URL → where the Worker should send the request.
// null means "not a redirect": serve the asset (topic pages) or ignore the path.
// { status: 404 } means the prefix matched but this is not a page we serve.
// { status: 302, location } means redirect (sermon list, or the canonical topics URL).
export function matchChurchRoute(pathname, churches = CHURCHES) {
  const parts = pathname.split("/").filter((part) => part.length > 0);
  if (parts.length === 0) return null;

  const prefix = parts[0].toLowerCase();
  const network = Object.entries(PREFIX_BY_NETWORK).find(
    ([, label]) => label.toLowerCase() === prefix
  )?.[0];
  if (!network) return null;

  // /SGchurch alone is not a church.
  if (parts.length === 1) return { status: 404 };

  const church = churches.find(
    (candidate) =>
      candidate.network === network &&
      candidate.slug.toLowerCase() === parts[1].toLowerCase()
  );
  if (!church) return { status: 404 };

  // Bare /SGchurch/<ChurchNameCity> opens the sermon list.
  if (parts.length === 2) return { status: 302, location: church.sermonsPath };

  // /SGchurch/<Church>/topics/ is a real page. Anything else under the
  // vanity prefix stays a 404 so it does not swallow future church paths.
  if (parts[2].toLowerCase() !== "topics") return { status: 404 };

  const tail = parts.slice(3).join("/");
  const canonical = tail ? `${publicTopicsPath(church)}${tail}/` : publicTopicsPath(church);
  if (pathname !== canonical) return { status: 302, location: canonical };
  return null;
}

// Prep King and Coach stay on disk and answer by direct URL, but they are
// not for sale on the public site. The weekly ingest rebuilds _site, so
// this list — not a one-time edit of sitemap.xml — is what keeps them delisted.
export const DELISTED_PRODUCT_ROOTS = ["/prep", "/prep-king", "/prepking", "/coach"];

export function normalizeSitePath(pathname) {
  let path = String(pathname ?? "").split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path.endsWith("/index.html")) path = path.slice(0, -"/index.html".length);
  if (path === "") path = "/";
  return path;
}

export function isDelistedProductPath(pathname) {
  const path = normalizeSitePath(pathname).toLowerCase();
  return DELISTED_PRODUCT_ROOTS.some(
    (root) => path === root || path === `${root}.html` || path.startsWith(`${root}/`)
  );
}

export function isDelistedProductHref(href) {
  if (!href) return false;
  let value = String(href).trim();
  if (
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("javascript:")
  ) {
    return false;
  }
  value = value.split("#")[0].split("?")[0];
  if (value.startsWith("https://sermonsteward.com")) {
    value = value.slice("https://sermonsteward.com".length) || "/";
  } else if (value.startsWith("http://sermonsteward.com")) {
    value = value.slice("http://sermonsteward.com".length) || "/";
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }
  if (!value.startsWith("/")) return false;
  return isDelistedProductPath(value);
}

// Drop the anchor, not just the href, so a nav label cannot keep the product name.
export function stripDelistedProductLinks(html) {
  return html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (full) => {
    const hrefMatch = full.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch || !isDelistedProductHref(hrefMatch[2])) return full;
    return "";
  });
}

// Legacy church product pages stay on disk and answer by direct URL,
// but they are not the public church site. Everything under /<slug>/
// except /<slug>/sermons/ is delisted.
export function isDelistedLegacyPath(pathname, churches = CHURCHES) {
  const path = normalizeSitePath(pathname);

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

export function injectRobotsMeta(html, content = "noindex, follow") {
  const tag = `<meta name="robots" content="${content}">`;
  const existing = html.match(/<meta\s[^>]*name=["']robots["'][^>]*>/i);
  if (existing) {
    if (content === "noindex, follow" || existing[0] === tag) return html;
    return html.replace(existing[0], tag);
  }
  if (!/<head[^>]*>/i.test(html)) return html;
  return html.replace(/<head[^>]*>/i, (open) => `${open}\n${tag}`);
}

// Point links that target a legacy church landing at the public church URL.
// Sermon, topic, and other deeper hrefs are left alone.
export function rewriteLandingHrefs(html, churches = CHURCHES) {
  let out = html;
  for (const church of churches) {
    const pub = publicChurchPath(church);
    const slug = church.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Only anchors. Canonical and og:url tags stay put.
    // The closing quote has to come right after the slug so
    // /ProvidenceLenexa/sermons/… is not treated as the landing.
    out = out.replace(
      new RegExp(
        `(<a\\b[^>]*?\\bhref=(["']))(?:https://sermonsteward\\.com)?/${slug}/?\\2`,
        "gi"
      ),
      `$1${pub}$2`
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
  blocks.push(
    "# Retired product URLs stay reachable by direct URL and are noindex.",
    "# Do not Disallow them. A crawler has to fetch the page to see noindex."
  );
  for (const root of DELISTED_PRODUCT_ROOTS) {
    blocks.push(
      root,
      `  X-Robots-Tag: noindex`,
      `${root}/`,
      `  X-Robots-Tag: noindex`,
      `${root}/*`,
      `  X-Robots-Tag: noindex`,
      `${root}.html`,
      `  X-Robots-Tag: noindex`
    );
  }
  return `${blocks.join("\n")}\n`;
}

export function robotsTxt() {
  return `# Sermon Steward
# Legacy church landings (everything under a church folder except /sermons/)
# stay reachable and are marked noindex in the HTML and in _headers.
# Retired product URLs are the same: reachable, noindex, and absent from the sitemap.
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
  if (isDelistedProductPath(urlPath)) return false;
  if (urlPath === "/admin" || urlPath.startsWith("/admin/")) return false;
  if (urlPath === "/pastors" || urlPath.startsWith("/pastors/")) return false;
  return true;
}
