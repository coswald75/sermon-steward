// Stripe Payment Links for the home page (product.html, also served as /).
//
// The two URLs live in ONE file: stripe-links.json at the repo root.
//   hosting  Sermon Steward, $30/month
//   archive  Past-sermon ingest, $100 per year of sermons (the buyer picks 1-10 in Stripe's checkout)
// product.html holds the placeholders {{STRIPE_HOSTING_URL}} and
// {{STRIPE_ARCHIVE_URL}}. Every build replaces them in _site/index.html and
// _site/product.html with the URLs from that file.
//
// SAFEGUARD: a Stripe test link contains "/test_". If either link does,
// the build STOPS with an error (non-zero exit), so test links cannot ship.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LINKS_FILE = path.join(HERE, "..", "stripe-links.json");
export const PAGES = ["index.html", "product.html"];
export const PLACEHOLDERS = {
  hosting: "{{STRIPE_HOSTING_URL}}",
  archive: "{{STRIPE_ARCHIVE_URL}}",
};

export function loadLinks(file = LINKS_FILE) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function hasTestLink(links) {
  return Object.keys(PLACEHOLDERS).some((k) => String(links[k] ?? "").includes("/test_"));
}

// Throws if the links are unusable.
export function checkLinks(links) {
  for (const key of Object.keys(PLACEHOLDERS)) {
    const url = String(links[key] ?? "");
    if (!url.startsWith("https://buy.stripe.com/")) {
      throw new Error(
        `stripe-links.json: "${key}" must be a https://buy.stripe.com/ link (got "${url}").`
      );
    }
  }
  if (hasTestLink(links)) {
    throw new Error(
      [
        "",
        "================================================================",
        " STRIPE TEST LINK FOUND — BUILD STOPPED",
        " stripe-links.json still has a '/test_' Payment Link. Test links",
        " must never be published. Put the live links in stripe-links.json.",
        "================================================================",
      ].join("\n")
    );
  }
}

export function applyStripeLinks(outputDir, { links = loadLinks() } = {}) {
  checkLinks(links);
  for (const name of PAGES) {
    const file = path.join(outputDir, name);
    if (!fs.existsSync(file)) throw new Error(`Stripe links: ${name} is missing from ${outputDir}.`);
    let html = fs.readFileSync(file, "utf8");
    for (const [key, token] of Object.entries(PLACEHOLDERS)) {
      if (!html.includes(token)) throw new Error(`Stripe links: ${name} has no ${token}.`);
      html = html.split(token).join(links[key]);
    }
    fs.writeFileSync(file, html);
  }
}

// `node scripts/stripe-links.js` — check only (used by `npm run build` before Eleventy).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    checkLinks(loadLinks());
    console.log("Stripe links: live links.");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
