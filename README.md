# Sermon Steward

Marketing site for [sermonsteward.com](https://sermonsteward.com).

Static HTML, deployed to Cloudflare Pages.

## Pages

- `index.html` — landing splash with two CTAs
- `product.html` — full product marketing page (how it works, surfaces, pricing, contact form)
- `samples.html` — gallery of customer samples and famous-preacher showcases
- `growing-in-christ.html` — sample sermon page (linked from samples)
- `weekly-report.html` — sample weekly anatomy report (linked from samples)

## Deployment

Push to `main` → Cloudflare Pages auto-deploys.

## TODO (v1 post-launch)

- Wire contact form to Supabase `sermon_steward_leads` table (currently `action="#"`, non-functional)
- Anonymize byline on `growing-in-christ.html` and `weekly-report.html` if desired
- Add favicon
- Add `#preacher-*` profile pages (or repoint links once the bailey product is decided)
