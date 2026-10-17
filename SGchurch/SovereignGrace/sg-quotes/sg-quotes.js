// SG quotes: client-side search and filters. No libraries, no network calls except loading sg-quotes.json.
(function () {
  "use strict";
  var PAGE = 40;
  var $ = function (id) { return document.getElementById(id); };
  var el = { q: $("q"), author: $("author"), topic: $("topic"), type: $("type"), preacher: $("preacher"), sort: $("sort"), res: $("results"), sum: $("summary"), more: $("more"), clear: $("clear"), chips: $("chips"), az: $("azlist") };
  var D, hay = [], matched = [], shown = 0, topicLabel = {};
  var TYPE_LABEL = { pastoral: "Classic & pastoral", commentary: "Commentary & book reading", other: "Hymns, history & literature" };
  var norm = function (s) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "'"); };
  var tokens = function (s) { return norm(s).split(/[^a-z0-9']+/).filter(Boolean); };
  var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };

  function readUrl() {
    var p = new URLSearchParams(location.search);
    el.q.value = p.get("q") || "";
    var a = p.get("author"); if (a) { var i = D.authors.findIndex(function (x) { return x.slug === a; }); if (i >= 0) el.author.value = String(i); }
    if (p.get("topic")) el.topic.value = p.get("topic");
    if (p.get("type")) el.type.value = p.get("type");
    if (p.get("preacher")) { var pi = D.preachers.findIndex(function (x) { return x.id === p.get("preacher"); }); if (pi >= 0) el.preacher.value = String(pi); }
    if (p.get("sort")) el.sort.value = p.get("sort");
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (el.q.value.trim()) p.set("q", el.q.value.trim());
    if (el.author.value !== "") p.set("author", D.authors[+el.author.value].slug);
    if (el.topic.value) p.set("topic", el.topic.value);
    if (el.type.value) p.set("type", el.type.value);
    if (el.preacher.value !== "") p.set("preacher", D.preachers[+el.preacher.value].id);
    if (el.sort.value !== "count") p.set("sort", el.sort.value);
    var s = p.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
  }

  function run() {
    var toks = tokens(el.q.value), a = el.author.value === "" ? -1 : +el.author.value, t = el.topic.value, y = el.type.value, pr = el.preacher.value === "" ? -1 : +el.preacher.value;
    matched = [];
    for (var i = 0; i < D.quotes.length; i++) {
      var q = D.quotes[i];
      if (a >= 0 && q.a !== a) continue;
      if (t && q.k.indexOf(t) < 0) continue;
      if (y && q.y !== y) continue;
      if (pr >= 0 && q.p !== pr) continue;
      var ok = true;
      for (var j = 0; j < toks.length; j++) { if (hay[i].indexOf(toks[j]) < 0) { ok = false; break; } }
      if (ok) matched.push(i);
    }
    var s = el.sort.value;
    matched.sort(function (x, z) {
      var qx = D.quotes[x], qz = D.quotes[z];
      if (s === "az") { var d = D.authors[qx.a].name === "Other / unverified" ? 1 : 0, e = D.authors[qz.a].name === "Other / unverified" ? 1 : 0; if (d !== e) return d - e;
        var nx = sortKey(D.authors[qx.a].name), nz = sortKey(D.authors[qz.a].name); if (nx !== nz) return nx < nz ? -1 : 1; return x - z; }
      if (s === "short") return qx.t.length - qz.t.length || x - z;
      return qx.a - qz.a || x - z; // most-quoted author first (authors are already in that order)
    });
    shown = 0; el.res.innerHTML = ""; lastAuthor = null; render(); writeUrl();
  }
  function sortKey(n) { var p = n.replace(/ (Jr\.|Sr\.)$/, "").split(" "); return norm(p[p.length - 1] + " " + n); }

  var lastAuthor = null;
  function render() {
    var toks = tokens(el.q.value), grouped = el.sort.value !== "short", html = "";
    var end = Math.min(shown + PAGE, matched.length);
    for (var n = shown; n < end; n++) {
      var q = D.quotes[matched[n]], au = D.authors[q.a];
      if (grouped && lastAuthor !== q.a) {
        lastAuthor = q.a;
        var cnt = matched.filter(function (m) { return D.quotes[m].a === q.a; }).length;
        html += '<h3 class="ah" id="a-' + esc(au.slug) + '">' + esc(au.name) + ' <span class="ac">' + cnt + (cnt === 1 ? " quote" : " quotes") + "</span></h3>";
      }
      html += card(q, au, toks);
    }
    el.res.insertAdjacentHTML("beforeend", html);
    shown = end;
    var authorsN = {}; matched.forEach(function (m) { if (D.authors[D.quotes[m].a].name !== "Other / unverified") authorsN[D.quotes[m].a] = 1; });
    var na = Object.keys(authorsN).length;
    el.sum.textContent = matched.length ? matched.length.toLocaleString() + (matched.length === 1 ? " quote" : " quotes") + (na ? " from " + na + (na === 1 ? " author" : " authors") : " (author names unverified)") + (shown < matched.length ? " (showing " + shown + ")" : "") : "No quotes match. Try fewer words, or clear a filter.";
    el.more.hidden = shown >= matched.length;
    el.more.textContent = "Show " + Math.min(PAGE, matched.length - shown) + " more";
    var active = el.q.value.trim() || el.author.value !== "" || el.topic.value || el.type.value || el.preacher.value !== "";
    el.clear.hidden = !active;
  }
  function hl(text, toks) {
    var out = esc(text);
    toks.filter(function (t) { return t.length > 1; }).forEach(function (t) {
      out = out.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![^<]*>)", "gi"), "<mark>$1</mark>");
    });
    return out;
  }
  function card(q, au, toks) {
    var unv = au.name === "Other / unverified";
    var who = unv ? '<span class="attr un">Author name unverified</span>' : '<button class="attr alink" data-a="' + q.a + '" title="Show only this author">' + hl(au.name, toks) + "</button>";
    var work = q.w ? ', <i class="wk">' + hl(q.w, toks) + "</i>" : "";
    var tags = q.k.map(function (k) { return '<button class="tag2" data-t="' + k + '">' + esc(topicLabel[k]) + "</button>"; }).join("");
    return '<div class="quote"><blockquote>' + hl(q.t, toks) + "</blockquote><div>" + who + work + (q.x ? '<span class="exc">excerpt</span>' : "") +
      '<div class="meta"><span class="ty ' + q.y + '">' + TYPE_LABEL[q.y] + "</span>" + tags + '</div><span class="src">From the sermon \u201c' + esc(q.s) + "\u201d by " + esc(D.preachers[q.p].name) + "</span></div></div>";
  }

  function init(d) {
    D = d;
    // Preacher filter: always shown (works with one preacher; more preachers appear automatically from the data).
    el.preacher.innerHTML = '<option value="">All preachers</option>' + D.preachers.map(function (x, i) { return '<option value="' + i + '">' + esc(x.name) + " (" + x.n + ")</option>"; }).join("");
    D.topics.forEach(function (t) { topicLabel[t.id] = t.label; });
    D.quotes.forEach(function (q) { var a = D.authors[q.a]; hay.push(norm(q.t + " " + (a.name === "Other / unverified" ? "" : a.name) + " " + q.w + " " + q.s + " " + D.preachers[q.p].name)); });
    el.author.innerHTML = '<option value="">All authors (' + (D.authors.length - 1) + ")</option>" + D.authors.map(function (a, i) { return '<option value="' + i + '">' + esc(a.name) + " (" + a.n + ")</option>"; }).join("");
    el.topic.innerHTML = '<option value="">All topics</option>' + D.topics.map(function (t) { return '<option value="' + t.id + '">' + esc(t.label) + " (" + t.n + ")</option>"; }).join("");
    el.chips.innerHTML = D.authors.slice(0, 18).map(function (a, i) { return '<button class="chip" data-a="' + i + '">' + esc(a.name) + ' <b>' + a.n + "</b></button>"; }).join("");
    var az = D.authors.map(function (a, i) { return { a: a, i: i }; }).filter(function (o) { return o.a.name !== "Other / unverified"; }).sort(function (x, y) { return sortKey(x.a.name) < sortKey(y.a.name) ? -1 : 1; });
    el.az.innerHTML = az.map(function (o) { return '<button class="chip sm" data-a="' + o.i + '">' + esc(o.a.name) + " <b>" + o.a.n + "</b></button>"; }).join("");
    readUrl(); run();
    var tm; el.q.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(run, 120); });
    [el.author, el.topic, el.type, el.sort, el.preacher].forEach(function (x) { x.addEventListener("change", run); });
    el.more.addEventListener("click", render);
    el.clear.addEventListener("click", function () { el.q.value = ""; el.author.value = ""; el.topic.value = ""; el.type.value = ""; el.preacher.value = ""; run(); });
    document.body.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-a],button[data-t]"); if (!b) return;
      if (b.dataset.a !== undefined) { el.author.value = b.dataset.a; el.sort.value = el.sort.value === "short" ? "count" : el.sort.value; }
      if (b.dataset.t !== undefined) el.topic.value = b.dataset.t;
      run(); $("controls").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  fetch("sg-quotes.json").then(function (r) { return r.json(); }).then(init).catch(function () { el.sum.textContent = "Could not load the quotes file."; });
})();
