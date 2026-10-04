import test from "node:test";
import assert from "node:assert/strict";
import {
  CHURCHES,
  headersDocument,
  includeInSitemap,
  injectRobotsMeta,
  isDelistedLegacyPath,
  isDelistedProductPath,
  matchChurchRoute,
  publicChurchPath,
  publicTopicsPath,
  rewriteLandingHrefs,
  stripDelistedProductLinks,
  urlPathForOutputFile,
} from "./churches.js";
import { PRICE_CARD, rewritePublicProductCopy } from "./site-publish.js";

const example = {
  slug: "ExampleTown",
  name: "Example Church",
  network: "other",
  sermonsPath: "/ExampleTown/sermons/",
};

test("public paths use the network prefix", () => {
  const providence = CHURCHES.find((church) => church.slug === "ProvidenceLenexa");
  const cog = CHURCHES.find((church) => church.slug === "CoGElPaso");
  assert.equal(publicChurchPath(providence), "/SGchurch/ProvidenceLenexa");
  assert.equal(publicChurchPath(cog), "/SGchurch/CoGElPaso");
  assert.equal(publicChurchPath(example), "/church/ExampleTown");
});

test("vanity URLs redirect to the sermon list, ignoring case and a trailing slash", () => {
  assert.deepEqual(matchChurchRoute("/SGchurch/ProvidenceLenexa"), {
    status: 302,
    location: "/ProvidenceLenexa/sermons/",
  });
  assert.deepEqual(matchChurchRoute("/SGchurch/ProvidenceLenexa/"), {
    status: 302,
    location: "/ProvidenceLenexa/sermons/",
  });
  assert.deepEqual(matchChurchRoute("/sgchurch/providencelenexa"), {
    status: 302,
    location: "/ProvidenceLenexa/sermons/",
  });
  assert.deepEqual(matchChurchRoute("/SGCHURCH/CoGElPaso/"), {
    status: 302,
    location: "/CoGElPaso/sermons/",
  });
  assert.deepEqual(matchChurchRoute("/church/ExampleTown/", [example, ...CHURCHES]), {
    status: 302,
    location: "/ExampleTown/sermons/",
  });
});

test("an SG slug on the non-SG prefix is not a match", () => {
  assert.deepEqual(matchChurchRoute("/church/ProvidenceLenexa"), { status: 404 });
  assert.deepEqual(matchChurchRoute("/SGchurch/ExampleTown", [example, ...CHURCHES]), {
    status: 404,
  });
});

test("deeper vanity paths and ordinary site paths are not church roots", () => {
  assert.deepEqual(matchChurchRoute("/SGchurch"), { status: 404 });
  assert.deepEqual(matchChurchRoute("/SGchurch/ProvidenceLenexa/sermons"), { status: 404 });
  assert.equal(matchChurchRoute("/ProvidenceLenexa/sermons/"), null);
  assert.equal(matchChurchRoute("/hall/"), null);
  assert.equal(matchChurchRoute("/"), null);
});

test("topic pages are served at the public church path", () => {
  assert.equal(publicTopicsPath(CHURCHES[0]), "/SGchurch/ProvidenceLenexa/topics/");
  assert.equal(publicTopicsPath(example), "/church/ExampleTown/topics/");
  assert.equal(matchChurchRoute("/SGchurch/ProvidenceLenexa/topics/"), null);
  assert.equal(matchChurchRoute("/SGchurch/ProvidenceLenexa/topics/suffering/"), null);
  assert.deepEqual(matchChurchRoute("/SGchurch/ProvidenceLenexa/topics"), {
    status: 302,
    location: "/SGchurch/ProvidenceLenexa/topics/",
  });
  assert.deepEqual(matchChurchRoute("/sgchurch/providencelenexa/topics/suffering"), {
    status: 302,
    location: "/SGchurch/ProvidenceLenexa/topics/suffering/",
  });
  assert.deepEqual(matchChurchRoute("/church/ExampleTown/topics/", [example, ...CHURCHES]), null);
  assert.equal(isDelistedLegacyPath("/SGchurch/ProvidenceLenexa/topics/suffering/"), false);
  assert.equal(includeInSitemap("/SGchurch/ProvidenceLenexa/topics/"), true);
  assert.equal(includeInSitemap("/SGchurch/ProvidenceLenexa/topics/suffering/"), true);
  assert.equal(isDelistedLegacyPath("/ProvidenceLenexa/topics/suffering/"), true);
});

test("legacy church pages are delisted and sermon pages are not", () => {
  assert.equal(isDelistedLegacyPath("/ProvidenceLenexa"), true);
  assert.equal(isDelistedLegacyPath("/ProvidenceLenexa/"), true);
  assert.equal(isDelistedLegacyPath("/ProvidenceLenexa/index.html"), true);
  assert.equal(isDelistedLegacyPath("/ProvidenceLenexa/doctrine/bibliology/"), true);
  assert.equal(isDelistedLegacyPath("/ProvidenceLenexa/topics/anxiety/index.html"), true);
  assert.equal(isDelistedLegacyPath("/CoGElPaso/series/revelation-of-jesus-christ/"), true);
  assert.equal(isDelistedLegacyPath("/ProvidenceLenexa/sermons"), false);
  assert.equal(isDelistedLegacyPath("/ProvidenceLenexa/sermons/"), false);
  assert.equal(isDelistedLegacyPath("/ProvidenceLenexa/sermons/index.html"), false);
  assert.equal(isDelistedLegacyPath("/ProvidenceLenexa/sermons/foo.html"), false);
  assert.equal(isDelistedLegacyPath("/CoGElPaso/sermons/page/2/"), false);
  assert.equal(isDelistedLegacyPath("/"), false);
  assert.equal(isDelistedLegacyPath("/hall/"), false);
});

test("sitemap keeps sermon archives and drops landings, admin, and pastors", () => {
  assert.equal(includeInSitemap("/ProvidenceLenexa/sermons/"), true);
  assert.equal(includeInSitemap("/CoGElPaso/sermons/who-am-i.html"), true);
  assert.equal(includeInSitemap("/"), true);
  assert.equal(includeInSitemap("/ProvidenceLenexa/"), false);
  assert.equal(includeInSitemap("/ProvidenceLenexa/doctrine/bibliology/"), false);
  assert.equal(includeInSitemap("/admin/"), false);
  assert.equal(includeInSitemap("/pastors/"), false);
});

test("output paths collapse index.html", () => {
  assert.equal(urlPathForOutputFile("index.html"), "/");
  assert.equal(urlPathForOutputFile("hall/index.html"), "/hall/");
  assert.equal(
    urlPathForOutputFile("ProvidenceLenexa/sermons/index.html"),
    "/ProvidenceLenexa/sermons/"
  );
  assert.equal(urlPathForOutputFile("samples.html"), "/samples.html");
});

test("noindex meta is inserted once", () => {
  const once = injectRobotsMeta("<head>\n<title>x</title></head>");
  assert.match(once, /<meta name="robots" content="noindex, follow">/);
  assert.equal(injectRobotsMeta(once), once);
});

test("Prep King and Coach paths are delisted and sermon lookalikes are not", () => {
  for (const path of [
    "/prep",
    "/prep/",
    "/prep/index.html",
    "/PREP/",
    "/prep-king/",
    "/prepking",
    "/prep.html",
    "/coach",
    "/coach/",
    "/Coach/index.html",
    "/coach/start/",
  ]) {
    assert.equal(isDelistedProductPath(path), true, path);
    assert.equal(includeInSitemap(path), false, path);
  }
  assert.equal(isDelistedProductPath("/preacher-spurgeon.html"), false);
  assert.equal(isDelistedProductPath("/preparation"), false);
  assert.equal(isDelistedProductPath("/ProvidenceLenexa/sermons/the-conscience-coach-an-introduction-2025-04-11"), false);
  assert.equal(isDelistedProductPath("/pastors/"), false);
  assert.equal(includeInSitemap("/how-it-works/"), true);
});

test("product pages get an exact noindex meta and header", () => {
  const html = injectRobotsMeta("<head>\n<title>Prep King</title></head>", "noindex");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(html, /noindex, follow/);
  const replaced = injectRobotsMeta(
    '<head><meta name="robots" content="index, follow"></head>',
    "noindex"
  );
  assert.match(replaced, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(replaced, /index, follow/);
  const headers = headersDocument();
  assert.match(headers, /\/prep\/\n {2}X-Robots-Tag: noindex\n/);
  assert.match(headers, /\/prep-king\/\n {2}X-Robots-Tag: noindex\n/);
  assert.match(headers, /\/coach\/\n {2}X-Robots-Tag: noindex\n/);
  assert.match(headers, /\/ProvidenceLenexa\n {2}X-Robots-Tag: noindex, follow\n/);
});

test("links to delisted products are removed and other links stay", () => {
  const html = [
    '<nav><a href="/">Home</a><a href="/prep/">Prep King</a><a href="/coach">Coach</a></nav>',
    '<a href="https://sermonsteward.com/prep-king/">Prep</a>',
    '<a href="/ProvidenceLenexa/sermons/the-conscience-coach-an-introduction-2025-04-11">The Conscience Coach</a>',
    '<a href="/hall/">Guildhall</a>',
  ].join("");
  const out = stripDelistedProductLinks(html);
  assert.doesNotMatch(out, /href="\/prep|href="\/coach"|prep-king/);
  assert.match(out, /href="\/">Home/);
  assert.match(out, /the-conscience-coach/);
  assert.match(out, /href="\/hall\/"/);
});

test("retired price card copy is rewritten to Sermon Steward only", () => {
  const old =
    "Guildhall — free. Sermon Steward, Coach, Prep King — $30/month each; suite $75/month. Past-sermon ingest $100 per year of sermons. First month free, cancel anytime, no contract.";
  assert.equal(rewritePublicProductCopy(`<p>${old}</p>`), `<p>${PRICE_CARD}</p>`);
  assert.equal(rewritePublicProductCopy(`<p>${PRICE_CARD}</p>`), `<p>${PRICE_CARD}</p>`);
  assert.equal(PRICE_CARD, "Guildhall — free. Sermon Steward — $30/month. Past-sermon ingest $100 per year of sermons. First month free, cancel anytime, no contract.");
});

test("landing links move to the public URL and sermon links stay", () => {
  const html = [
    '<a href="/ProvidenceLenexa/">Home</a>',
    '<a href="/ProvidenceLenexa">Home</a>',
    '<a href="https://sermonsteward.com/CoGElPaso/">CoG</a>',
    '<a href="/ProvidenceLenexa/sermons/">list</a>',
    '<a href="/ProvidenceLenexa/sermons/foo">sermon</a>',
    '<a href="/CoGElPaso/topics">topics</a>',
  ].join("");
  const out = rewriteLandingHrefs(html);
  assert.match(out, /href="\/SGchurch\/ProvidenceLenexa">Home<\/a><a href="\/SGchurch\/ProvidenceLenexa">Home/);
  assert.match(out, /href="\/SGchurch\/CoGElPaso">CoG/);
  assert.match(out, /href="\/ProvidenceLenexa\/sermons\/">list/);
  assert.match(out, /href="\/ProvidenceLenexa\/sermons\/foo"/);
  assert.match(out, /href="\/CoGElPaso\/topics"/);
  const canonical =
    '<link rel="canonical" href="https://sermonsteward.com/CoGElPaso/">';
  assert.equal(rewriteLandingHrefs(canonical), canonical);
});

test("unlisted regional pages are served as assets, noindex, and kept out of the sitemap", async () => {
  const { isUnlistedPath } = await import("./churches.js");
  for (const p of ["/SGchurch/MidwestNorthwest", "/SGchurch/MidwestNorthwest/", "/sgchurch/midwestnorthwest/"]) {
    assert.deepEqual(matchChurchRoute(p), { status: 302, location: "/SGchurch/MidwestNorthwest/9-27-26/" });
  }
  for (const p of ["/SGchurch/MidwestNorthwest/how-we-said-it", "/SGchurch/MidwestNorthwest/how-we-said-it/", "/SGchurch/MidwestNorthwest/quotes", "/SGchurch/MidwestNorthwest/quotes/", "/SGchurch/MidwestNorthwest/quotes/index.html"]) {
    assert.deepEqual(matchChurchRoute(p), { status: 302, location: "/SGchurch/MidwestNorthwest/how-we-said-it/9-27-26/" });
  }
  assert.deepEqual(matchChurchRoute("/SGchurch/MidwestNorthwest/gimme-da-quotes"), { status: 302, location: "/SGchurch/MidwestNorthwest/gimme-da-quotes/9-27-26/" });
  assert.equal(matchChurchRoute("/SGchurch/MidwestNorthwest/9-27-26/"), null);
  assert.equal(matchChurchRoute("/SGchurch/MidwestNorthwest/how-we-said-it/9-27-26"), null);
  assert.equal(matchChurchRoute("/SGchurch/MidwestNorthwest/gimme-da-quotes/9-27-26/"), null);
  assert.equal(includeInSitemap("/SGchurch/MidwestNorthwest/gimme-da-quotes/9-27-26/"), false);
  // Sep 27 church pages moved to /SGchurch/<ChurchCity>/: old URLs 301 there.
  assert.deepEqual(matchChurchRoute("/SGchurch/MidwestNorthwest/CLFRoseburg/sermons/x.html"), { status: 301, location: "/SGchurch/CovenantLifeRoseburg/sermons/x.html" });
  assert.deepEqual(matchChurchRoute("/sgchurch/midwestnorthwest/centerchurchstar/sermons/the-justice-of-god-2026-09-27.html"), { status: 301, location: "/SGchurch/CenterChurchStar/sermons/the-justice-of-god-2026-09-27.html" });
  assert.deepEqual(matchChurchRoute("/SGchurch/MidwestNorthwest/GraceLifeHastings"), { status: 301, location: "/SGchurch/GraceLifeHastings/" });
  assert.equal(isUnlistedPath("/sgchurch/midwestnorthwest"), true);
  assert.equal(includeInSitemap("/SGchurch/MidwestNorthwest/"), false);
  assert.equal(includeInSitemap("/SGchurch/MidwestNorthwest/CLFRoseburg/where-is-your-trust-2026-09-27.html"), false);
  assert.match(headersDocument(), /\/SGchurch\/MidwestNorthwest\/\*\n  X-Robots-Tag: noindex, nofollow/);
  // Regional church pages are unlisted assets at /SGchurch/<ChurchCity>/.
  for (const d of ["CrossOfGraceChaska", "CornerstoneBurnsville", "EmmausRoadSiouxFalls", "GraceLifeHastings", "CovenantLifeRoseburg", "EmmausRoadBozeman", "CenterChurchStar"]) {
    assert.equal(matchChurchRoute(`/SGchurch/${d}/`), null);
    assert.equal(matchChurchRoute(`/SGchurch/${d}/sermons/a-2026-10-04.html`), null);
    assert.equal(isUnlistedPath(`/SGchurch/${d}/sermons/a-2026-10-04.html`), true);
    assert.equal(includeInSitemap(`/SGchurch/${d}/`), false);
    assert.match(headersDocument(), new RegExp(`/SGchurch/${d}/\\*\n  X-Robots-Tag: noindex, nofollow`));
  }
  // Providence keeps its vanity redirect.
  assert.deepEqual(matchChurchRoute("/SGchurch/ProvidenceLenexa"), { status: 302, location: "/ProvidenceLenexa/sermons/" });
  // Other unknown SGchurch paths still 404.
  assert.deepEqual(matchChurchRoute("/SGchurch/Nowhere"), { status: 404 });
});
