# Sovereign Grace Midwest/Northwest weekly pages

Every Sunday gets its own pages. The date slug, in M-D-YY form, is the last URL segment:

| Page | URL for Sep 27, 2026 |
|---|---|
| Dashboard | `/SGchurch/MidwestNorthwest/9-27-26/` |
| How We Said It (the preachers' own lines) | `/SGchurch/MidwestNorthwest/how-we-said-it/9-27-26/` |
| Gimme da quotes! (who they quoted) | `/SGchurch/MidwestNorthwest/gimme-da-quotes/9-27-26/` |

The bare URLs (`/SGchurch/MidwestNorthwest/`, `/how-we-said-it/`, `/gimme-da-quotes/`, and the
old `/quotes/`) 302 to the latest week. With or without the trailing slash, any casing. The Worker does
this (`matchRegionWeekRedirect` in `churches.js`) from `regional-weeks.js`, which `build.mjs`
generates. Everything under `/SGchurch/MidwestNorthwest` is noindex and kept out of the sitemap
(`UNLISTED_ROOTS` in `churches.js`).

## Add next week (e.g. Sunday Oct 4, 2026 → `10-4-26`)

1. **Process the sermons** on the ops box (`/workspace/regional_offer/mw_dashboard/`: process,
   metrics, render) so each church has its new sermon page under
   `SGchurch/MidwestNorthwest/<Church>/sermons/`.
2. **Dashboard.** Create `SGchurch/MidwestNorthwest/10-4-26/index.html`. Start from the previous
   week's page (or `build_dashboard.py` output) and keep the three marker pairs:
   `<!-- region:weeknav --><!-- /region:weeknav -->`,
   `<!-- region:hwsi-tile --><!-- /region:hwsi-tile -->` (first cell of the tile grid),
   `<!-- region:gdq-panel --><!-- /region:gdq-panel -->` (in the Scripture charts grid).
   Point that week's new sermon pages' "back to dashboard" links at `/SGchurch/MidwestNorthwest/10-4-26/`.
3. **Quotes data.** Copy `weeks/2026-09-27.json` to `weeks/2026-10-04.json` and fill in:
   - `date`, `feature` (the line shown on the tile), and per sermon: `church`, `city`, `state`,
     `short` (chart label), `preacher`, `title`, `url` (sermon page path).
   - `lines`: the preacher's own words. `{ "text", "anchor" }`, with `anchor` = `unit-N`
     (transcript segment id on the sermon page) or `"transcript"`. Optional `"filler_removed": true`
     marks the line with `*`.
   - `external`: lines he quoted from others. `{ "text", "author", "work", "attributed",
     "as_said", "excerpt", "anchor" }`. Set `author`/`work` ONLY if the preacher names them in the
     sermon. Otherwise `"attributed": false` and `as_said` = how he referred to it ("one
     commentator"). No Scripture. Use `[]` for "none this week".
   - Text must be verbatim from the transcript. The picking scripts live on the ops box:
     `/workspace/regional_offer/mw_quotes/extract.py` (own lines) and `external.py` (quotations:
     pipeline `quotations` rows + transcript scan, exact-substring verified).
4. **Build.** Run `node scripts/sg-region/build.mjs`. It writes the two new weekly pages, fills the
   tile, panel, and prev/next links on every dashboard, adds "Previous week" to 10-4-26 and "Next week"
   to 9-27-26, and rewrites `regional-weeks.js` so the bare URLs now go to 10-4-26.
5. `npm test`, `npx @11ty/eleventy`, preview, commit.
