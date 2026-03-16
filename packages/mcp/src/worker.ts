import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NanoBananaClient } from "./api/client.js";
import type { GenerationResult } from "./api/types.js";
import authHandler from "./auth-handler.js";

// Types for Cloudflare env bindings
type Env = {
  NANOBANANA_API_KEY: string;
  OAUTH_KV: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
  COOKIE_ENCRYPTION_KEY: string;
  AUTH_SECRET_TOKEN: string;
  IMAGES_BUCKET: R2Bucket;
};

function mimeToExt(mime: string): string {
  const map: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  return map[mime] ?? "png";
}

export class NanoBananaMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "nanobanana",
    version: "1.0.0",
    icons: [
      {
        src: "https://nanobanana.cubancodepath.com/icon.png",
        mimeType: "image/png",
        sizes: ["128x128"],
      },
    ],
  });

  private async uploadToR2(result: GenerationResult): Promise<any[]> {
    const content: any[] = [];
    if (result.text) content.push({ type: "text", text: result.text });

    for (const img of result.images) {
      const ext = mimeToExt(img.mimeType);
      const key = `generated/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const bytes = Uint8Array.from(atob(img.base64Data), (c) => c.charCodeAt(0));

      await this.env.IMAGES_BUCKET.put(key, bytes, {
        httpMetadata: { contentType: img.mimeType },
      });

      const origin = "https://nanobanana.cubancodepath.com";
      const url = `${origin}/images/${key}`;
      content.push({ type: "image", data: img.base64Data, mimeType: img.mimeType });
      content.push({ type: "text", text: `Download: ${url}` });
      content.push({ type: "text", text: `BASE64_IMAGE:${img.base64Data}` });
    }

    if (content.length === 0) content.push({ type: "text", text: "No image returned." });
    return content;
  }

  async init() {
    this.server.registerTool("generate_image", {
      title: "Generate Image",
      description: "Generate an image from a text prompt using Nano Banana. Returns a URL to download the image.",
      inputSchema: {
        prompt: z.string().describe("Descriptive text of the image to generate"),
        model: z.enum(["flash", "pro"]).optional().describe("Model: flash (fast) or pro (quality). Default: flash"),
        aspect_ratio: z.enum(["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"]).optional().describe("Aspect ratio. Default: 1:1"),
        image_size: z.enum(["512", "1K", "2K", "4K"]).optional().describe("Resolution. Default: 1K"),
      },
    }, async (args: any) => {
      try {
        const client = new NanoBananaClient(this.env.NANOBANANA_API_KEY);
        const result = await client.generateImage({
          prompt: args.prompt,
          model: args.model ?? undefined,
          aspectRatio: args.aspect_ratio ?? undefined,
          imageSize: args.image_size ?? undefined,
        });
        const content = await this.uploadToR2(result);
        return { content };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }
    });

    this.server.registerTool("edit_image", {
      title: "Edit Image",
      description: "Edit an existing image using a text prompt and base64 image data. Returns a URL to download the result.",
      inputSchema: {
        prompt: z.string().describe("Description of the desired edit"),
        image_base64: z.string().describe("Base64-encoded image data"),
        image_mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]).optional().describe("MIME type. Default: image/png"),
      },
    }, async (args: any) => {
      try {
        const client = new NanoBananaClient(this.env.NANOBANANA_API_KEY);
        const result = await client.editImage({
          prompt: args.prompt,
          imageBase64: args.image_base64,
          imageMimeType: args.image_mime_type ?? "image/png",
        });
        const content = await this.uploadToR2(result);
        return { content };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }
    });
  }
}

export default new OAuthProvider<Env>({
  apiRoute: "/mcp",
  apiHandler: NanoBananaMCP.serve("/mcp"),
  defaultHandler: authHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
