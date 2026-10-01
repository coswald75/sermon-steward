// Builds /SGchurch/MidwestNorthwest/quotes/index.html: ONE running page of quotable lines,
// grouped by Sunday, newest week on top. Data lives in ./weeks/<YYYY-MM-DD>.json (one file per
// Sunday). See README.md in this folder for how to add next Sunday.
//   node scripts/sg-quotes/build-quotes.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const outFile = path.join(repo, "SGchurch", "MidwestNorthwest", "quotes", "index.html");
const TRY = "https://try.sermonsteward.com/mw";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const longDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export function loadWeeks(dir = path.join(here, "weeks")) {
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .sort((a, b) => b.date.localeCompare(a.date)); // newest Sunday first
}

function sermonBlock(s, week) {
  const quotes = s.quotes
    .map((q) => {
      const href = `${s.url}#${q.anchor || "transcript"}`;
      const mark = q.filler_removed ? '<span class="fill" title="Filler words (um, uh) removed">*</span>' : "";
      return `<a class="quote" href="${esc(href)}"><blockquote>${esc(q.text)}${mark}</blockquote><span class="src">${esc(s.preacher)} · in the transcript →</span></a>`;
    })
    .join("\n");
  return `<section class="pulpit" id="${week.date}-${esc(s.url.split("/").filter(Boolean)[s.url.includes("SGchurch") ? 2 : 0] || "")}">
  <div class="ph"><div><div class="church">${esc(s.church)} <span class="loc">${esc(s.city)}, ${esc(s.state)}</span></div>
  <h3>${esc(s.preacher)}</h3></div><a class="sermon" href="${esc(s.url)}">${esc(s.title)} →</a></div>
  <div class="quotes">${quotes}</div>
</section>`;
}

export function renderPage(weeks) {
  const total = weeks.reduce((n, w) => n + w.sermons.reduce((m, s) => m + s.quotes.length, 0), 0);
  const body = weeks
    .map((w, i) => {
      const n = w.sermons.reduce((m, s) => m + s.quotes.length, 0);
      return `<section class="week" id="${w.date}">
<h2>${i === 0 ? '<span class="kicker">Latest</span>' : ""}${esc(longDate(w.date))}</h2>
<p class="sub">${w.sermons.length} pulpits · ${n} lines</p>
${w.sermons.map((s) => sermonBlock(s, w)).join("\n")}
</section>`;
    })
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Gimme da quotes! · Sovereign Grace Midwest/Northwest · Sermon Steward</title>
<meta name="description" content="Quotable lines from Sovereign Grace Midwest/Northwest pulpits, Sunday by Sunday.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
:root{--bg:#fbf8f1;--card:#fff;--soft:#f5f1e6;--ink:#1a1a1a;--ink2:#4a4a4a;--faint:#828282;--rule:#e6e1d3;--accent:#c4452f;--accent2:#9a3624;--green:#2d5a4a;--hl:#fef0c8;--sans:'Inter',system-ui,sans-serif;--serif:'Source Serif 4',Georgia,serif}
*{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none} a:hover{text-decoration:underline}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px}
header{border-bottom:1px solid var(--rule);background:rgba(251,248,241,.94);position:sticky;top:0;z-index:5;backdrop-filter:blur(8px)}
header .wrap{display:flex;justify-content:space-between;align-items:center;padding-top:14px;padding-bottom:14px;gap:16px}
.wordmark{font-weight:800;font-size:20px;letter-spacing:-.02em;color:var(--ink)} .wordmark i{color:var(--accent);font-style:normal}
.btn{display:inline-block;background:var(--accent);color:#fff!important;font-weight:700;padding:12px 20px;border-radius:10px;box-shadow:0 4px 12px rgba(196,69,47,.2)} .btn:hover{background:var(--accent2);text-decoration:none}
.btn.sm{padding:8px 14px;font-size:14px}
.back{display:inline-block;margin-top:26px;font-weight:600;font-size:14px}
.hero{padding:30px 0 10px;text-align:center} .tag{display:inline-block;background:var(--hl);font-size:13px;font-weight:700;padding:6px 14px;border-radius:999px;margin-bottom:18px}
.hero h1{font-size:clamp(2.4rem,6vw,4rem);line-height:1.02;letter-spacing:-.03em;margin:0 0 14px;font-weight:800} .hero h1 span{color:var(--accent)}
.deck{font-size:1.12rem;color:var(--ink2);max-width:700px;margin:0 auto}
.week{margin-top:40px} .week>h2{font-size:1.9rem;letter-spacing:-.02em;margin:0;padding-top:18px;border-top:3px solid var(--ink)}
.kicker{display:block;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.sub{color:var(--faint);margin:2px 0 8px;font-size:14px}
.pulpit{margin:30px 0 0} .ph{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:6px 16px;border-bottom:1px solid var(--rule);padding-bottom:8px;margin-bottom:14px}
.church{font-weight:700;font-size:14px;color:var(--ink2)} .loc{font-weight:400;color:var(--faint);margin-left:6px}
.ph h3{margin:0;font-size:1.35rem;letter-spacing:-.01em} .sermon{font-family:var(--serif);font-style:italic;font-size:1rem}
.quotes{display:grid;grid-template-columns:repeat(2,1fr);gap:14px} @media(max-width:760px){.quotes{grid-template-columns:1fr}}
.quote{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:10px;background:var(--card);border:1px solid var(--rule);border-left:4px solid var(--accent);border-radius:14px;padding:18px 18px 14px 22px;color:var(--ink);transition:transform .12s,box-shadow .12s}
.quote:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08);text-decoration:none}
.quote blockquote{margin:0;font-family:var(--serif);font-size:1.12rem;line-height:1.45} .quote blockquote::before{content:"\\201C";color:var(--accent);font-weight:600;margin-right:2px} .quote blockquote::after{content:"\\201D";color:var(--accent);font-weight:600}
.src{font-size:12.5px;font-weight:600;color:var(--faint)} .quote:hover .src{color:var(--accent)}
.fill{color:var(--faint);font-size:.8em;vertical-align:super}
.cta{background:var(--green);color:#fff;border-radius:20px;padding:30px 36px;margin:56px 0 0;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:18px} .cta h2{margin:0 0 6px;color:#fff;font-size:1.5rem} .cta p{margin:0;color:#e4eee8;max-width:640px}
.cta .btn{background:#fff;color:var(--green)!important;box-shadow:none}
.method{font-size:13.5px;color:var(--ink2);margin-top:30px} .method li{margin:4px 0}
footer{border-top:1px solid var(--rule);padding:26px 0 40px;color:var(--faint);font-size:13px;margin-top:40px}
</style></head><body>
<header><div class="wrap"><a class="wordmark" href="/">Sermon Steward<i>.</i></a><a class="btn sm" href="${TRY}">Try it free: Bigfoot Region</a></div></header>
<main class="wrap">
<a class="back" href="/SGchurch/MidwestNorthwest/">← Back to the regional dashboard</a>
<section class="hero">
  <div class="tag">Sovereign Grace Midwest/Northwest</div>
  <h1>Gimme da <span>quotes!</span></h1>
  <p class="deck">The most quotable lines from every pulpit in the region, Sunday by Sunday, newest on top. Tap any line to hear it in context: it opens that sermon's transcript right where it was said.</p>
</section>
${body}
<section class="cta"><div><h2>Want your sermon on this page?</h2><p>Upload next Sunday's MP3 at the Sovereign Grace Midwest link. $30/month after a free first month. No contract.</p></div><a class="btn" href="${TRY}">Sovereign Grace Midwest: try it free</a></section>
<ul class="method">
<li><b>Verbatim.</b> Every line is copied word for word from Sermon Steward's machine transcript of that sermon (AssemblyAI) and checked by code as an exact match before it appears here. Nothing is paraphrased. Transcription quirks are left as heard.</li>
<li><b>Selection.</b> An AI model suggested candidate lines spoken by the preacher himself (no Scripture readings, quotations of other authors, announcements, or prayers). Weak or out-of-context picks were dropped.</li>
<li><b>Filler.</b> Filler words like "um" and "uh" may be removed. Any line where that happened is marked <span class="fill">*</span>.</li>
</ul>
</main>
<footer><div class="wrap">Prepared by Sermon Steward for the pastors of Sovereign Grace Midwest/Northwest. Quotes belong to their preachers and churches. ${total} lines so far. · <a href="/SGchurch/MidwestNorthwest/">Regional dashboard</a></div></footer>
</body></html>
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const weeks = loadWeeks();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, renderPage(weeks));
  console.log(`wrote ${path.relative(repo, outFile)}: ${weeks.length} week(s)`);
}
