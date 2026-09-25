# Sermon Steward

Marketing site for [sermonsteward.com](https://sermonsteward.com).

Static HTML, deployed to Cloudflare Pages.

## Pages

- `/` (`_src/index.njk`) — founder letter. A centered closed door (`door-hero.png`: Steward, Coach, and Prep King at the Guildhall door) and four links: Hall, Steward, Coach, Prep King. Static. No hover, no peek.
- `/steward/` — local-church pitch, with a handful of real sermons from `/ProvidenceLenexa/sermons/`.
- `/coach/` — one-to-one manuscript feedback. Interest by email. No upload form.
- `/prep-king/` — Prep King pitch and a brief player. Demo audio is not in the repo yet, so the player and transcript are an empty shell. The earlier access page remains at `/prep/`.
- `/hosting/` (`_src/hosting.njk`) — $30 sermon-hosting pitch (a previous homepage)
- Door art in `_src/img/`, all 2304×1296. Home uses `door-hero.png` only. `door-empty.png` is the closed door without the cast. `door-open-cast.png` and `door-open.png` are the open pair, kept in `img/` and not used on the homepage. The PNGs are large; WebP can wait.
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
