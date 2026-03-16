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

  return c.redirect(redirectTo);
});

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

app.all("/*", (c) => {
  return c.text("NanoBanana MCP Server", 200);
});

function renderForm(oauthData: string, error?: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>NanoBanana MCP - Authorization</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 400px; margin: 80px auto; padding: 0 20px; }
    h1 { font-size: 1.5rem; }
    input[type="password"] { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; }
    button { width: 100%; padding: 12px; background: #f5a623; color: #fff; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; }
    button:hover { background: #e09510; }
    .error { color: #d32f2f; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>NanoBanana MCP</h1>
  ${error ? `<p class="error">${error}</p>` : "<p>Enter your secret token to authorize this connection.</p>"}
  <form method="POST" action="/authorize">
    <input type="hidden" name="oauthData" value="${oauthData}" />
    <input type="password" name="token" placeholder="Secret token" required autofocus />
    <button type="submit">Authorize</button>
  </form>
</body>
</html>`;
}

export default app;
