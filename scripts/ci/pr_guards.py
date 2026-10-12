#!/usr/bin/env python3
"""PR guards for sermon-steward (run by .github/workflows/guards.yml).

Two checks, both read straight from git so no extra checkout is needed:

  folder  If the PR branch is `church/<Slug>/...` or carries the label
          `church:<Slug>`, every changed file must live under one of that
          church's content prefixes:
              <Slug>/            (root church folder, e.g. ProvidenceLenexa/)
              SGchurch/<Slug>/   (Sovereign Grace pages)
              church/<Slug>/     (other-network pages)
              _src/topics/<Slug>/ (topic drop-ins)
          PRs with no church branch/label are not restricted.

  counts  For every church/collection folder, every browse listing
          (index.html outside /page/N/, and any *.json) is parsed into
          named sermon counts. Each count present on base must exist on head
          and must not be lower (e.g. "Romans 205" -> "Romans 180" fails).
          A browse file that disappears on head also fails.

Usage:
  python3 scripts/ci/pr_guards.py folder --base SHA --head SHA --branch NAME [--labels "a,b"]
  python3 scripts/ci/pr_guards.py counts --base SHA --head SHA
Tests: python3 -m unittest discover -s scripts/ci -p 'test_*.py'
"""
import argparse
import json
import re
import subprocess
import sys

PREFIX_TEMPLATES = ("{slug}/", "SGchurch/{slug}/", "church/{slug}/", "_src/topics/{slug}/")
# Parent folders whose direct subfolders are each a church/collection.
COLLECTION_PARENTS = ("SGchurch", "church", "SignificantSermons")


# ---------------------------------------------------------------- git helpers
def git(*args):
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def ls_files(rev):
    return [l for l in git("ls-tree", "-r", "--name-only", rev).splitlines() if l]


def show(rev, path):
    return git("show", f"{rev}:{path}")


def changed_files(base, head):
    out = git("diff", "--name-only", "--no-renames", f"{base}...{head}")
    return [l for l in out.splitlines() if l]


# ------------------------------------------------------------- folder guard
def church_slug(branch, labels):
    """Return (slug, error). slug None means no church restriction applies."""
    slugs = set()
    m = re.match(r"^church/([^/]+)/", branch or "")
    if m:
        slugs.add(m.group(1))
    for lab in labels:
        lab = lab.strip()
        if lab.lower().startswith("church:") and lab[7:].strip():
            slugs.add(lab[7:].strip())
    if len(slugs) > 1:
        return None, f"conflicting church slugs from branch/labels: {sorted(slugs)}"
    return (slugs.pop() if slugs else None), None


def church_prefixes(slug):
    return [t.format(slug=slug) for t in PREFIX_TEMPLATES]


def folder_violations(slug, files):
    prefixes = church_prefixes(slug)
    return [f for f in files if not any(f.startswith(p) for p in prefixes)]


# -------------------------------------------------------------- count guard
def church_roots(files, root_slugs):
    """Folders holding one church's/collection's content."""
    roots = set()
    for f in files:
        parts = f.split("/")
        if len(parts) >= 3 and parts[0] in COLLECTION_PARENTS:
            roots.add(f"{parts[0]}/{parts[1]}/")
        elif len(parts) >= 2 and parts[0] in root_slugs:
            roots.add(f"{parts[0]}/")
    return roots


def root_slugs_from_churches_js(text):
    return set(re.findall(r'slug:\s*["\']([^"\']+)["\']', text))


def is_browse_file(path):
    if re.search(r"/page/\d+/", path):
        return False
    return path.endswith("/index.html") or path.endswith(".json")


_TAG = re.compile(r"<[^>]+>")
_NAMED = re.compile(
    r'<a\b[^>]*href="([^"]+)"[^>]*>(?:(?!</a>).)*?class="n"[^>]*>\s*([\d,]+)(?:\s*sermons?)?\s*<',
    re.S | re.I)
_TOTAL = re.compile(r">([^<>]*?\b\d[\d,]*\s+sermons?\b[^<>]*)<", re.I)
_SERMON_LINK = re.compile(r'href="([^"#?]*?/?sermons/([^/"#?]+?)(?:\.html)?/?)"', re.I)
_NOT_SERMON = {"index", "page", "scripture", "doctrine", "series", ""}


def html_counts(html):
    """Map of metric name -> count for one browse HTML page.

    * `entry:<href>`  a browse tile like <a href=..><span class="n">81</span></a>
    * `text:<sentence with digits as #>`  e.g. "291 sermons across 59 books"
      (the first number before "sermon" is the count)
    * `linked-sermons`  distinct individual sermon pages linked from the page
    """
    counts = {}
    for href, n in _NAMED.findall(html):
        k = f"entry:{href}"
        counts[k] = max(counts.get(k, 0), int(n.replace(",", "")))
    stripped = _NAMED.sub("", html)
    for text in _TOTAL.findall(stripped):
        text = " ".join(text.split())
        m = re.search(r"(\d[\d,]*)\s+sermons?\b", text, re.I)
        k = "text:" + re.sub(r"\d[\d,]*", "#", text)
        counts[k] = max(counts.get(k, 0), int(m.group(1).replace(",", "")))
    slugs = {s for _, s in _SERMON_LINK.findall(html) if s.lower() not in _NOT_SERMON}
    if slugs:
        counts["linked-sermons"] = len(slugs)
    return counts


def json_counts(text):
    """Lists of sermon-like objects and explicit count/total fields."""
    try:
        data = json.loads(text)
    except ValueError:
        return {}
    counts = {}

    def walk(node, path):
        if isinstance(node, list):
            counts[f"len:{path or '$'}"] = len(node)
            for item in node[:1]:
                walk(item, path + "[]")
        elif isinstance(node, dict):
            for k, v in node.items():
                p = f"{path}.{k}" if path else k
                if isinstance(v, int) and not isinstance(v, bool) and re.search(r"count|total", k, re.I):
                    counts[f"field:{p}"] = v
                else:
                    walk(v, p)
    walk(data, "")
    return counts


def file_counts(path, text):
    return json_counts(text) if path.endswith(".json") else html_counts(text)


def count_regressions(base_files, head_files, read_base, read_head, root_slugs):
    """Return a list of human-readable regression messages."""
    head_set = set(head_files)
    problems = []
    for root in sorted(church_roots(base_files, root_slugs)):
        for path in sorted(f for f in base_files if f.startswith(root) and is_browse_file(f)):
            before = file_counts(path, read_base(path))
            if not before:
                continue
            if path not in head_set:
                problems.append(f"{path}: browse listing removed (had {max(before.values())} sermons)")
                continue
            after = file_counts(path, read_head(path))
            for key, n in sorted(before.items()):
                if key not in after:
                    problems.append(f"{path}: '{key}' was {n} on base, missing on head")
                elif after[key] < n:
                    problems.append(f"{path}: '{key}' dropped {n} -> {after[key]}")
    return problems


# ---------------------------------------------------------------------- main
def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("check", choices=["folder", "counts"])
    ap.add_argument("--base", required=True)
    ap.add_argument("--head", required=True)
    ap.add_argument("--branch", default="")
    ap.add_argument("--labels", default="", help="comma-separated PR labels")
    a = ap.parse_args(argv)

    if a.check == "folder":
        slug, err = church_slug(a.branch, a.labels.split(",") if a.labels else [])
        if err:
            print(f"::error::{err}")
            return 1
        if slug is None:
            print("Not a church PR (no church/<Slug>/ branch or church:<Slug> label); folder guard skipped.")
            return 0
        files = changed_files(a.base, a.head)
        bad = folder_violations(slug, files)
        print(f"Church '{slug}': allowed prefixes {church_prefixes(slug)}; {len(files)} changed file(s).")
        for f in bad:
            print(f"::error file={f}::{f} is outside {slug}'s content folders")
        if bad:
            print(f"FAIL: {len(bad)} file(s) outside the church's folders.")
            return 1
        print("OK: all changed files are inside the church's folders.")
        return 0

    base_files, head_files = ls_files(a.base), ls_files(a.head)
    slugs = root_slugs_from_churches_js(show(a.base, "churches.js")) if "churches.js" in base_files else set()
    problems = count_regressions(base_files, head_files,
                                 lambda p: show(a.base, p), lambda p: show(a.head, p), slugs)
    roots = church_roots(base_files, slugs)
    print(f"Checked browse listings under {len(roots)} church/collection folder(s).")
    for p in problems:
        print(f"::error::{p}")
    if problems:
        print(f"FAIL: {len(problems)} sermon-count regression(s).")
        return 1
    print("OK: no browse listing lost sermons.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
