// Cross of Grace Church (El Paso, TX): fs-free path lists, shared by churches.js
// (sitemap) and scripts/cog-cleanup.js (build). See cog-cleanup.js.
export const COG_ROOT = "/CoGElPaso";
export const COG_SERMONS = `${COG_ROOT}/sermons`;
export const COG_CITY = "El Paso, TX";

// Undated slug -> dated twin slug (same title, same preacher).
export const COG_UNDATED_REDIRECTS = {
  "authority-revealed": "authority-revealed-2021-09-05",
  "between-a-rock-and-hard-place": "between-a-rock-and-hard-place-2023-06-25",
  "camels-and-needles-and-rich-men-oh-my": "camels-and-needles-and-rich-men-oh-my-2021-06-27",
  "carry-the-fire-week-6": "carry-the-fire-week-6-2025-07-16",
  "carry-the-fire-week-7": "carry-the-fire-week-7-2025-07-23",
  "concerning-the-affections-and-matters-of-the-heart": "concerning-the-affections-and-matters-of-the-heart-2024-11-24",
  "daniel-and-the-lions-den": "daniel-and-the-lion-s-den-2024-11-03",
  "daniel-and-the-lions-dens": "daniel-and-the-lion-s-den-2024-11-03",
  "forgiven-much": "forgiven-much-2021-08-29",
  "generosity-beyond-the-bounds-of-reciprocity": "generosity-beyond-the-bounds-of-reciprocity-2021-12-05",
  "god-s-unyielding-work": "god-s-unyielding-work-2022-08-07",
  "gospel-to-the-jews-and-the-gentiles": "gospel-to-the-jews-and-the-gentiles-2022-10-30",
  "honor-and-obedience-whatever-the-cost": "honor-and-obedience-whatever-the-cost-2024-10-13",
  "jesus-heals-blind-bartimaeus": "jesus-heals-blind-bartimaeus-2021-07-18",
  "jesus-is-in-command": "jesus-is-in-command-2021-11-14",
  "paul-and-barnabas-at-lystra": "paul-and-barnabas-at-lystra-2023-07-02",
  "the-father-s-love": "the-father-s-love-2025-08-03",
  "the-work-of-the-holy-spirit": "the-work-of-the-holy-spirit-2023-04-16",
};

// Undated with no dated twin: reachable by direct link, noindex, unlisted.
export const COG_UNDATED_DELISTED = [
  "carry-the-fire-week-4",
  "loving-and-serving-with-the-end-in-view",
];

function slugOfPath(urlPath) {
  const p = String(urlPath).replace(/\/index$/, "").replace(/\.html$/, "").replace(/\/$/, "");
  const prefix = `${COG_SERMONS}/`.toLowerCase();
  if (!p.toLowerCase().startsWith(prefix)) return null;
  const rest = p.slice(prefix.length);
  return rest.includes("/") ? null : rest;
}

export function isCogHiddenPath(urlPath) {
  const slug = slugOfPath(urlPath);
  return !!slug && (slug in COG_UNDATED_REDIRECTS || COG_UNDATED_DELISTED.includes(slug));
}

