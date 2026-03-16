import { writeFileSync } from "node:fs";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NanoBananaClient } from "../api/client.js";
import { formatResult } from "./format.js";

export function registerGenerateTool(server: McpServer, client: NanoBananaClient) {
  server.registerTool("generate_image", {
    title: "Generate Image",
    description:
      "Generate an image from a text prompt. Use descriptive natural language for best results. Returns the image directly. Optionally save to a file path.",
    inputSchema: {
      prompt: z.string().describe("Descriptive text of the image to generate"),
      model: z
        .enum(["flash", "pro"])
        .optional()
        .describe("Model to use. 'flash' is faster, 'pro' is higher quality. Default: flash"),
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
        .describe("Optional file path to save the generated image (e.g. /tmp/output.png)"),
    },
  }, async ({ prompt, model, aspect_ratio, image_size, output_path }) => {
    try {
      const result = await client.generateImage({
        prompt,
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
