# Sermon Steward

Marketing site for [sermonsteward.com](https://sermonsteward.com).

Static HTML, deployed to Cloudflare Pages.

## Pages

- `/` (`_src/index.njk`) — Guildhall door: a static picture of Steward, Coach, and Prep King at the open door, with Enter Hall.
- `/hosting/` (`_src/hosting.njk`) — $30 sermon-hosting pitch (the previous homepage)
- Door art in `_src/img/`, all 2304×1296. The homepage uses `door-open-cast.png` only. `door-hero.png`, `door-empty.png`, and `door-open.png` stay in the folder and are not on the page. The PNGs are large; WebP can wait.
- `product.html` — full product marketing page (how it works, surfaces, pricing, contact form)
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
