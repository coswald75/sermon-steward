import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyStripeLinks, checkLinks, PAGES } from "./stripe-links.js";

const TEST = { hosting: "https://buy.stripe.com/test_aaa", archive: "https://buy.stripe.com/test_bbb" };
const LIVE = { hosting: "https://buy.stripe.com/aaa", archive: "https://buy.stripe.com/bbb" };
const PAGE =
  '<body><!--STRIPE_TEST_BANNER--><a href="{{STRIPE_HOSTING_URL}}">a</a><a href="{{STRIPE_ARCHIVE_URL}}">b</a></body>';

function outDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stripe-"));
  for (const name of PAGES) fs.writeFileSync(path.join(dir, name), PAGE);
  return dir;
}

test("test links stop the build unless ALLOW_STRIPE_TEST=1", () => {
  assert.throws(() => checkLinks(TEST, {}), /STRIPE TEST LINK FOUND/);
  assert.throws(() => checkLinks(TEST, { ALLOW_STRIPE_TEST: "0" }), /STRIPE TEST LINK FOUND/);
  assert.deepEqual(checkLinks(TEST, { ALLOW_STRIPE_TEST: "1" }), { testMode: true });
});

test("one test link among live links still stops the build", () => {
  assert.throws(() => checkLinks({ ...LIVE, archive: TEST.archive }, {}), /STRIPE TEST LINK FOUND/);
});

test("live links pass with no variable", () => {
  assert.deepEqual(checkLinks(LIVE, {}), { testMode: false });
});

test("a link that is not a Stripe Payment Link is rejected", () => {
  assert.throws(() => checkLinks({ ...LIVE, hosting: "https://example.com/x" }, {}), /buy\.stripe\.com/);
});

test("live build fills both pages and adds no banner", () => {
  const dir = outDir();
  applyStripeLinks(dir, { links: LIVE, env: {} });
  for (const name of PAGES) {
    const html = fs.readFileSync(path.join(dir, name), "utf8");
    assert.ok(html.includes(LIVE.hosting) && html.includes(LIVE.archive));
    assert.ok(!html.includes("{{") && !html.includes("TEST MODE") && !html.includes("STRIPE_TEST_BANNER"));
  }
});

test("test build fills both pages and shows the TEST MODE banner", () => {
  const dir = outDir();
  const warn = console.warn;
  console.warn = () => {};
  try {
    applyStripeLinks(dir, { links: TEST, env: { ALLOW_STRIPE_TEST: "1" } });
  } finally {
    console.warn = warn;
  }
  for (const name of PAGES) {
    const html = fs.readFileSync(path.join(dir, name), "utf8");
    assert.ok(html.includes(TEST.hosting) && html.includes("TEST MODE") && html.includes("4242 4242 4242 4242"));
  }
});

test("a page missing a placeholder fails loudly", () => {
  const dir = outDir();
  fs.writeFileSync(path.join(dir, "index.html"), "<body>no links</body>");
  assert.throws(() => applyStripeLinks(dir, { links: LIVE, env: {} }), /has no/);
});
