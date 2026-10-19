// Cross of Grace Church (El Paso, TX) publish fixes, applied on every build.
//
// The ingest pipeline (shepherds-guild-pipeline) regenerates /CoGElPaso/
// from Supabase and then runs Eleventy, so these corrections live in the
// build, not in a one-time edit of the generated HTML:
//   1. Undated legacy duplicates (no date, audio or resources) 301 to their
//      dated twin via _redirects; the two without a twin stay reachable but
//      get noindex and leave the listings and the sitemap.
//   2. The landing page shows the city where the generator leaves "— ·".
//   3. The landing page's "Browse N stewarded sermons" line is removed.
import fs from "node:fs";
import path from "node:path";

import {
  COG_ROOT, COG_SERMONS, COG_CITY, COG_UNDATED_REDIRECTS, COG_UNDATED_DELISTED, isCogHiddenPath,
} from "./cog-paths.js";
export { isCogHiddenPath };

export function cogRedirectsDocument() {
  const lines = ["# Cross of Grace El Paso undated duplicates -> dated twin (scripts/cog-cleanup.js)"];
  for (const [from, to] of Object.entries(COG_UNDATED_REDIRECTS)) {
    lines.push(`${COG_SERMONS}/${from} ${COG_SERMONS}/${to} 301`);
    lines.push(`${COG_SERMONS}/${from}.html ${COG_SERMONS}/${to} 301`);
    lines.push(`${COG_SERMONS}/${from}/ ${COG_SERMONS}/${to} 301`);
  }
  return lines.join("\n") + "\n";
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Drop listing <li> entries that link to a hidden undated page.
export function stripHiddenListItems(html) {
  const slugs = [...Object.keys(COG_UNDATED_REDIRECTS), ...COG_UNDATED_DELISTED].map(escapeRe);
  const re = new RegExp(
    `\\s*<li>(?:(?!</li>)[\\s\\S])*?href="${escapeRe(COG_SERMONS)}/(?:${slugs.join("|")})(?:\\.html)?"(?:(?!</li>)[\\s\\S])*?</li>`,
    "g"
  );
  return html.replace(re, "");
}

export function fixCogLanding(html) {
  let out = html;
  out = out.replace(/<p class="hero-meta">— · /g, `<p class="hero-meta">${COG_CITY} · `);
  out = out.replace(/Cross of Grace Church in \./g, `Cross of Grace Church in ${COG_CITY}.`);
  out = out.replace(/<title>Cross of Grace Church — /, `<title>Cross of Grace Church, ${COG_CITY} — `);
  out = out.replace(/(<meta property="og:title" content=")Cross of Grace Church(")/, `$1Cross of Grace Church, ${COG_CITY}$2`);
  out = out.replace(/(<h1>Cross of Grace Church)(<\/h1>)/, `$1<span class="h1-city">, ${COG_CITY}</span>$2`);
  out = out.replace(/\s*<p>Browse \d+ stewarded sermons[^<]*<\/p>/g, "");
  return out;
}

function injectNoindex(html) {
  if (/<meta name="robots"/i.test(html)) {
    return html.replace(/<meta name="robots" content="[^"]*">/i, '<meta name="robots" content="noindex, follow">');
  }
  return html.replace(/<head>/i, '<head>\n<meta name="robots" content="noindex, follow">');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".html")) out.push(full);
  }
  return out;
}

export function applyCogCleanup(outputDir) {
  const root = path.join(outputDir, COG_ROOT.slice(1));
  const sermons = path.join(outputDir, COG_SERMONS.slice(1));
  // Redirected pages leave the output so _redirects always answers.
  for (const slug of Object.keys(COG_UNDATED_REDIRECTS)) {
    const f = path.join(sermons, `${slug}.html`);
    if (fs.existsSync(f)) fs.rmSync(f);
  }
  for (const slug of COG_UNDATED_DELISTED) {
    const f = path.join(sermons, `${slug}.html`);
    if (fs.existsSync(f)) fs.writeFileSync(f, injectNoindex(fs.readFileSync(f, "utf8")));
  }
  for (const file of walk(root)) {
    const orig = fs.readFileSync(file, "utf8");
    let html = stripHiddenListItems(orig);
    if (path.resolve(file) === path.resolve(root, "index.html")) html = fixCogLanding(html);
    if (html !== orig) fs.writeFileSync(file, html);
  }
  const redirectsFile = path.join(outputDir, "_redirects");
  const existing = fs.existsSync(redirectsFile) ? fs.readFileSync(redirectsFile, "utf8") : "";
  fs.writeFileSync(redirectsFile, existing + cogRedirectsDocument());
}
