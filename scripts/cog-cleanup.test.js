import test from "node:test";
import assert from "node:assert/strict";
import { fixCogLanding, stripHiddenListItems, cogRedirectsDocument, isCogHiddenPath } from "./cog-cleanup.js";
import { includeInSitemap } from "../churches.js";

test("landing shows the city and drops the Browse line", () => {
  const html = `<title>Cross of Grace Church — X · S</title><h1>Cross of Grace Church</h1><p class="hero-meta">— · Sundays</p>\n<div><p>Browse 5 stewarded sermons from Cross of Grace — every page.</p><a>x</a></div>`;
  const out = fixCogLanding(html);
  assert.match(out, /hero-meta">El Paso, TX · Sundays/);
  assert.match(out, /<h1>Cross of Grace Church<span class="h1-city">, El Paso, TX<\/span><\/h1>/);
  assert.doesNotMatch(out, /Browse \d+ stewarded/);
  assert.doesNotMatch(out, /— ·/);
});

test("undated duplicates redirect and leave listings and the sitemap", () => {
  assert.match(cogRedirectsDocument(), /^\/CoGElPaso\/sermons\/authority-revealed \/CoGElPaso\/sermons\/authority-revealed-2021-09-05 301$/m);
  const li = `<ul>\n<li><a href="/CoGElPaso/sermons/authority-revealed">A</a></li>\n<li><a href="/CoGElPaso/sermons/authority-revealed-2021-09-05">A</a></li>\n<li><a href="/CoGElPaso/sermons/carry-the-fire-week-4">C</a></li></ul>`;
  const out = stripHiddenListItems(li);
  assert.match(out, /authority-revealed-2021-09-05/);
  assert.doesNotMatch(out, /sermons\/authority-revealed"/);
  assert.doesNotMatch(out, /week-4/);
  assert.equal(isCogHiddenPath("/CoGElPaso/sermons/carry-the-fire-week-4"), true);
  assert.equal(includeInSitemap("/CoGElPaso/sermons/forgiven-much"), false);
  assert.equal(includeInSitemap("/CoGElPaso/sermons/forgiven-much-2021-08-29"), true);
});
