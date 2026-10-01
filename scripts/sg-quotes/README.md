# Gimme da quotes! (SG Midwest/Northwest)

Builds the unlisted page `/SGchurch/MidwestNorthwest/quotes/` — ONE running page of quotable
lines, grouped by Sunday, newest week on top. Never make a separate page per week.

## Add next Sunday

1. Copy `weeks/2026-09-27.json` to `weeks/<YYYY-MM-DD>.json` (the new Sunday's date).
2. Set `"date"`, and for each sermon: `church`, `city`, `state`, `preacher`, `title`,
   `url` (site path of the sermon page), and `quotes`.
3. Each quote is `{ "text": "...", "anchor": "unit-12" }`. `anchor` is the id on the sermon
   page to jump to (`unit-N` = transcript segment N; use `"transcript"` if unknown). Add
   `"filler_removed": true` if you removed um/uh, and the page marks it with `*`.
   Text must be verbatim from the transcript — no paraphrasing.
4. Run `node scripts/sg-quotes/build-quotes.mjs`, then commit the JSON and the regenerated
   `SGchurch/MidwestNorthwest/quotes/index.html`.

The page stays noindex/out of the sitemap automatically because everything under
`/SGchurch/MidwestNorthwest` is in `UNLISTED_ROOTS` (churches.js).

Quote picking for 2026-09-27 was done with `/workspace/regional_offer/mw_quotes/extract.py`
on the ops box: Haiku proposes lines, code keeps only exact substrings of `sermons.raw_transcript`.
