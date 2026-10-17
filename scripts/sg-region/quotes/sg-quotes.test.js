// Rules for the SG quotes page data (run: node --test scripts/sg-region/quotes/sg-quotes.test.js)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../build-sg-quotes.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(here, "sg-quotes-data.json"), "utf8"));
const html = render(data);

test("every quote is capped at 60 words and has an author", () => {
  for (const q of data.quotes) {
    assert.ok(q.t.replace("…", "").trim().split(/\s+/).length <= data.meta.cap_words);
    assert.ok(data.authors[q.a], "author index");
    if (q.x) assert.ok(q.t.endsWith("…"));
  }
});
test("no Scripture reference in sermon titles, no Fidelis, no pricing, noindex", () => {
  const ref = /\b(Genesis|Exodus|Psalms?|Isaiah|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Hebrews|James|Peter|Revelation)\s+\d/;
  for (const q of data.quotes) assert.doesNotMatch(q.s, ref);
  assert.doesNotMatch(html + JSON.stringify(data), /fidelis/i);
  assert.doesNotMatch(html, /\$\d|per month|\/month|pricing/i); // page chrome only: a quoted sentence may mention dollars
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
});
test("page chrome is not preacher-specific; cards credit the sermon and preacher from the data, no links", () => {
  assert.doesNotMatch(html, /mahaney/i); // title, meta, headings, notes, footer
  const client = fs.readFileSync(path.join(here, "..", "sg-quotes.client.js"), "utf8");
  assert.doesNotMatch(client, /mahaney/i); // the name comes from the data, not the code
  assert.match(client, /From the sermon .* by .*D\.preachers\[q\.p\]\.name/);
  assert.match(html, /<title>Sovereign Grace Quotes[^<]*<\/title>/);
  assert.match(html, /<h1>Sovereign Grace <span>Quotes<\/span><\/h1>/);
  assert.doesNotMatch(html, /<a [^>]*href="[^"]*sermons\//);
  for (const q of data.quotes) assert.equal(Object.hasOwn(q, "url"), false);
});
test("data is ready for several preachers: preachers[] plus a p index on every quote; filter is on the page", () => {
  assert.ok(Array.isArray(data.preachers) && data.preachers.length >= 1);
  for (const q of data.quotes) assert.ok(data.preachers[q.p], "preacher index");
  assert.equal(data.preachers.reduce((a, p) => a + p.n, 0), data.quotes.length);
  assert.match(html, /<select id="preacher">/);
});
test("page carries the transcript-errors note and the unverified bucket hides names", () => {
  assert.match(html, /machine-made transcripts[^<]*can contain errors/);
  assert.ok(data.authors.some((a) => a.name === "Other / unverified"));
});
