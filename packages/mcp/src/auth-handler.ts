import { Hono } from "hono";
import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";

type Env = {
  NANOBANANA_API_KEY: string;
  OAUTH_KV: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
  COOKIE_ENCRYPTION_KEY: string;
  AUTH_SECRET_TOKEN: string;
  OAUTH_PROVIDER: OAuthHelpers;
  IMAGES_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Env }>();

// ── OAuth ──

app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  if (!oauthReqInfo.clientId) {
    return c.text("Invalid OAuth request", 400);
  }
  return c.html(renderForm(encodeURIComponent(JSON.stringify(oauthReqInfo))));
});

app.post("/authorize", async (c) => {
  const body = await c.req.parseBody();
  const token = body["token"] as string;
  const oauthDataRaw = body["oauthData"] as string;

  if (token !== c.env.AUTH_SECRET_TOKEN) {
    return c.html(renderForm(oauthDataRaw, "Invalid token. Try again."), 401);
  }

  const oauthReqInfo: AuthRequest = JSON.parse(decodeURIComponent(oauthDataRaw));

  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: "owner",
    metadata: {},
    scope: oauthReqInfo.scope,
    props: { authorized: true },
  });

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="2;url=${redirectTo}" />
  <title>NanoBanana MCP - Authorized</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#1a1a2e;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;background-image:radial-gradient(circle,rgba(245,214,35,.07) 1px,transparent 1px);background-size:22px 22px}
    .card{background:#16213e;border:3px solid #1a1a2e;border-radius:10px;box-shadow:5px 5px 0 #1a1a2e;padding:36px 32px;max-width:400px;text-align:center;animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both}
    h1{font-size:1.4rem;color:#4ade80;margin-bottom:12px}
    p{color:rgba(255,255,255,.6);font-size:.9rem;line-height:1.5}
    @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorized!</h1>
    <p>Redirecting back to claude.ai...<br/>You can close this tab if it doesn't redirect automatically.</p>
  </div>
</body>
</html>`);
});

// ── R2 images ──

app.get("/images/*", async (c) => {
  const key = c.req.path.replace("/images/", "");
  if (!key) return c.text("Not found", 404);

  const object = await c.env.IMAGES_BUCKET.get(key);
  if (!object) return c.text("Image not found", 404);

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "image/png");
  headers.set("Cache-Control", "public, max-age=604800");

  return new Response(object.body, { headers });
});

// ── Fallback ──

app.all("/*", (c) => {
  return c.text("NanoBanana MCP Server", 200);
});

// ── Auth form template ──

function renderForm(oauthData: string, error?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>NanoBanana MCP - Authorization</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;background:#1a1a2e;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;background-image:radial-gradient(circle,rgba(245,214,35,.07) 1px,transparent 1px);background-size:22px 22px}
    .auth-card{background:#16213e;border:3px solid #1a1a2e;border-radius:10px;box-shadow:5px 5px 0 #1a1a2e;padding:36px 32px;max-width:400px;width:100%;margin:20px;animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both}
    .auth-icon{text-align:center;margin-bottom:20px}
    .auth-icon img{border-radius:12px;border:3px solid #1a1a2e;box-shadow:3px 3px 0 #1a1a2e}
    h1{font-size:1.6rem;font-weight:900;color:#f5d623;text-align:center;text-shadow:2px 2px 0 #1a1a2e,-1px -1px 0 #1a1a2e,1px -1px 0 #1a1a2e,-1px 1px 0 #1a1a2e;margin-bottom:8px}
    .subtitle{text-align:center;color:rgba(255,255,255,.6);font-size:.85rem;margin-bottom:24px}
    .error{color:#ff6b6b;text-align:center;font-weight:700;margin-bottom:16px;padding:8px 12px;background:rgba(255,107,107,.1);border:2px solid rgba(255,107,107,.3);border-radius:8px}
    input[type="password"]{width:100%;padding:12px 14px;border:2px solid rgba(245,214,35,.4);border-radius:8px;font-size:1rem;background:#1a1a2e;color:#fff;outline:none;transition:border-color .2s ease}
    input[type="password"]:focus{border-color:#f5d623}
    input[type="password"]::placeholder{color:rgba(255,255,255,.35)}
    button[type="submit"]{width:100%;padding:14px;margin-top:14px;background:#f5a623;color:#1a1a2e;border:3px solid #1a1a2e;border-radius:8px;font-size:1rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;box-shadow:3px 3px 0 #1a1a2e;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s ease,background .2s ease}
    button[type="submit"]:hover{background:#f5d623;transform:translate(-1px,-2px);box-shadow:4px 4px 0 #1a1a2e}
    button[type="submit"]:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #1a1a2e}
    @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
    @media(prefers-reduced-motion:reduce){*{animation-duration:1ms!important;transition-duration:1ms!important}}
  </style>
</head>
<body>
  <div class="auth-card">
    <div class="auth-icon">
      <img src="https://nanobanana.cubancodepath.com/icon.png" width="64" height="64" alt="NanoBanana" />
    </div>
    <h1>NanoBanana MCP</h1>
    <p class="subtitle">Enter your secret token to authorize</p>
    ${error ? `<p class="error">${error}</p>` : ""}
    <form method="POST" action="/authorize">
      <input type="hidden" name="oauthData" value="${oauthData}" />
      <input type="password" name="token" placeholder="Secret token" required autofocus />
      <button type="submit">Authorize</button>
    </form>
  </div>
</body>
</html>`;
}

export default app;
