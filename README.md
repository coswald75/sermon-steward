# Sermon Steward

Marketing site for [sermonsteward.com](https://sermonsteward.com).

Static HTML, deployed to Cloudflare Pages.

## Pages

- `/` and `/product` (`product.html`) — product landing. Eleventy also copies `product.html` to `index.html`, so the site root and `/product` serve the same page. Pricing on that page is $30 a month, cancel anytime.
- `/hosting/` (`_src/hosting.njk`) — $30 sermon-hosting pitch (an earlier homepage)
- Door art in `_src/img/`, all 2304×1296. `door-hero.png`, `door-empty.png`, `door-open.png`, and `door-open-cast.png` stay in the folder. The PNGs are large; WebP can wait.
- `samples.html` — gallery of customer samples and famous-preacher showcases
- `hall/` — Guild Hall index. Preacher profiles stay at `/preacher-*.html`. Archive analyses (sermon tables) are at `/hall/<slug>/`.
- `growing-in-christ.html` — sample sermon page (linked from samples)
- `weekly-report.html` — sample weekly anatomy report (linked from samples)

## Deployment

Push to `main` → Cloudflare Pages auto-deploys.

## TODO (v1 post-launch)

- Wire contact form to Supabase `sermon_steward_leads` table (currently `action="#"`, non-functional)
- Anonymize byline on `growing-in-christ.html` and `weekly-report.html` if desired
- Add favicon
- Add `#preacher-*` profile pages (or repoint links once the bailey product is decided)
