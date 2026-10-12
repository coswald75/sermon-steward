import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import pr_guards as g  # noqa: E402

SCRIPTURE = """<p>{total} sermons across 59 books of the Bible</p>
<a href="/X/sermons/scripture/romans/"><span class="name">Romans</span><span class="n">{romans}</span></a>
<a href="/X/sermons/scripture/john/"><span class="name">John</span><span class="n">93</span></a>"""
DOCTRINE = """<a class="locus-card" href="/X/sermons/doctrine/soteriology/">
<div class="head"><span class="name">Soteriology</span><span class="n">{n} sermons</span></div></a>"""
ROOT = '<a href="sermons/a-2026-01-01.html">A</a><a href="sermons/b.html">B</a><a href="sermons/page/2">next</a>'


class FolderGuard(unittest.TestCase):
    def test_slug_from_branch_and_label(self):
        self.assertEqual(g.church_slug("church/CoGElPaso/oct-12", []), ("CoGElPaso", None))
        self.assertEqual(g.church_slug("fix", ["bug", "church:ProvidenceLenexa"]), ("ProvidenceLenexa", None))
        self.assertEqual(g.church_slug("ci/workflows", ["bug"]), (None, None))
        self.assertIsNotNone(g.church_slug("church/A/x", ["church:B"])[1])

    def test_violations(self):
        files = ["CoGElPaso/sermons/x.html", "SGchurch/CoGElPaso/index.html",
                 "_src/topics/CoGElPaso/grace.md", "worker.js", "CoGElPasoOld/x.html",
                 "SGchurch/CrossOfGraceChaska/index.html"]
        self.assertEqual(g.folder_violations("CoGElPaso", files),
                         ["worker.js", "CoGElPasoOld/x.html", "SGchurch/CrossOfGraceChaska/index.html"])


class Counts(unittest.TestCase):
    def test_html_counts(self):
        c = g.html_counts(SCRIPTURE.format(total=291, romans=81))
        self.assertEqual(c["entry:/X/sermons/scripture/romans/"], 81)
        self.assertEqual(c["text:# sermons across # books of the Bible"], 291)
        self.assertEqual(g.html_counts(DOCTRINE.format(n="1,173"))["entry:/X/sermons/doctrine/soteriology/"], 1173)
        self.assertEqual(g.html_counts(ROOT)["linked-sermons"], 2)

    def test_json_counts(self):
        c = g.json_counts('{"sermons": [{"t": 1}, {"t": 2}], "total": 2}')
        self.assertEqual(c, {"len:sermons": 2, "field:total": 2})

    def _run(self, base, head):
        rb, rh = (lambda p: base[p]), (lambda p: head[p])
        return g.count_regressions(list(base), list(head), rb, rh, {"X"})

    def test_regression_detected(self):
        p = "X/sermons/scripture/index.html"
        base = {p: SCRIPTURE.format(total=291, romans=205)}
        self.assertEqual(self._run(base, {p: SCRIPTURE.format(total=291, romans=205)}), [])
        self.assertEqual(self._run(base, {p: SCRIPTURE.format(total=300, romans=210)}), [])
        probs = self._run(base, {p: SCRIPTURE.format(total=291, romans=180)})
        self.assertEqual(len(probs), 1)
        self.assertIn("205 -> 180", probs[0])

    def test_removed_listing_and_missing_entry(self):
        p = "SGchurch/Y/index.html"
        self.assertEqual(len(self._run({p: ROOT}, {})), 1)
        q = "X/sermons/scripture/index.html"
        head = '<p>291 sermons across 59 books of the Bible</p>'
        self.assertTrue(any("missing" in m for m in self._run({q: SCRIPTURE.format(total=291, romans=1)}, {q: head})))

    def test_pages_and_non_church_ignored(self):
        self.assertFalse(g.is_browse_file("X/sermons/page/2/index.html"))
        self.assertTrue(g.is_browse_file("X/sermons/scripture/index.html"))
        self.assertEqual(g.church_roots(["hall/index.html", "X/index.html", "SGchurch/Y/index.html"], {"X"}),
                         {"X/", "SGchurch/Y/"})


if __name__ == "__main__":
    unittest.main()
