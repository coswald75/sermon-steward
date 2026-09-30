import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyPublishFixes,
  buildPathIndex,
  emphasizeOutsideTags,
  retargetHref,
} from "./publish-fixes.js";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "publish-fixes-"));
  const sermon = path.join(root, "CoGElPaso", "sermons");
  fs.mkdirSync(path.join(sermon, "series", "frontera-church"), { recursive: true });
  fs.writeFileSync(path.join(sermon, "index.html"), "<html><head></head><body>list</body></html>");
  fs.writeFileSync(
    path.join(sermon, "series", "index.html"),
    "<html><head></head><body>series</body></html>"
  );
  fs.writeFileSync(
    path.join(sermon, "series", "frontera-church", "index.html"),
    "<html><head></head><body>frontera</body></html>"
  );
  fs.writeFileSync(
    path.join(sermon, "rescuing-womanhood-2026-04-19.html"),
    `<!DOCTYPE html><html><head><title>Rescuing Womanhood</title></head><body>
<h1 class="sermon-title">Rescuing Womanhood</h1>
<nav class="site-nav ui">
  <a href="/CoGElPaso/sermons">Sermons</a>
  <a href="/CoGElPaso/topics">Topics</a>
  <a href="/CoGElPaso/about">About</a>
  <a href="/CoGElPaso/visit">Visit</a>
</nav>
<a href="/CoGElPaso/sermons/series/frontera-church">Frontera Church</a>
<a href="/CoGElPaso/sermons/series/missing-series">Missing</a>
<a href="/CoGElPaso/sermons/2026/04/rescuing-womanhood">Rescuing Womanhood</a>
<a href="/CoGElPaso/about" class="x">About us</a> · <a href="/CoGElPaso/what-we-believe">What we believe</a>
<a href="/CoGElPaso/visit" class="visit-cta ui">Plan a visit →</a>
<pre>User-agent: *
Allow: /</pre>
<p>The song celebrates redemption *from every tribe and tongue*.</p>
<p>A book called *Growing in Christ Together* and a word *about* Jesus.</p>
<style>* { box-sizing: border-box; }</style>
<script>var x = "*keep*";</script>
</body></html>`
  );
  fs.mkdirSync(path.join(root, "ProvidenceLenexa", "sermons"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "ProvidenceLenexa", "sermons", "index.html"),
    `<!DOCTYPE html><html><head>
<link rel="canonical" href="https://sermonsteward.com/ProvidenceLenexa/sermons">
<meta property="og:type" content="website">
<meta property="og:title" content="Sermons — Providence Community Church">
<meta property="og:url" content="https://sermonsteward.com/ProvidenceLenexa/sermons">
<meta property="og:site_name" content="Sermon Steward">
</head><body><h1>Sermons of Providence Community Church</h1></body></html>`
  );
  return root;
}

test("date-style sermon links point at the flat sermon page", () => {
  const root = fixture();
  const index = buildPathIndex(root);
  assert.equal(
    retargetHref("/CoGElPaso/sermons/2026/04/rescuing-womanhood", index),
    "/CoGElPaso/sermons/rescuing-womanhood-2026-04-19"
  );
  assert.equal(retargetHref("/CoGElPaso/sermons", index), null);
  assert.equal(retargetHref("/CoGElPaso/sermons/series/frontera-church", index), null);
  assert.equal(
    retargetHref("/CoGElPaso/sermons/series/missing-series", index),
    "/CoGElPaso/sermons/series/"
  );
  assert.equal(retargetHref("/CoGElPaso/topics", index), "");
  assert.equal(retargetHref("/CoGElPaso/about", index), "");
});

test("generated sermon HTML drops dead menu links and converts emphasis", () => {
  const root = fixture();
  applyPublishFixes(root);
  const html = fs.readFileSync(
    path.join(root, "CoGElPaso", "sermons", "rescuing-womanhood-2026-04-19.html"),
    "utf8"
  );
  assert.match(html, /href="\/CoGElPaso\/sermons">Sermons/);
  assert.doesNotMatch(html, /\/topics|\/about|\/visit|what-we-believe/);
  assert.match(html, /href="\/CoGElPaso\/sermons\/rescuing-womanhood-2026-04-19"/);
  assert.match(html, /href="\/CoGElPaso\/sermons\/series\/"/);
  assert.match(html, /<em>from every tribe and tongue<\/em>/);
  assert.match(html, /<em>Growing in Christ Together<\/em>/);
  assert.match(html, /<em>about<\/em>/);
  assert.match(html, /\* \{ box-sizing: border-box; \}/);
  assert.match(html, /var x = "\*keep\*"/);
  assert.match(html, /id="sermon-mobile-fit"/);
  assert.match(html, /User-agent: \*/);
  applyPublishFixes(root);
  const again = fs.readFileSync(
    path.join(root, "CoGElPaso", "sermons", "rescuing-womanhood-2026-04-19.html"),
    "utf8"
  );
  assert.equal(again, html);
});

test("literal asterisks in tags are left alone", () => {
  const html = emphasizeOutsideTags(
    "<p>Call it *already happening*.</p><code>* { }</code>"
  );
  assert.match(html, /<em>already happening<\/em>/);
});

test("Providence sermon index gets the preview image tags", () => {
  const root = fixture();
  applyPublishFixes(root);
  const html = fs.readFileSync(
    path.join(root, "ProvidenceLenexa", "sermons", "index.html"),
    "utf8"
  );
  assert.match(html, /og-sermon-steward-a\.jpg/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
  assert.match(html, /og:image:width" content="1200"/);
  applyPublishFixes(root);
  const again = fs.readFileSync(
    path.join(root, "ProvidenceLenexa", "sermons", "index.html"),
    "utf8"
  );
  assert.equal(again, html);
});
