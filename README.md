# Sermon Steward

Marketing site for [sermonsteward.com](https://sermonsteward.com).

Static HTML, deployed as a Cloudflare Worker (`wrangler.jsonc` serves `_site/`).

## Pages

- `/` and `/product` (`product.html`) — product landing. Eleventy also copies `product.html` to `index.html`, so the site root and `/product` serve the same page. The price card is: Guildhall — free. Sermon Steward — $30/month. Past-sermon ingest $100 per year of sermons. First month free, cancel anytime, no contract. Sermon Steward is the only product for sale. `/prep/`, `/prep-king/`, `/prepking/`, and `/coach/` stay on disk, are marked noindex, and are left out of the sitemap. The main homepage buttons are Stripe Payment Links (see Stripe Payment Links below). The sample path stays: [try.sermonsteward.com](https://try.sermonsteward.com) or `mailto:chris@sovgracekc.org`.
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

## Stripe Payment Links (home page)

The two payment buttons on `/` read their URLs from one file, `stripe-links.json`:

- `hosting` — Sermon Steward, $30/month
- `archive` — past-sermon ingest, $100 per year of sermons (the buyer picks 1 to 10 in Stripe's checkout)

`product.html` holds the placeholders `{{STRIPE_HOSTING_URL}}` and `{{STRIPE_ARCHIVE_URL}}`; `scripts/stripe-links.js` fills them in `_site/index.html` and `_site/product.html` on every build.

**Test mode safeguard.** The links in the file today are Stripe TEST links (they contain `/test_`). While any link contains `/test_`, `npm run build` and `eleventy` stop with an error unless `ALLOW_STRIPE_TEST=1` is set, so test links cannot be deployed by accident (the deploy workflow does not set it). With the variable set, the page shows a TEST MODE banner.

- Preview with test cards (local only): `npm install`, then `npm run dev` and open the address it prints. Pay with card `4242 4242 4242 4242`, any future expiry, any CVC.
- Go live: replace both values in `stripe-links.json` with the live Payment Links (no `test_` in them). Nothing else changes.

## TODO (v1 post-launch)

- Anonymize the byline on `weekly-report.html` if desired
- Add favicon
- Add `#preacher-*` profile pages (or repoint links once the bailey product is decided)
