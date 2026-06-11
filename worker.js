// sermonsteward.com — Worker entry in front of the static assets.
//
// The site is a Cloudflare Worker with assets (wrangler.jsonc
// `assets.directory: _site`), NOT a Pages project — so password
// protection lives here, not in a Pages functions/ middleware.
//
// Only /pastors/* is gated (see `run_worker_first` in wrangler.jsonc —
// every other path is served straight from the asset cache without
// invoking this Worker at all, so the gate adds zero latency to the
// public site). HTTP Basic Auth: any username, password checked,
// enforced at the edge — content never reaches the browser without it.

const PASSWORD = "Gosp3l4U!";
const REALM = "Sermon Steward — Pastors";

function unauthorized() {
  return new Response("Password required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Content-Type": "text/plain",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const gated =
      url.pathname === "/pastors" || url.pathname.startsWith("/pastors/");

    if (gated) {
      const auth = request.headers.get("Authorization") || "";
      if (!auth.startsWith("Basic ")) return unauthorized();
      try {
        const decoded = atob(auth.slice(6));
        // Split on the FIRST colon only — passwords may contain colons.
        const idx = decoded.indexOf(":");
        const pass = idx >= 0 ? decoded.slice(idx + 1) : "";
        if (pass !== PASSWORD) return unauthorized();
      } catch (_) {
        return unauthorized();
      }
    }

    return env.ASSETS.fetch(request);
  },
};
