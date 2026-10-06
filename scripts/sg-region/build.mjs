// Regional weekly pages (Midwest/Northwest, Sovereign Grace, …). One JSON per Sunday per region in ./weeks/ drives:
//   /SGchurch/MidwestNorthwest/how-we-said-it/<M-D-YY>/   (the preachers' own lines)
//   /SGchurch/MidwestNorthwest/gimme-da-quotes/<M-D-YY>/  (who they quoted: authors, theologians...)
//   the "How We Said It" tile, "Gimme da quotes!" panel and prev/next nav inside the dashboard
//   (from 10-4-26: "Gimme da quotes!" is the top-left tile and "How We Said It" sits below the church grid)
//   /SGchurch/MidwestNorthwest/<M-D-YY>/index.html (between <!-- region:... --> markers)
//   ../../regional-weeks.js (week list the Worker uses to redirect bare URLs to the latest week)
// See README.md.   Run: node scripts/sg-region/build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const TRY = "https://try.sermonsteward.com/mw";
const CSS = fs.readFileSync(path.join(here, "page.css"), "utf8");

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const slugFor = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${m}-${d}-${String(y).slice(2)}`; };
const longDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const churchId = (s) => s.url.split("/").filter(Boolean).find((p, i, a) => a[i + 1] === "sermons") || "church";

export function loadWeeks(dir = path.join(here, "weeks")) {
  // YYYY-MM-DD.json (one region) or YYYY-MM-DD-<label>.json (extra region for the same Sunday).
  return fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]+)?\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .sort((a, b) => a.date.localeCompare(b.date) || a.region.localeCompare(b.region));
}

function weekNav(weeks, i, section) {
  const href = (w) => `${w.region}/${section ? section + "/" : ""}${slugFor(w.date)}/`;
  // Stay inside this region — other regions may share the same Sunday date.
  const mine = weeks.filter((w) => w.region === weeks[i].region);
  const j = mine.findIndex((w) => w.date === weeks[i].date && w.region === weeks[i].region);
  const prev = mine[j - 1], next = mine[j + 1];
  if (!prev && !next) return "";
  return `<nav class="weeknav">${prev ? `<a href="${href(prev)}">← Previous week (${esc(longDate(prev.date))})</a>` : "<span></span>"}${next ? `<a href="${href(next)}">Next week (${esc(longDate(next.date))}) →</a>` : "<span></span>"}</nav>`;
}

function shell({ title, description, week, nav, hero, body, cta, method, footer }) {
  const dash = `${week.region}/${slugFor(week.date)}/`;
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<header><div class="wrap"><a class="wordmark" href="/">Sermon Steward<i>.</i></a><a class="btn sm" href="${TRY}">Try it free: Bigfoot Region</a></div></header>
<main class="wrap">
<a class="back" href="${dash}">← Back to the ${esc(longDate(week.date))} dashboard</a>
${nav}
${hero}
${body}
<section class="cta"><div>${cta}</div>${week.region === "/SGchurch/MidwestNorthwest" ? `<a class="btn" href="${TRY}">Sovereign Grace Midwest: try it free</a>` : `<a class="btn" href="https://try.sermonsteward.com/">Try Sermon Steward</a>`}</section>
<ul class="method">${method}</ul>
</main>
<footer><div class="wrap">${footer} · <a href="${dash}">Regional dashboard</a></div></footer>
</body></html>
`;
}

// Title rule (2026-10-06): s.title never carries scripture; the reference (s.ref, when present) sits on its own line under it.
const subhead = (s, w, prefix) => `<div class="ph"><div><div class="church">${esc(s.church)} <span class="loc">${esc(s.city)}, ${esc(s.state)}</span></div>
  <h3>${esc(s.preacher)}</h3></div><a class="sermon" href="${esc(s.url)}">${esc(s.title)} →${s.ref ? `<span class="sref" style="display:block;font-family:var(--sans,Inter,system-ui,sans-serif);font-style:normal;font-size:13px;font-weight:600;color:var(--faint);margin-top:2px">${esc(s.ref)}</span>` : ""}</a></div>`;

export function renderHowWeSaidIt(weeks, i) {
  const w = weeks[i];
  const n = w.sermons.reduce((m, s) => m + s.lines.length, 0);
  const body = w.sermons.map((s) => `<section class="pulpit" id="${churchId(s)}">
  ${subhead(s, w)}
  <div class="quotes">${s.lines.map((q) => `<a class="quote" href="${esc(`${s.url}#${q.anchor || "transcript"}`)}"><blockquote>${esc(q.text)}${q.filler_removed ? '<span class="fill" title="Filler words (um, uh) removed">*</span>' : ""}</blockquote><span class="src">${esc(s.preacher)} · in the transcript →</span></a>`).join("\n")}</div>
</section>`).join("\n");
  return shell({
    title: `How We Said It · ${longDate(w.date)} · ${w.region_name} · Sermon Steward`,
    description: `The preachers' own lines from ${w.region_name} pulpits on ${longDate(w.date)}.`,
    week: w, nav: weekNav(weeks, i, "how-we-said-it"),
    hero: `<section class="hero"><div class="tag">${esc(w.region_name)} · ${esc(longDate(w.date))}</div>
  <h1>How We <span>Said It</span></h1>
  <p class="deck">Same gospel, ${w.sermons.length} pulpits, ${w.sermons.length} voices. These are lines our brothers preached on ${esc(longDate(w.date).replace(/^\w+, /, ""))}, in their own words, so we can hear each other, learn from each other, and give thanks for each other. Tap any line to read it in context in that sermon's transcript.</p></section>`,
    body: `<section class="week" id="${w.date}"><h2>${esc(longDate(w.date))}</h2><p class="sub">${w.sermons.length} pulpits · ${n} lines</p>\n${body}</section>`,
    cta: `<h2>Add your voice next Sunday.</h2><p>Upload your sermon${w.cta_link_phrase || ""} and your lines show up here with everyone else's. ${w.region === "/SGchurch/MidwestNorthwest" ? "Free for Sovereign Grace Midwest/Northwest churches for at least the next year." : "Shared among these Sovereign Grace pulpits."}</p>`,
    method: `<li><b>Their words.</b> Every line is copied word for word from Sermon Steward's machine transcript of that sermon (AssemblyAI) and checked by code as an exact match. Nothing is paraphrased; transcription quirks are left as heard. Only the first letter is capitalized.</li>
<li><b>Selection.</b> An AI model suggested lines spoken by the preacher himself (no Scripture readings, quotations of other authors, announcements, or prayers). Lines that turned out to be someone else's words moved to <a href="${w.region}/gimme-da-quotes/${slugFor(w.date)}/">Gimme da quotes!</a>, and weak picks were dropped.</li>
<li><b>Filler.</b> Filler words like "um" and "uh" may be removed. Any line where that happened is marked <span class="fill">*</span>.</li>`,
    footer: `Prepared by Sermon Steward for the pastors of ${esc(w.region_name)}. These lines belong to their preachers and churches. ${n} lines this week.`,
  });
}

const attribution = (q) => q.attributed
  ? `<span class="attr">${esc(q.author)}${q.work ? `, <i>${esc(q.work)}</i>` : ""}</span>`
  : `<span class="attr un">Unattributed${q.as_said ? ` (preacher says “${esc(q.as_said)}”)` : ""}</span>`;

export function renderGimme(weeks, i) {
  const w = weeks[i];
  const n = w.sermons.reduce((m, s) => m + s.external.length, 0);
  const body = w.sermons.map((s) => `<section class="pulpit ext" id="${churchId(s)}">
  ${subhead(s, w)}
  ${s.external.length ? `<div class="quotes">${s.external.map((q, k) => `<a class="quote" id="${churchId(s)}-${k + 1}" href="${esc(`${s.url}#${q.anchor || "transcript"}`)}"><blockquote>${esc(q.text)}</blockquote><div>${attribution(q)}${q.excerpt ? '<span class="exc">excerpt</span>' : ""}<br><span class="src">Quoted by ${esc(s.preacher)} · in the transcript →</span></div></a>`).join("\n")}</div>` : `<p class="none">None this week.</p>`}
</section>`).join("\n");
  return shell({
    title: `Gimme da quotes! · ${longDate(w.date)} · ${w.region_name} · Sermon Steward`,
    description: `Who ${w.region_name} preachers quoted on ${longDate(w.date)}.`,
    week: w, nav: weekNav(weeks, i, "gimme-da-quotes"),
    hero: `<section class="hero"><div class="tag">${esc(w.region_name)} · ${esc(longDate(w.date))}</div>
  <h1>Gimme da <span>quotes!</span></h1>
  <p class="deck">Who the region's preachers quoted this Sunday: authors, theologians, pastors, articles. Each line is shown as spoken from the pulpit, with the source the preacher named. Scripture has its own charts on the dashboard, so it isn't listed here.</p></section>`,
    body: `<section class="week" id="${w.date}"><h2>${esc(longDate(w.date))}</h2><p class="sub">${n} quotations from ${w.sermons.filter((s) => s.external.length).length} of ${w.sermons.length} pulpits</p>\n${body}</section>`,
    cta: `<h2>See who you quoted.</h2><p>Upload next Sunday's sermon${w.cta_link_phrase || ""}. ${w.region === "/SGchurch/MidwestNorthwest" ? "Free for Sovereign Grace Midwest/Northwest churches for at least the next year." : "Shared among these Sovereign Grace pulpits."}</p>`,
    method: `<li><b>As spoken.</b> Each line is copied word for word from the sermon's machine transcript (AssemblyAI) and checked by code as an exact match. It is what the preacher said from the pulpit, which may differ from the printed original. Long readings show an <i>excerpt</i>.</li>
<li><b>Sources.</b> Candidates come from Sermon Steward's quotation tags plus an AI scan of the transcript. An author or work is shown only when the preacher names it in the sermon. Nothing is filled in from outside knowledge. When he doesn't name the source, the line is marked <i>Unattributed</i>.</li>
<li><b>Not included:</b> Scripture, and lines reported from unnamed private conversations.</li>`,
    footer: `Prepared by Sermon Steward for the pastors of ${esc(w.region_name)}. Quotations are as spoken by each preacher. ${n} quotations this week.`,
  });
}

function tile(w) {
  const lines = w.sermons.reduce((m, s) => m + s.lines.length, 0);
  const feat = w.feature || (() => { const s = w.sermons.find((x) => x.lines.length); return { text: s.lines[0].text, preacher: s.preacher, church: s.church }; })();
  return `<a class="qtile" href="${w.region}/how-we-said-it/${slugFor(w.date)}/">
  <div><div class="qk">${esc(longDate(w.date))} · ${lines} lines</div><h3>How We Said It</h3></div>
  <blockquote>${esc(feat.text)}<cite>${esc(feat.preacher)} · ${esc(feat.church)}</cite></blockquote>
  <div style="font-size:14px;color:#f6d9cf">Read your brothers' best lines from Sunday, from all ${w.sermons.length} pulpits, in their own words.</div>
  <span class="qgo">Hear each other →</span>
</a>`;
}

function panel(w) {
  const page = `${w.region}/gimme-da-quotes/${slugFor(w.date)}/`;
  const all = w.sermons.flatMap((s) => s.external.map((q, k) => ({ s, q, k })));
  const f = all.find((x) => x.q.attributed && !x.q.excerpt && x.q.text.length < 140) || all[0];
  const rows = w.sermons.map((s) => {
    const seen = new Map();
    s.external.forEach((q, k) => { const name = q.attributed ? q.author : "Unattributed"; if (!seen.has(name)) seen.set(name, { k, n: 0 }); seen.get(name).n++; });
    const who = seen.size ? [...seen].map(([name, v]) => `<a href="${page}#${churchId(s)}-${v.k + 1}">${esc(name)}</a>${v.n > 1 ? ` ×${v.n}` : ""}`).join(", ") : '<span class="none">none this week</span>';
    return `<div class="gdq-row"><div class="lbl">${esc(s.short || s.church)}</div><div class="who">${who}</div></div>`;
  }).join("");
  return `<div class="panel"><h3>Gimme da quotes!</h3><p class="q">Who the preachers quoted, beyond Scripture: ${all.length} quotations from ${w.sermons.filter((s) => s.external.length).length} of ${w.sermons.length} pulpits. Sources only as named from the pulpit.</p>
${f ? `<div class="gdq-feat">${esc(f.q.text)}<cite>${esc(f.q.author)}, quoted by ${esc(f.s.preacher)} · ${esc(f.s.short || f.s.church)}</cite></div>` : ""}${rows}
<a class="gdq-more" href="${page}">Every quotation, as spoken, with the transcript link →</a></div>`;
}

// Names that are Scripture, vague, or not a person: never featured on the dashboard tile (the full page still lists them).
const BIBLE_NAMES = new Set(["Paul", "the apostle Paul", "Apostle Paul", "Peter", "John", "James", "Jude", "Luke", "Matthew", "Mark", "Moses", "David", "Solomon", "Isaiah", "Jeremiah", "Jesus"]);
const named = (q) => {
  const a = (q.author || "").trim();
  return q.attributed && /^[A-Z]/.test(a) && !/^(One|A|An|The|Some)\s/i.test(a) && !/interviewer|commentator|website|poet/i.test(a) && !BIBLE_NAMES.has(a);
};
// Up to n short, named quotations for the tile: one per pulpit first (pulpit order), then more from the same pulpits,
// always distinct authors. Skips lines that mention their own author (usually remarks about him, not his words).
function tileQuotes(w, n = 3, max = 120) {
  const ok = (x) => named(x) && !x.excerpt && x.text.length >= 30 && x.text.length <= max &&
    !x.text.toLowerCase().includes(x.author.trim().split(/\s+/).pop().toLowerCase());
  const picks = [];
  for (const pass of [1, 2]) for (const s of w.sermons) {
    if (picks.length === n) break;
    if (pass === 1 && picks.some((p) => p.s === s)) continue;
    const q = s.external.find((x) => ok(x) && !picks.some((p) => p.q.author === x.author));
    if (q) picks.push({ s, q });
  }
  return picks.sort((a, b) => w.sermons.indexOf(a.s) - w.sermons.indexOf(b.s));
}

function gdqTile(w) {
  const page = `${w.region}/gimme-da-quotes/${slugFor(w.date)}/`;
  const all = w.sermons.flatMap((s) => s.external);
  const withQ = w.sermons.filter((s) => s.external.length).length;
  const picks = tileQuotes(w);
  const quotes = picks.length
    ? picks.map(({ s, q }) => `<blockquote>${esc(q.text)}<cite>${esc(q.author)} · quoted by ${esc(s.preacher)}, ${esc(s.short || s.church)}</cite></blockquote>`).join("\n  ")
    : `<div style="font-size:14px;color:#f6d9cf">No named outside quotations this week.</div>`;
  return `<a class="qtile gdqt" href="${page}">
  <div><div class="qk">${esc(longDate(w.date))} · beyond Scripture</div><h3>Gimme da quotes!</h3></div>
  ${quotes}
  <span class="qgo">All ${all.length} quotations, ${withQ} of ${w.sermons.length} pulpits →</span>
</a>`;
}

const WIDE_CSS = `<style>
.gdqt{gap:10px}
.gdqt blockquote{font-size:.93rem;line-height:1.36}
.gdqt blockquote cite{margin-top:4px}
.qwide{margin-top:16px;flex-direction:row;align-items:center;gap:28px}
.qwide .qw-l{flex:0 0 36%;display:flex;flex-direction:column;gap:10px}
.qwide .qw-l h3{margin:0}
.qwide blockquote{flex:1;font-size:1.2rem}
@media(max-width:760px){.qwide{flex-direction:column;align-items:stretch}.qwide .qw-l{flex:none}}
.two>.panel:last-child:nth-child(odd){grid-column:1/-1}
</style>`;

function hwsiWide(w) {
  const lines = w.sermons.reduce((m, s) => m + s.lines.length, 0);
  const feat = w.feature || (() => { const s = w.sermons.find((x) => x.lines.length); return { text: s.lines[0].text, preacher: s.preacher, church: s.church }; })();
  const fs_ = w.sermons.find((x) => x.church === feat.church && x.preacher === feat.preacher) || w.sermons.find((x) => x.church === feat.church);
  const where = fs_ ? (fs_.short || `${fs_.church}, ${fs_.city}`) : feat.church;   // name + city
  return `${WIDE_CSS}<a class="qtile qwide" href="${w.region}/how-we-said-it/${slugFor(w.date)}/">
  <div class="qw-l"><div class="qk">${esc(longDate(w.date))} · ${lines} lines</div><h3>How We Said It</h3>
  <div style="font-size:14px;color:#f6d9cf">Read your brothers' best lines from Sunday, from all ${w.sermons.length} pulpits, in their own words.</div>
  <span class="qgo">Hear each other →</span></div>
  <blockquote>${esc(feat.text)}<cite>${esc(feat.preacher)} · ${esc(where)}</cite></blockquote>
</a>`;
}

function fill(html, name, content, file) {
  const re = new RegExp(`(<!-- region:${name} -->)[\\s\\S]*?(<!-- /region:${name} -->)`);
  if (!re.test(html)) { console.warn(`! ${file}: missing <!-- region:${name} --> markers`); return html; }
  return html.replace(re, (_, a, b) => `${a}${content}${b}`);
}

export function build() {
  const weeks = loadWeeks();
  const regions = {};
  weeks.forEach((w, i) => {
    const slug = slugFor(w.date);
    const base = path.join(repo, w.region.replace(/^\//, ""));
    for (const [section, render] of [["how-we-said-it", renderHowWeSaidIt], ["gimme-da-quotes", renderGimme]]) {
      const f = path.join(base, section, slug, "index.html");
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, render(weeks, i));
    }
    const dash = path.join(base, slug, "index.html");
    if (fs.existsSync(dash)) {
      let h = fs.readFileSync(dash, "utf8");
      if (h.includes("<!-- region:hwsi-below -->")) {
        // Layout from 10-4-26 on (dashboards that carry the hwsi-below marker): the top-left grid tile is
        // "Gimme da quotes!" with the quotes visible; "How We Said It" is a wide tile right below the church grid;
        // the old Gimme da quotes chart panel is dropped so nothing is duplicated. Older weeks keep their layout.
        h = fill(h, "hwsi-tile", gdqTile(w), dash);
        h = fill(h, "hwsi-below", hwsiWide(w), dash);
        h = fill(h, "gdq-panel", "", dash);
      } else {
        h = fill(h, "hwsi-tile", tile(w), dash);
        h = fill(h, "gdq-panel", panel(w), dash);
      }
      h = fill(h, "weeknav", weekNav(weeks, i, ""), dash);
      fs.writeFileSync(dash, h);
    } else console.warn(`! no dashboard page yet at ${path.relative(repo, dash)}`);
    (regions[w.region] ||= []).push(slug);
    console.log(`built ${w.region} ${slug}`);
  });
  fs.writeFileSync(path.join(repo, "regional-weeks.js"),
    `// GENERATED by scripts/sg-region/build.mjs. Do not edit by hand.\n// Weekly slugs (M-D-YY) per unlisted region, oldest → newest. The Worker redirects\n// bare region URLs to the last one.\nexport const REGION_WEEKS = ${JSON.stringify(regions, null, 2)};\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
