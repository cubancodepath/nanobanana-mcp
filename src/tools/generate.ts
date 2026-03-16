import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NanoBananaClient } from "../api/client.js";
import { pollForResult } from "../lib/poller.js";
import { formatResult } from "./utils.js";

export function registerGenerateTool(server: McpServer, client: NanoBananaClient) {
  server.registerTool("generate_image", {
    title: "Generate Image",
    description:
      "Generate an image from a text prompt using Nano Banana v1. Returns image URLs when complete.",
    inputSchema: {
      prompt: z.string().describe("Text description of the image to generate"),
    },
  }, async ({ prompt }) => {
    try {
      const taskId = await client.generate({ prompt });
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
