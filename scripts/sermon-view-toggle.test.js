import test from "node:test";
import assert from "node:assert/strict";
import { addSermonViewToggle } from "./sermon-view-toggle.js";

const M = (n) => `<!-- ═══════════ ${n} ═══════════ -->`;
const page = `<html><head><title>t</title></head><body><main><article class="sermon">
${M("Sermon hero")}<h1>T</h1>
${M("Thesis")}<blockquote>thesis</blockquote>
${M("Facts strip")}<div class="facts-strip">facts</div>
${M("Sermon outline")}<section>outline</section>
${M("Transcript")}<section id="transcript">words</section>
${M("Sermon arc")}<section>arc</section>
${M("Related teaching")}
${M("Discuss / apply")}<section><div id="artifact-small-group">q</div></section>
${M("About the church")}<section>about</section>
</article></main></body></html>`;

test("wraps people and preacher views, people first and checked by default", () => {
  const out = addSermonViewToggle(page);
  assert.match(out, /id="ss-view-people" class="ss-view-radio" checked/);
  const people = out.indexOf('class="ss-view ss-view-people"');
  const preacher = out.indexOf('class="ss-view ss-view-preacher"');
  assert.ok(people > 0 && preacher > people);
  assert.ok(out.indexOf("artifact-small-group") > people && out.indexOf("artifact-small-group") < preacher);
  assert.ok(out.indexOf('id="transcript"') > preacher);
  assert.ok(out.indexOf("about</section>") > preacher);
  for (const s of ["thesis", "facts", "outline", "words", "arc", "about"]) assert.ok(out.includes(s));
  assert.match(out, /id="ss-view-style"/);
  assert.match(out, /id="ss-view-script"/);
});

test("idempotent and leaves non-sermon pages alone", () => {
  const once = addSermonViewToggle(page);
  assert.equal(addSermonViewToggle(once), once);
  assert.equal(addSermonViewToggle("<html><body>index</body></html>"), "<html><body>index</body></html>");
});
