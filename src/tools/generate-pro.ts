import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NanoBananaClient } from "../api/client.js";
import { pollForResult } from "../lib/poller.js";
import { formatResult } from "./utils.js";

export function registerGenerateProTool(server: McpServer, client: NanoBananaClient) {
  server.registerTool("generate_image_pro", {
    title: "Generate Image Pro",
    description:
      "Generate a high-quality image using Nano Bnana Pro (v2). Supports aspect ratio, resolution, format, and optional reference images. Costs 24 credits per generation.",
    inputSchema: {
      prompt: z.string().describe("Text description of the image to generate"),
      aspect_ratio: z
        .enum(["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"])
        .optional()
        .describe("Aspect ratio of the output image. Default: 1:1"),
      size: z
        .enum(["1K", "2K", "4K"])
        .optional()
        .describe("Resolution quality. Default: 1K"),
      format: z
        .literal("png")
        .optional()
        .describe("Output format. Default: png"),
      images: z
        .array(z.string().url())
        .optional()
        .describe("Optional reference image URLs for image-to-image generation"),
    },
  }, async ({ prompt, aspect_ratio, size, format, images }) => {
    try {
      const taskId = await client.generatePro({
        prompt,
        ...(aspect_ratio && { aspect_ratio }),
        ...(size && { size }),
        ...(format && { format }),
        ...(images?.length && { images }),
      });
      const result = await pollForResult({
        taskId,
        statusFn: (id) => client.getStatusV2(id),
      });
      return formatResult(result);
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
      };
    }
  });
}
