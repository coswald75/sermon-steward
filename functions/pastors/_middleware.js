// Password gate for the /pastors section (directory + prompts library).
//
// Cloudflare Pages Function middleware — runs server-side on every
// request under /pastors/*, so the content never reaches the browser
// without the password (unlike a client-side JS gate, which is just a
// curtain over publicly downloadable HTML).
//
// Uses HTTP Basic Auth: the browser shows its native sign-in dialog.
// Any username is accepted; only the password is checked. Credentials
// are cached by the browser for the session, so visitors are prompted
// once.
//
// To change the password, edit PASSWORD below and push — Cloudflare
// Pages redeploys automatically.

const PASSWORD = "Gosp3l4U!";
const REALM = "Sermon Steward — Pastors";

export async function onRequest(context) {
  const auth = context.request.headers.get("Authorization") || "";

  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      // Username may legitimately contain no colon; password may
      // contain colons — split on the FIRST colon only.
      const idx = decoded.indexOf(":");
      const pass = idx >= 0 ? decoded.slice(idx + 1) : "";
      if (pass === PASSWORD) {
        return context.next();
      }
    } catch (_) {
      // fall through to the 401
    }
  }

  return new Response("Password required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Content-Type": "text/plain",
    },
  });
}
