# NanoBanana MCP

<p align="center">
  <img src="icon.png" alt="NanoBanana MCP" width="128" />
</p>

An MCP (Model Context Protocol) server for AI image generation powered by Google Gemini. Works with Claude Code (local) and claude.ai Connectors (remote via Cloudflare Workers).

## Features

- **Text-to-Image** - Generate images from descriptive text prompts
- **Image Editing** - Edit existing images using text instructions
- **Multiple Models** - Choose between `flash` (fast) and `pro` (high quality)
- **Configurable Output** - Aspect ratio, resolution (512 to 4K), and format options
- **Dual Deployment** - Run locally via stdio or remotely on Cloudflare Workers

## Tools

| Tool | Description |
|------|-------------|
| `generate_image` | Generate an image from a text prompt |
| `edit_image` | Edit an existing image using a text prompt and base64 image data |

### Parameters

**generate_image:**
- `prompt` (required) - Descriptive text of the image to generate
- `model` - `flash` (default, faster) or `pro` (higher quality)
- `aspect_ratio` - `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`, etc.
- `image_size` - `512`, `1K` (default), `2K`, `4K`

**edit_image:**
- `prompt` (required) - Description of the desired edit
- `image_base64` (required) - Base64-encoded image data
- `image_mime_type` - `image/png` (default), `image/jpeg`, `image/webp`
- `model` - `flash` (default) or `pro`

## Setup

### Prerequisites

- Node.js 18+
- A Google Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### Installation

```bash
git clone https://github.com/your-username/nanobanana-mcp.git
cd nanobanana-mcp
npm install
npm run build
```

## Usage

### Option 1: Local (Claude Code)

Add the MCP server to Claude Code:

```bash
claude mcp add nanobanana -e NANOBANANA_API_KEY=your-api-key -- node /path/to/nanobanana-mcp/dist/index.js
```

Restart Claude Code and start generating images.

### Option 2: Remote (claude.ai Connectors via Cloudflare Workers)

Deploy as a remote MCP server so you can use it from claude.ai in the browser.

#### 1. Cloudflare Account Setup

You need a [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works).

#### 2. Create KV Namespace

```bash
npx wrangler kv namespace create "OAUTH_KV"
```

Copy the `id` from the output and update `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "OAUTH_KV",
    "id": "your-kv-id-here"
  }
]
```

#### 3. Set Secrets

```bash
# Your Gemini API key
npx wrangler secret put NANOBANANA_API_KEY

# Cookie encryption key (generate with: openssl rand -hex 32)
npx wrangler secret put COOKIE_ENCRYPTION_KEY

# Secret token to protect access (only you should know this)
npx wrangler secret put AUTH_SECRET_TOKEN
```

#### 4. Deploy

```bash
npm run worker:deploy
```

Your server will be available at `https://nanobanana-mcp.your-subdomain.workers.dev`.

#### 5. Connect to claude.ai

1. Go to **claude.ai > Settings > Connectors > Add custom connector**
2. **Name**: NanoBanana
3. **URL**: `https://nanobanana-mcp.your-subdomain.workers.dev/mcp`
4. When redirected to the authorization page, enter your `AUTH_SECRET_TOKEN`
5. Done! Start generating images in claude.ai

## Architecture

```
nanobanana-mcp/
├── src/
│   ├── index.ts           # Local stdio entry point (Claude Code)
│   ├── worker.ts          # Cloudflare Worker entry point (claude.ai)
│   ├── auth-handler.ts    # OAuth + secret token auth handler
│   ├── api/
│   │   ├── client.ts      # Gemini API client
│   │   └── types.ts       # TypeScript interfaces
│   └── tools/
│       ├── generate.ts    # generate_image tool
│       ├── edit.ts        # edit_image tool
│       └── format.ts      # Response formatting
├── wrangler.jsonc         # Cloudflare Workers config
├── tsconfig.json          # TypeScript config (local build)
└── tsconfig.worker.json   # TypeScript config (worker type-check)
```

## Development

```bash
# Local development (stdio)
npm run dev

# Worker local development
npm run worker:dev

# Build for production
npm run build

# Deploy worker
npm run worker:deploy
```

## License

ISC
