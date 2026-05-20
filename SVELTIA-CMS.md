# Sermon Steward — Sveltia CMS Notes

How non-technical team members edit copy on sermonsteward.com without touching HTML, git, or deploys.

---

## For editors (the quick how-to you can send to a teammate)

1. Go to **https://sermonsteward.com/admin/**
2. Click **Sign in with GitHub**. Authorize "Sermon Steward CMS" the first time only.
3. You'll see a list of pages on the left. Click one (e.g. "Landing page").
4. Edit the form fields. Every field has a short hint underneath telling you what it controls.
5. Click **Save**.
6. Your change goes live on sermonsteward.com in about **60 seconds**.

**Important caveats for editors:**

- There is no "draft" or "preview" step. Save = live in a minute. Double-check spelling.
- Hard-refresh the live page (Cmd-Shift-R on Mac, Ctrl-Shift-R on Windows) if you don't see your change after 90 seconds — it's almost always browser cache.
- You can't undo by clicking back — but the previous version is in GitHub history, so Chris can always restore.
- If a field's "link" value is something like `product.html`, that's a filename, not a URL. Don't paste `https://...` unless you really want to link to an external site.

---

## Architecture — what each piece does

```
sermon-steward/
├── _src/
│   ├── _data/
│   │   └── index.json         ← The editable copy lives here. Sveltia writes to this file.
│   └── index.njk              ← Template (HTML + CSS + placeholders). Editors never touch.
├── admin/
│   ├── index.html             ← Loads the Sveltia editor UI from a CDN.
│   └── config.yml             ← Defines what fields editors see and which file they map to.
├── _site/                     ← Build output. Gitignored. Cloudflare serves this directory.
├── eleventy.config.js         ← Eleventy build config (input/output dirs, passthroughs).
├── wrangler.jsonc             ← Tells Cloudflare to serve _site/ as static assets.
├── package.json               ← npm dependencies (just @11ty/eleventy).
└── (existing root .html files — passed through to _site/ unchanged until refactored)
```

The CMS data file (`_src/_data/index.json`) is the **single source of truth** for the landing page's copy. The template (`_src/index.njk`) is just HTML + CSS with `{{ index.tag }}`-style placeholders.

## The deploy flow

```
Editor edits in Sveltia
   ↓
Sveltia commits JSON change to GitHub (main branch)
   ↓
Cloudflare Pages auto-detects the push
   ↓
Cloudflare runs: npm install && npx @11ty/eleventy
   ↓
Eleventy reads JSON + template → writes _site/index.html
   ↓
Cloudflare deploys _site/ via `npx wrangler deploy`
   ↓
Live on sermonsteward.com (~60 seconds total)
```

The bot commits from `weekly_ingest.py` use this same path — they push new sermon HTML into `CoGElPaso/` or `ProvidenceLenexa/`, which get passthrough-copied into `_site/` unchanged.

## Local development

To preview changes before pushing:

```bash
cd /Users/dad/shepherds-guild/sermon-steward
npm install        # first time only
npm run dev        # starts a local server at http://localhost:8080
```

Edit `_src/_data/index.json` directly and the browser auto-refreshes.

## Adding a new editable page (the scaling pattern)

For each page you want to make editable, three changes:

1. **Extract copy into JSON.** Create `_src/_data/<pagename>.json` with the editable strings (titles, headlines, paragraphs, button labels, links).
2. **Convert the HTML to a template.** Move `<pagename>.html` to `_src/<pagename>.njk` and replace the editable strings with `{{ <pagename>.field_name }}` placeholders. Keep all the CSS and structure as-is.
3. **Add a Sveltia entry.** In `admin/config.yml`, add a new `files:` entry under the `pages` collection pointing at the new JSON file with field definitions matching the JSON keys.

After commit + push, the new page shows up in Sveltia automatically.

For batch refactors (e.g. the 12 preacher-*.html pages), the pattern collapses into a **collection** instead of individual file entries — one template + a folder of data files. We'll set that up when we get there.

## OAuth & secrets — where credentials live

- **OAuth Worker:** `https://sveltia-cms-auth.chris-386.workers.dev`
  - GitHub repo: `coswald75/sveltia-cms-auth`
  - Cloudflare project: `sveltia-cms-auth` (separate from `sermon-steward`)
  - Worker secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Plaintext variable: `ALLOWED_DOMAINS=sermonsteward.com,localhost`
- **GitHub OAuth App:** "Sermon Steward CMS" under coswald75's personal Developer Settings → OAuth Apps
  - Callback URL: `https://sveltia-cms-auth.chris-386.workers.dev/callback`
  - Client ID is public (visible in the OAuth App page); Client Secret is only retrievable at creation time

**To rotate the client secret** (e.g. if it leaks):
1. GitHub → OAuth App → "Generate a new client secret" → copy the new value
2. Cloudflare → `sveltia-cms-auth` Worker → Settings → Variables and Secrets → edit `GITHUB_CLIENT_SECRET` → paste new value → save
3. Delete the old secret on the GitHub page

No code changes needed. The Worker auto-redeploys on secret save.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Editor clicks "Sign in with GitHub" and gets a 404 | Callback URL mismatch | Check GitHub OAuth App callback URL matches `https://sveltia-cms-auth.chris-386.workers.dev/callback` exactly |
| Editor signs in but sees "Repo not found" | Wrong repo in admin/config.yml | Confirm `repo: coswald75/sermon-steward` |
| Editor saves but live site doesn't update | Cloudflare build failed | Check Cloudflare → `sermon-steward` → Deployments → click the failing build → read the log |
| Build log shows `Cannot find module '@11ty/eleventy'` | Missing build command | Cloudflare → `sermon-steward` → Settings → Build config → ensure command is `npm install && npx @11ty/eleventy` |
| Build succeeds but page is blank | Wrangler pointing at wrong dir | Confirm `wrangler.jsonc` has `"directory": "_site"` |
| `npm run dev` errors locally | Stale node_modules | `rm -rf node_modules package-lock.json && npm install` |

## What's intentionally NOT here

- No draft/review workflow (uses `publish_mode: simple` — saves go straight to main). Switch to `editorial_workflow` later if needed.
- No image editing exposed in the CMS. `media_folder: "images"` is a placeholder.
- No role-based permissions. Anyone with write access to the GitHub repo can edit. To add editors without giving them code-level access, invite them as GitHub collaborators with **Triage** or **Write** permission on `coswald75/sermon-steward` only.
