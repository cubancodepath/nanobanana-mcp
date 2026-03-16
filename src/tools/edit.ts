import { writeFileSync } from "node:fs";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NanoBananaClient } from "../api/client.js";
import { formatResult } from "./format.js";

export function registerEditTool(server: McpServer, client: NanoBananaClient) {
  server.registerTool("edit_image", {
    title: "Edit Image",
    description:
      "Edit an existing image using a text prompt. Provide the image as base64 data. Can add, remove, or modify elements, change styles, adjust colors, etc. Optionally save to a file path.",
    inputSchema: {
      prompt: z.string().describe("Description of the desired edit"),
      image_base64: z.string().describe("Base64-encoded image data"),
      image_mime_type: z
        .enum(["image/png", "image/jpeg", "image/webp"])
        .optional()
        .describe("MIME type of the image. Default: image/png"),
      model: z
        .enum(["flash", "pro"])
        .optional()
        .describe("Model to use. Default: flash"),
      aspect_ratio: z
        .enum(["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"])
        .optional()
        .describe("Aspect ratio. Default: 1:1"),
      image_size: z
        .enum(["512", "1K", "2K", "4K"])
        .optional()
        .describe("Resolution. Default: 1K"),
      output_path: z
        .string()
        .optional()
        .describe("Optional file path to save the edited image (e.g. /tmp/edited.png)"),
    },
  }, async ({ prompt, image_base64, image_mime_type, model, aspect_ratio, image_size, output_path }) => {
    try {
      const result = await client.editImage({
        prompt,
        imageBase64: image_base64,
        imageMimeType: image_mime_type ?? "image/png",
        model: model ?? undefined,
        aspectRatio: aspect_ratio ?? undefined,
        imageSize: image_size ?? undefined,
      });
      const formatted = formatResult(result);

      if (output_path && result.images.length > 0) {
        writeFileSync(output_path, Buffer.from(result.images[0].base64Data, "base64"));
        formatted.content.push({
          type: "text" as const,
          text: `Image saved to: ${output_path}`,
        });
      }

      return formatted;
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
      };
    }
  });
}
