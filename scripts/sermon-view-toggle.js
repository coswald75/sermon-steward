// People / Preacher toggle for every stewarded sermon page.
//
// Runs on every Eleventy build (like publish-fixes.js), so pages the ingest
// pipeline renders later get it too, without re-rendering anything.
//
// The sermon template marks its sections with comments:
//   Sermon hero · Thesis · Facts strip · Sermon outline · Transcript ·
//   Sermon arc · Related teaching · Discuss / apply · About the church|preacher
// We wrap
//   "Discuss / apply"                      → People view (default)
//   "Facts strip" … "Related teaching"     → Preacher view
// and put People first. All content stays in the HTML (crawlers and no-JS
// readers get everything); two radio inputs + CSS switch which block shows,
// so the toggle works with JavaScript off. A small script only syncs the
// view with the URL (#preacher, #transcript, #unit-12 … open Preacher).
import fs from "node:fs";
import path from "node:path";

export const TOGGLE_ROOTS = ["CoGElPaso", "ProvidenceLenexa", "SignificantSermons", "SGchurch"];
const MARK = (name) => `<!-- ═══════════ ${name} ═══════════ -->`;
const DONE = 'id="ss-view-people"';

export const TOGGLE_STYLE = `<style id="ss-view-style">
.ss-view-radio{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.ss-view-toggle{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin:28px 0 8px;padding:14px 16px;border:1px solid rgba(0,0,0,.12);border-radius:14px;background:rgba(0,0,0,.025)}
.ss-view-switch{display:inline-flex;border:1px solid rgba(0,0,0,.18);border-radius:999px;padding:3px;background:#fff}
.ss-view-switch label{cursor:pointer;padding:8px 18px;border-radius:999px;font-weight:600;font-size:.95rem;line-height:1.2;user-select:none;color:inherit}
.ss-view-hint{font-size:.88rem;opacity:.75;flex:1 1 260px}
.ss-view-hint .ss-hint-preacher{display:none}
#ss-view-people:checked ~ .ss-view-toggle label[for="ss-view-people"],
#ss-view-preacher:checked ~ .ss-view-toggle label[for="ss-view-preacher"]{background:var(--accent,#1a1a2e);color:#fff}
#ss-view-people:focus-visible ~ .ss-view-toggle label[for="ss-view-people"],
#ss-view-preacher:focus-visible ~ .ss-view-toggle label[for="ss-view-preacher"]{outline:2px solid var(--accent,#1a1a2e);outline-offset:2px}
#ss-view-preacher:checked ~ .ss-view-toggle .ss-hint-people{display:none}
#ss-view-preacher:checked ~ .ss-view-toggle .ss-hint-preacher{display:inline}
#ss-view-people:checked ~ .ss-view-preacher{display:none}
#ss-view-preacher:checked ~ .ss-view-people{display:none}
@media print{.ss-view-toggle{display:none}.ss-view-people,.ss-view-preacher{display:block!important}}
</style>`;

const TOGGLE_SCRIPT = `<script id="ss-view-script">
(function(){
  var p=document.getElementById('ss-view-people'),q=document.getElementById('ss-view-preacher');
  if(!p||!q)return;
  function sync(){
    var h=decodeURIComponent(location.hash.slice(1));
    if(!h)return;
    if(h==='preacher'){q.checked=true;return;}
    if(h==='people'){p.checked=true;return;}
    var el=document.getElementById(h);
    if(!el)return;
    var pr=el.closest&&el.closest('.ss-view-preacher'),pe=el.closest&&el.closest('.ss-view-people');
    if(pr){q.checked=true;var r=document.getElementById('tx-rest');if(r&&r.contains(el))r.style.display='';}
    else if(pe){p.checked=true;}
    else return;
    setTimeout(function(){el.scrollIntoView();},0);
  }
  function setHash(v){try{history.replaceState(null,'',v==='preacher'?'#preacher':location.pathname+location.search);}catch(e){}}
  p.addEventListener('change',function(){setHash('people');});
  q.addEventListener('change',function(){setHash('preacher');});
  window.addEventListener('hashchange',sync);
  sync();
})();
</script>`;

function toggleBar() {
  return `<input type="radio" name="ss-view" id="ss-view-people" class="ss-view-radio" checked aria-controls="for-people">
    <input type="radio" name="ss-view" id="ss-view-preacher" class="ss-view-radio" aria-controls="for-preacher">
    <div class="ss-view-toggle ui">
      <span class="ss-view-switch" role="group" aria-label="Choose a view of this sermon">
        <label for="ss-view-people">People</label><label for="ss-view-preacher">Preacher</label>
      </span>
      <span class="ss-view-hint"><span class="ss-hint-people">For the congregation: reading plan, discussion questions, family and couples guides, memory verse.</span><span class="ss-hint-preacher">For the preacher: structure, outline, homiletic analysis, preaching context, and the full transcript.</span></span>
    </div>`;
}

export function addSermonViewToggle(html) {
  if (html.includes(DONE)) return html;
  const facts = html.indexOf(MARK("Facts strip"));
  const discuss = html.indexOf(MARK("Discuss / apply"));
  if (facts < 0 || discuss < 0 || discuss < facts) return html;
  let about = html.indexOf(MARK("About the church"), discuss);
  if (about < 0) about = html.indexOf(MARK("About the preacher"), discuss);
  if (about < 0) {
    const m = html.slice(discuss).search(/<\/article>|<\/main>/);
    if (m < 0) return html;
    about = discuss + m;
  }
  const preacher = html.slice(facts, discuss);
  const people = html.slice(discuss, about);
  const block =
    `${toggleBar()}\n` +
    `    <div class="ss-view ss-view-people" id="for-people">\n    ${people}</div>\n` +
    `    <div class="ss-view ss-view-preacher" id="for-preacher">\n    ${preacher}</div>\n\n    `;
  let out = html.slice(0, facts) + block + html.slice(about);
  out = out.includes('id="ss-view-style"') ? out : out.replace(/<\/head>/i, `${TOGGLE_STYLE}\n</head>`);
  out = out.includes('id="ss-view-script"') ? out : out.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${TOGGLE_SCRIPT}\n</body>`);
  return out;
}

export function applySermonViewToggle(root) {
  let updated = 0;
  for (const name of TOGGLE_ROOTS) {
    const dir = path.join(root, name);
    if (!fs.existsSync(dir)) continue;
    for (const file of walkHtml(dir)) {
      const original = fs.readFileSync(file, "utf8");
      if (!original.includes(MARK("Discuss / apply"))) continue;
      const next = addSermonViewToggle(original);
      if (next !== original) {
        fs.writeFileSync(file, next);
        updated += 1;
      }
    }
  }
  console.log(`sermon-view-toggle: updated ${updated} sermon page(s) under ${root}`);
  return updated;
}

function walkHtml(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}
