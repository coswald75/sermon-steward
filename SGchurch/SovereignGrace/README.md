# Sovereign Grace dashboard (unlisted)

Copy of the Midwest/Northwest regional dashboard, widened to include
**Cross of Grace Church (El Paso, TX)** — Ricky Alcantar — alongside the eight
Sovereign Grace Midwest/Northwest churches.

- Live URL (after deploy): `/SGchurch/SovereignGrace/` → latest week (`9-27-26` sample)
- Also: `/how-we-said-it/<M-D-YY>/`, `/gimme-da-quotes/<M-D-YY>/`
- noindex, not in sitemap, not linked from the public homepage (same as MWNW)
- MWNW dashboard at `/SGchurch/MidwestNorthwest/` is unchanged

Ricky’s sermon pages stay at `/CoGElPaso/sermons/…` (already public on Sermon Steward).
This folder is only the shared weekly dashboard.

Week data: `scripts/sg-region/weeks/*-sovereigngrace.json` (or any week JSON whose
`region` is `/SGchurch/SovereignGrace`). Rebuild with `node scripts/sg-region/build.mjs`.
