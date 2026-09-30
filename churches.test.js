import test from "node:test";
import assert from "node:assert/strict";
import {
  CHURCHES,
  includeInSitemap,
  injectRobotsMeta,
  isDelistedLegacyPath,
  matchChurchRoute,
  publicChurchPath,
  publicTopicsPath,
  rewriteLandingHrefs,
  urlPathForOutputFile,
} from "./churches.js";

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
