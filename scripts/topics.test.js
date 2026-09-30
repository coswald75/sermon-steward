import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CHURCHES } from "../churches.js";
import {
  extractTopic,
  injectTopicsNav,
  renderTopicPage,
  renderTopics,
} from "./topics.js";

const providence = CHURCHES.find((church) => church.slug === "ProvidenceLenexa");

const SAMPLE = `<!DOCTYPE html>
<html><head>
<title>Sermons on Suffering | Providence</title>
<meta name="description" content="Why does God allow suffering?">
<style>body { font-family: Georgia; }</style>
</head><body>
<nav><a href="https://sermonsteward.com/">Home</a></nav>
<article>
<h1>What God Is Doing</h1>
<p class="subtitle">Every trial has passed through God's hand.</p>
<p>Chris drew the conclusion.<sup><a href="#src-1">[1]</a></sup> And again.<sup><a href="#src-13">[13]</a></sup></p>
</article>
<section>
<h2>From the pulpit</h2>
<ol class="sermons">
  <li id="src-1"><a href="/ProvidenceLenexa/sermons/example.html">One</a></li>
  <li id="src-13"><a href="/ProvidenceLenexa/sermons/other.html">Thirteen</a></li>
</ol>
</section>
<footer><p>Sundays at 10:00 AM</p></footer>
</body></html>`;

test("topic content keeps footnote anchors and drops the content stylesheet", () => {
  const topic = extractTopic(SAMPLE, "suffering", providence);
  assert.equal(topic.h1, "What God Is Doing");
  assert.match(topic.body, /<a href="#src-1">\[1\]<\/a>/);
  assert.match(topic.body, /<li id="src-13">/);
  assert.match(topic.body, /<section>/);
  assert.doesNotMatch(topic.body, /<style|Georgia|<nav/);
  assert.match(topic.footer, /Sundays at 10:00 AM/);
});

test("rendered topic page is canonical at the public church path", () => {
  const topic = extractTopic(SAMPLE, "suffering", providence);
  const page = renderTopicPage(topic);
  assert.match(
    page,
    /rel="canonical" href="https:\/\/sermonsteward\.com\/SGchurch\/ProvidenceLenexa\/topics\/suffering\/"/
  );
  assert.match(page, /href="\/SGchurch\/ProvidenceLenexa\/topics\/">Topics<\/a>/);
  assert.match(page, /href="\/ProvidenceLenexa\/sermons\/">Sermons<\/a>/);
  assert.match(page, /href="#src-1"/);
  assert.doesNotMatch(page, /font-family: Georgia/);
});

test("sermon nav and the sermon list gain one Topics link", () => {
  const href = "/SGchurch/ProvidenceLenexa/topics/";
  const sermon = `<nav class="site-nav ui"><a href="/ProvidenceLenexa/sermons">Sermons</a></nav>`;
  const once = injectTopicsNav(sermon, href);
  assert.match(once, /href="\/SGchurch\/ProvidenceLenexa\/topics\/">Topics<\/a>/);
  assert.equal(injectTopicsNav(once, href), once);

  const index = `<div class="browse-by"><span class="label">Browse:</span><a href="/ProvidenceLenexa/sermons/">All sermons</a></div>`;
  const listed = injectTopicsNav(index, href);
  assert.match(listed, /All sermons<\/a><a href="\/SGchurch\/ProvidenceLenexa\/topics\/">Topics<\/a>/);
});

test("a drop-in file publishes an index and a topic page", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "topics-"));
  const content = path.join(root, "content", "ProvidenceLenexa");
  fs.mkdirSync(content, { recursive: true });
  fs.writeFileSync(path.join(content, "suffering.html"), SAMPLE);
  const output = path.join(root, "site");
  fs.mkdirSync(path.join(output, "ProvidenceLenexa", "sermons"), { recursive: true });
  fs.writeFileSync(
    path.join(output, "ProvidenceLenexa", "sermons", "index.html"),
    `<div class="browse-by"><a href="/ProvidenceLenexa/sermons/">All sermons</a></div>`
  );
  fs.writeFileSync(
    path.join(output, "ProvidenceLenexa", "sermons", "example.html"),
    `<nav class="site-nav ui"><a href="/ProvidenceLenexa/sermons">Sermons</a></nav>`
  );

  assert.equal(renderTopics(output, path.join(root, "content")), 1);
  const index = fs.readFileSync(
    path.join(output, "SGchurch", "ProvidenceLenexa", "topics", "index.html"),
    "utf8"
  );
  const page = fs.readFileSync(
    path.join(output, "SGchurch", "ProvidenceLenexa", "topics", "suffering", "index.html"),
    "utf8"
  );
  assert.match(index, /href="\/SGchurch\/ProvidenceLenexa\/topics\/suffering\/"/);
  assert.match(index, /What God Is Doing/);
  assert.match(page, /id="src-1"/);
  const sermon = fs.readFileSync(
    path.join(output, "ProvidenceLenexa", "sermons", "example.html"),
    "utf8"
  );
  assert.match(sermon, /href="\/SGchurch\/ProvidenceLenexa\/topics\/">Topics<\/a>/);
  const list = fs.readFileSync(
    path.join(output, "ProvidenceLenexa", "sermons", "index.html"),
    "utf8"
  );
  assert.match(list, /href="\/SGchurch\/ProvidenceLenexa\/topics\/">Topics<\/a>/);
});
