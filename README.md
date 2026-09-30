# Sermon Steward

Marketing site for [sermonsteward.com](https://sermonsteward.com).

Static HTML, deployed as a Cloudflare Worker (`wrangler.jsonc` serves `_site/`).

## Pages

- `/` and `/product` (`product.html`) — product landing. Eleventy also copies `product.html` to `index.html`, so the site root and `/product` serve the same page. The price card is: Guildhall — free. Sermon Steward, Coach, Prep King — $30/month each; suite $75/month. Past-sermon ingest $100 per year of sermons. First month free, cancel anytime, no contract. Homepage calls to action go to [try.sermonsteward.com](https://try.sermonsteward.com) or `mailto:chris@sovgracekc.org`.
- `/hosting/` (`_src/hosting.njk`) — sermon-hosting pitch (an earlier homepage), using the same price card as the homepage
- Door art in `_src/img/`, all 2304×1296. `door-hero.png`, `door-empty.png`, `door-open.png`, and `door-open-cast.png` stay in the folder. The PNGs are large; WebP can wait.
- `samples.html` — gallery of customer samples and famous-preacher showcases
- `hall/` — Guild Hall index. Preacher profiles stay at `/preacher-*.html`. Archive analyses (sermon tables) are at `/hall/<slug>/`.
- `weekly-report.html` — sample weekly anatomy report (linked from samples). The Growing in Christ sample links to `/ProvidenceLenexa/sermons/growing-in-christ-2026-02-22`.

## Church URLs

Public links use a network prefix. The only map is `churches.js`.

- Sovereign Grace: `https://sermonsteward.com/SGchurch/<ChurchNameCity>`
- Not Sovereign Grace: `https://sermonsteward.com/church/<ChurchNameCity>`

No non-SG church is wired up yet. To add one, append a row with `network: "other"` and a `slug` like `ChurchNameCity`. Another SG church is the same row with `network: "sg"`. The slug is the folder name. Eleventy passthrough-copies whatever slugs in that file already have a folder. `sermonsPath` is the sermon list the public URL currently sends people to.

For now the bare public URL (`/SGchurch/<ChurchNameCity>` or `/church/<ChurchNameCity>`) 302s to the sermon list (any casing, with or without a trailing slash). That redirect lives in `worker.js`, not in the church folder. The sermon ingest rewrites files inside `ProvidenceLenexa/` and `CoGElPaso/` and then runs Eleventy, so a folder of static redirect HTML would get wiped. The Worker reads `churches.js` on each request.

Topic pages are the exception. They are real, indexable pages at `/SGchurch/<ChurchNameCity>/topics/` and `/SGchurch/<ChurchNameCity>/topics/<slug>/` (a non-SG church uses `/church/` the same way). Drop one HTML file per topic in `_src/topics/<ChurchSlug>/`. The build pours that file into the site header and type, keeps footnote links (`#src-N`), and lists every file on the topics index. The canonical URL is the `/SGchurch/…` (or `/church/…`) path. Legacy copies under `/<ChurchSlug>/topics/` stay noindexed with the rest of the old church folder.

`/<ChurchNameCity>/` and everything under it except `/<ChurchNameCity>/sermons/` stays on the server for a later product. The Eleventy publish step (`site-publish.js`) marks those pages `noindex`, leaves them out of `sitemap.xml`, and repoints links to the bare church landing at `/SGchurch/...` or `/church/...`. Sermon pages are not noindexed.

## Deployment

Push to `main` builds with Eleventy and deploys the Cloudflare Worker (`wrangler.jsonc`, assets in `_site/`). The sermon ingest also runs that build and `wrangler deploy` after it commits new sermon HTML. There is no GitHub Actions workflow in this repo.

## TODO (v1 post-launch)

- Anonymize the byline on `weekly-report.html` if desired
- Add favicon
- Add `#preacher-*` profile pages (or repoint links once the bailey product is decided)
