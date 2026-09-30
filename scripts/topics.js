// Topic pages for the public church URL.
//
// One drop-in file per topic: _src/topics/<ChurchSlug>/<slug>.html
// The file is content (the article, its sources, and an optional footer).
// This module pours that content into the site header, footer, and type,
// writes it under /<network>/<ChurchSlug>/topics/, and adds a Topics
// link to that church's sermon nav. Adding a topic is dropping another
// file in the church's folder. churches.js is the only URL map.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHURCHES, publicTopicsPath, SITE_ORIGIN } from "../churches.js";
import { emphasizeOutsideTags } from "./publish-fixes.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TOPICS_CONTENT_DIR = path.join(HERE, "..", "_src", "topics");

const PAGE_CSS = `
  :root {
    --bg: #fbf8f1; --bg-card: #ffffff; --ink: #1a1a1a; --ink-soft: #4a4a4a;
    --ink-faint: #828282; --rule: #e6e1d3; --accent: #c4452f; --accent-deep: #9a3624;
    --sans: 'Inter', system-ui, -apple-system, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; background: var(--bg); color: var(--ink);
    font-family: var(--sans); font-size: 17px; line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { color: var(--accent-deep); }
  .site-header { border-bottom: 1px solid var(--rule); }
  .site-header-inner {
    max-width: 1100px; margin: 0 auto; padding: 18px 28px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  }
  .wordmark { font-weight: 800; font-size: 21px; letter-spacing: -0.02em; color: var(--ink); }
  .wordmark .dot { color: var(--accent); }
  .site-nav { display: flex; gap: 18px; flex-wrap: wrap; font-weight: 600; }
  .site-nav a { color: var(--ink-soft); }
  .site-nav a[aria-current="page"] { color: var(--ink); }
  main { max-width: 42rem; margin: 0 auto; padding: 48px 28px 80px; }
  .breadcrumb { font-size: 13px; color: var(--ink-faint); margin-bottom: 20px; }
  .breadcrumb a { color: var(--ink-soft); text-decoration: underline; text-underline-offset: 3px; }
  h1 { font-size: clamp(2rem, 5vw, 2.8rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin: 0 0 14px; }
  .subtitle, .deck { font-size: 1.15rem; color: var(--ink-soft); margin: 0 0 28px; }
  h2 { margin: 2.2rem 0 0.8rem; line-height: 1.3; font-size: 1.45rem; letter-spacing: -0.02em; }
  h3 { margin: 1.4rem 0 0.4rem; font-size: 1.15rem; }
  p { margin: 0 0 1rem; }
  sup a { text-decoration: none; font-weight: 700; font-size: 0.75em; }
  blockquote { margin: 1rem 0; padding-left: 1rem; border-left: 3px solid var(--rule); color: var(--ink-soft); }
  .sermons { padding-left: 1.2rem; }
  .sermons li { margin-bottom: 0.7rem; }
  .meta { color: var(--ink-faint); font-size: 0.9rem; }
  .topic-list { list-style: none; padding: 0; margin: 28px 0 0; }
  .topic-list li { padding: 18px 0; border-top: 1px solid var(--rule); }
  .topic-list a { font-weight: 700; font-size: 1.15rem; }
  .topic-foot { border-top: 1px solid var(--rule); padding: 28px; color: var(--ink-soft); font-size: 0.95rem; }
  .topic-foot .meta { margin-bottom: 0.3rem; }
  @media (max-width: 420px) {
    .site-header-inner, main, .topic-foot { padding-left: 16px; padding-right: 16px; }
    pre, code { max-width: 100%; }
    pre { overflow-x: auto; white-space: pre-wrap; overflow-wrap: anywhere; }
  }
`;

export function loadTopics(contentDir = TOPICS_CONTENT_DIR) {
  if (!fs.existsSync(contentDir)) return [];
  const loaded = [];
  for (const entry of fs.readdirSync(contentDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const church = CHURCHES.find((candidate) => candidate.slug === entry.name);
    if (!church) {
      throw new Error(
        `Topic folder _src/topics/${entry.name} does not match a slug in churches.js`
      );
    }
    const dir = path.join(contentDir, entry.name);
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".html")) continue;
      const slug = file.slice(0, -".html".length);
      const html = fs.readFileSync(path.join(dir, file), "utf8");
      loaded.push(extractTopic(html, slug, church));
    }
  }
  return loaded;
}

export function extractTopic(html, slug, church) {
  const title = decode(tagText(html, "title") || slug);
  const description = decode(attr(html, "description") || "");
  const articleAt = html.search(/<article\b/i);
  const footerAt = html.search(/<footer\b/i);
  let body = "";
  if (articleAt >= 0) {
    const end = footerAt > articleAt ? footerAt : html.length;
    body = html.slice(articleAt, end).trim();
  }
  body = body.replace(/<style[\s\S]*?<\/style>/gi, "");
  body = emphasizeOutsideTags(body);
  const footerMatch = html.match(/<footer\b[\s\S]*?<\/footer>/i);
  const h1 = decode(tagText(body, "h1") || title);
  return { slug, church, title, description, h1, body, footer: footerMatch ? footerMatch[0] : "" };
}

export function renderTopicPage(topic) {
  const urlPath = `${publicTopicsPath(topic.church)}${topic.slug}/`;
  const canonical = `${SITE_ORIGIN}${urlPath}`;
  const indexPath = publicTopicsPath(topic.church);
  return pageShell({
    title: topic.title,
    description: topic.description,
    canonical,
    church: topic.church,
    current: "",
    breadcrumb: `${crumb(topic.church, indexPath)} · ${escapeHtml(topic.h1)}`,
    main: topic.body,
    footer: topic.footer,
  });
}

export function renderTopicsIndex(church, topics) {
  const urlPath = publicTopicsPath(church);
  const canonical = `${SITE_ORIGIN}${urlPath}`;
  const items = [...topics]
    .sort((a, b) => a.h1.localeCompare(b.h1))
    .map(
      (topic) => `<li>
      <a href="${escapeHtml(`${urlPath}${topic.slug}/`)}">${escapeHtml(topic.h1)}</a>
      <p class="meta">${escapeHtml(topic.description)}</p>
    </li>`
    )
    .join("\n");
  const main = `<h1>Topics</h1>
    <p class="subtitle">What ${escapeHtml(church.name)} has preached, gathered by subject.</p>
    <ul class="topic-list">
      ${items}
    </ul>`;
  return pageShell({
    title: `Topics — ${church.name} · Sermon Steward`,
    description: `Topics preached at ${church.name}.`,
    canonical,
    church,
    current: "topics",
    breadcrumb: crumb(church, urlPath, true),
    main,
    footer: "",
  });
}

function pageShell({ title, description, canonical, church, current, breadcrumb, main, footer }) {
  const topicsHref = publicTopicsPath(church);
  const topicsCurrent = current === "topics" ? ' aria-current="page"' : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${SITE_ORIGIN}/og-sermon-steward-a.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${PAGE_CSS}</style>
</head>
<body>
<header class="site-header">
  <div class="site-header-inner">
    <a class="wordmark" href="/">Sermon Steward<span class="dot">.</span></a>
    <nav class="site-nav">
      <a href="${escapeHtml(church.sermonsPath)}">Sermons</a>
      <a href="${escapeHtml(topicsHref)}"${topicsCurrent}>Topics</a>
    </nav>
  </div>
</header>
<main>
  <div class="breadcrumb">${breadcrumb}</div>
  ${main}
</main>
${footer ? `<div class="topic-foot">${footer}</div>` : ""}
</body>
</html>
`;
}

function crumb(church, topicsHref, here) {
  const tail = here ? "Topics" : `<a href="${escapeHtml(topicsHref)}">Topics</a>`;
  return `<a href="/">Sermon Steward</a> · <a href="${escapeHtml(church.sermonsPath)}">${escapeHtml(church.name)}</a> · ${tail}`;
}

// Point sermon-page and sermon-list Topics links at the public topics index.
// Safe to run on every build: a second pass does not add a second link.
export function injectTopicsNav(html, topicsHref) {
  if (html.includes(`href="${topicsHref}"`)) return html;
  let out = html;
  out = out.replace(
    /(<nav class="site-nav\b[^>]*>)([\s\S]*?)(<\/nav>)/i,
    (full, open, inner, close) => {
      if (inner.includes(">Topics</a>") || inner.includes(`href="${topicsHref}"`)) return full;
      const sermons = inner.match(/<a href="[^"]*\/sermons[^"]*">Sermons<\/a>/i);
      if (!sermons) return full;
      return `${open}${inner.replace(sermons[0], `${sermons[0]}\n      <a href="${topicsHref}">Topics</a>`)}${close}`;
    }
  );
  if (out.includes('class="browse-by"') && !out.includes(">Topics</a>")) {
    out = out.replace(
      /(<div class="browse-by">[\s\S]*?)(<\/div>)/,
      `$1<a href="${topicsHref}">Topics</a>$2`
    );
  }
  return out;
}

export function renderTopics(outputDir, contentDir = TOPICS_CONTENT_DIR) {
  const topics = loadTopics(contentDir);
  const byChurch = new Map();
  for (const topic of topics) {
    const list = byChurch.get(topic.church.slug) || [];
    list.push(topic);
    byChurch.set(topic.church.slug, list);
  }

  for (const church of CHURCHES) {
    const list = byChurch.get(church.slug) || [];
    const topicsHref = publicTopicsPath(church);
    if (list.length > 0) {
      const dir = outputPath(outputDir, topicsHref);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), renderTopicsIndex(church, list));
      for (const topic of list) {
        const topicDir = outputPath(outputDir, `${topicsHref}${topic.slug}/`);
        fs.mkdirSync(topicDir, { recursive: true });
        fs.writeFileSync(path.join(topicDir, "index.html"), renderTopicPage(topic));
      }
    }
    const churchDir = path.join(outputDir, church.slug);
    if (!fs.existsSync(churchDir) || list.length === 0) continue;
    for (const file of walkHtml(churchDir)) {
      const original = fs.readFileSync(file, "utf8");
      const next = injectTopicsNav(original, topicsHref);
      if (next !== original) fs.writeFileSync(file, next);
    }
  }
  return topics.length;
}

function outputPath(outputDir, urlPath) {
  return path.join(outputDir, ...urlPath.split("/").filter(Boolean));
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

function tagText(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}

function attr(html, name) {
  const match = html.match(
    new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, "i")
  );
  return match ? match[1] : "";
}

function decode(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const count = renderTopics(root);
  console.log(`topics: rendered ${count} topic page(s) under ${root}`);
}
