// Sovereign Grace Quotes: one searchable, unlisted clearinghouse of authors quoted in Sovereign Grace sermons.
//   in : scripts/sg-region/quotes/sg-quotes-data.json   (made by quotes/prep_quotes.py from the prepared quote data)
//   out: SGchurch/SovereignGrace/sg-quotes/{index.html, sg-quotes.json, sg-quotes.js}
// The URL avoids a "/quotes/" segment: the Worker 302s /SGchurch/<region>/quotes (see churches.js).
// Unlisted: noindex meta here, and /SGchurch/SovereignGrace is in UNLISTED_ROOTS (header noindex, no sitemap).
// Reuses page.css (the weekly "Gimme da quotes!" look). Run: node scripts/sg-region/build-sg-quotes.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const OUT = path.join(repo, "SGchurch", "SovereignGrace", "sg-quotes");
const CSS = fs.readFileSync(path.join(here, "page.css"), "utf8") + fs.readFileSync(path.join(here, "sg-quotes.css"), "utf8");
const JS = fs.readFileSync(path.join(here, "sg-quotes.client.js"), "utf8");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (x) => x.toLocaleString("en-US");

export function render(data) {
  const m = data.meta;
  const title = "Sovereign Grace Quotes · Sermon Steward";
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<meta name="description" content="Search the authors quoted in Sovereign Grace sermons, by author, topic, or quote text.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<header><div class="wrap"><a class="wordmark" href="/">Sermon Steward<i>.</i></a><a class="btn sm" href="https://try.sermonsteward.com/">Try Sermon Steward</a></div></header>
<main class="wrap">
<a class="back" href="/SGchurch/SovereignGrace/">← Sovereign Grace dashboard</a>
<section class="hero"><div class="tag">Sovereign Grace</div>
  <h1>Sovereign Grace <span>Quotes</span></h1>
  <p class="deck">The authors quoted in Sovereign Grace sermons, with the words as they were read from the pulpit. Search by author, topic, or any words in the quote. ${n(m.quotes)} quotations · ${n(m.authors)} authors · ${n(m.sermons)} sermons.</p>
  <p class="note"><b>Transcript text.</b> These quotations come from machine-made transcripts of the sermon audio, so they can contain errors in wording, punctuation, or names. They are not checked against the printed books.</p>
</section>
<section class="controls" id="controls" aria-label="Search and filters">
  <div class="row has-p">
    <div class="qbox"><label for="q">Search quote text or author</label><input id="q" type="search" placeholder="humility, Spurgeon, peace with God" autocomplete="off"></div>
    <div><label for="author">Author</label><select id="author"><option value="">All authors</option></select></div>
    <div><label for="topic">Topic</label><select id="topic"><option value="">All topics</option></select></div>
    <div><label for="preacher">Preacher</label><select id="preacher"><option value="">All preachers</option></select></div>
    <div><label for="type">Kind of source</label><select id="type"><option value="">All</option><option value="pastoral">Classic &amp; pastoral</option><option value="commentary">Commentary &amp; book reading</option><option value="other">Hymns, history &amp; literature</option></select></div>
    <div><label for="sort">Order</label><select id="sort"><option value="count">Most-quoted author first</option><option value="az">Author A–Z</option><option value="short">Shortest first</option></select></div>
  </div>
  <div class="status"><span id="summary" aria-live="polite">Loading…</span><button id="clear" hidden>Clear filters</button></div>
</section>
<p class="lead">Most-quoted authors</p>
<div class="chips" id="chips"></div>
<details class="az"><summary>Browse all authors A–Z</summary><div id="azlist"></div></details>
<noscript><p class="note">This page needs JavaScript to search.</p></noscript>
<section class="week ext" style="margin-top:20px"><div id="results"></div><button class="more" id="more" hidden>Show more</button></section>
<section class="cta"><div><h2>See who you quoted.</h2><p>Upload a sermon and Sermon Steward finds the authors you quoted, with the exact words.</p></div><a class="btn" href="https://try.sermonsteward.com/">Try Sermon Steward</a></section>
<ul class="method">
<li><b>As spoken.</b> Each quotation is the text from the sermon transcript, shown with the author the preacher named. Quotes longer than ${m.cap_words} words are cut with “…” and marked “excerpt”. Quotes under ${m.min_words} words are left out.</li>
<li><b>Kind of source.</b> A simple rule sorts quotes into “Classic &amp; pastoral” (historic pastors and well-known teachers, or books read aloud) and “Commentary &amp; book reading” (the preacher introduced a commentary, study Bible, or article, or the author is a commentator). It is a rough guide, not a judgment.</li>
<li><b>Topics.</b> Topics are matched automatically from keywords in the quote (up to three each). Some quotes have no topic, and some topics will catch quotes that only touch them.</li>
<li><b>Names.</b> Where the transcript garbled an author's name and it could not be confirmed, the quote appears under “Other / unverified” with no name shown. Organization statistics, Scripture, and anonymous sources are left out.</li>
</ul>
</main>
<footer><div class="wrap">Quotations are as spoken in sermons, shown briefly with attribution for study and discussion. Copyright in each work belongs to its author and publisher. If you are a rights holder and want a quotation changed or removed, contact us. · <a href="/SGchurch/SovereignGrace/">Sovereign Grace dashboard</a></div></footer>
<script src="sg-quotes.js"></script>
</body></html>
`;
}

export function build() {
  const data = JSON.parse(fs.readFileSync(path.join(here, "quotes", "sg-quotes-data.json"), "utf8"));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "index.html"), render(data));
  fs.writeFileSync(path.join(OUT, "sg-quotes.json"), JSON.stringify(data));
  fs.writeFileSync(path.join(OUT, "sg-quotes.js"), JS);
  console.log(`built ${path.relative(repo, OUT)} (${data.meta.quotes} quotes, ${data.meta.authors} authors)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
