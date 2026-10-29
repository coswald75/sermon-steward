import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyStripeLinks, checkLinks, PAGES } from "./stripe-links.js";

const TEST = { hosting: "https://buy.stripe.com/test_aaa", archive: "https://buy.stripe.com/test_bbb" };
const LIVE = { hosting: "https://buy.stripe.com/aaa", archive: "https://buy.stripe.com/bbb" };
const PAGE =
  '<body><a href="{{STRIPE_HOSTING_URL}}">a</a><a href="{{STRIPE_ARCHIVE_URL}}">b</a></body>';

function outDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stripe-"));
  for (const name of PAGES) fs.writeFileSync(path.join(dir, name), PAGE);
  return dir;
}

test("test links stop the build", () => {
  assert.throws(() => checkLinks(TEST), /STRIPE TEST LINK FOUND/);
});

test("one test link among live links still stops the build", () => {
  assert.throws(() => checkLinks({ ...LIVE, archive: TEST.archive }), /STRIPE TEST LINK FOUND/);
});

test("live links pass with no variable", () => {
  assert.doesNotThrow(() => checkLinks(LIVE));
});

test("a link that is not a Stripe Payment Link is rejected", () => {
  assert.throws(() => checkLinks({ ...LIVE, hosting: "https://example.com/x" }), /buy\.stripe\.com/);
});

test("live build fills both pages", () => {
  const dir = outDir();
  applyStripeLinks(dir, { links: LIVE });
  for (const name of PAGES) {
    const html = fs.readFileSync(path.join(dir, name), "utf8");
    assert.ok(html.includes(LIVE.hosting) && html.includes(LIVE.archive));
    assert.ok(!html.includes("{{"));
  }
});

test("a page missing a placeholder fails loudly", () => {
  const dir = outDir();
  fs.writeFileSync(path.join(dir, "index.html"), "<body>no links</body>");
  assert.throws(() => applyStripeLinks(dir, { links: LIVE }), /has no/);
});
