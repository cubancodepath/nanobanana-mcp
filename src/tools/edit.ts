import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NanoBananaClient } from "../api/client.js";
import { pollForResult } from "../lib/poller.js";
import { formatResult } from "./utils.js";

export function registerEditTool(server: McpServer, client: NanoBananaClient) {
  server.registerTool("edit_image", {
    title: "Edit Image",
    description:
      "Edit an image using a text prompt and source image URLs. Uses Nano Banana v1 image-to-image.",
    inputSchema: {
      prompt: z.string().describe("Text description of the desired edit"),
      images: z
        .array(z.string().url())
        .min(1)
        .describe("Array of source image URLs to edit"),
    },
  }, async ({ prompt, images }) => {
    try {
      const taskId = await client.edit({ prompt, images });
      const result = await pollForResult({
        taskId,
        statusFn: (id) => client.getStatus(id),
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
