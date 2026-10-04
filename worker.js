// sermonsteward.com — Worker entry in front of the static assets.
//
// The site is a Cloudflare Worker with assets (wrangler.jsonc
// `assets.directory: _site`), NOT a Pages project — so password
// protection lives here, not in a Pages functions/ middleware.
//
// /pastors/* is gated (see `run_worker_first` in wrangler.jsonc).
// /SGchurch/<Church> and /church/<Church> 302 to that church's sermon
// list. /SGchurch/<Church>/topics/ and everything under it are real
// pages: matchChurchRoute returns null and this Worker serves the
// asset. The map is churches.js. A missing asset also reaches this
// Worker, which is what makes /sgchurch/… (any casing) resolve even
// when run_worker_first only lists the canonical prefix.
//
// Every other existing asset is served straight from the asset cache
// without invoking this Worker. HTTP Basic Auth: any username, password
// checked against the PASTORS_PASSWORD Worker secret, enforced at the
// edge — content never reaches the browser without it.
import { matchChurchRoute } from "./churches.js";

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

function authNotConfigured() {
  return new Response("Authentication is not configured.", {
    status: 500,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const church = matchChurchRoute(url.pathname);
    if (church?.location) {
      const dest = new URL(church.location, url.origin);
      dest.search = url.search;
      // no-cache: this 302 is temporary. The public URL should be free
      // to become a real church page later without browsers sticking
      // on the sermon-list redirect.
      // 301 only for pages that have permanently moved (churches.js REGION_CHURCH_MOVES).
      const status = church.status === 301 ? 301 : 302;
      return new Response(null, {
        status,
        headers: {
          Location: dest.toString(),
          "Cache-Control": status === 301 ? "public, max-age=3600" : "no-cache",
        },
      });
    }
    if (church?.status === 404) {
      return new Response("Church not found.", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex",
          "Cache-Control": "no-cache",
        },
      });
    }

    const gated =
      url.pathname === "/pastors" || url.pathname.startsWith("/pastors/");

    if (gated) {
      const expected = env.PASTORS_PASSWORD;
      if (typeof expected !== "string" || expected.length === 0) {
        return authNotConfigured();
      }

      const auth = request.headers.get("Authorization") || "";
      if (!auth.startsWith("Basic ")) return unauthorized();
      try {
        const decoded = atob(auth.slice(6));
        // Split on the FIRST colon only — passwords may contain colons.
        const idx = decoded.indexOf(":");
        const pass = idx >= 0 ? decoded.slice(idx + 1) : "";
        if (pass !== expected) return unauthorized();
      } catch (_) {
        return unauthorized();
      }
    }

    return env.ASSETS.fetch(request);
  },
};
