import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NanoBananaClient } from "../api/client.js";
import { formatResult } from "./utils.js";

export function registerCheckStatusTool(server: McpServer, client: NanoBananaClient) {
  server.registerTool("check_task_status", {
    title: "Check Task Status",
    description:
      "Check the status of a previously submitted image generation task. Useful if a generation timed out.",
    inputSchema: {
      task_id: z.string().describe("The task ID returned from a generation request"),
      version: z
        .enum(["v1", "v2"])
        .optional()
        .describe("API version used for the original request. Default: v1"),
    },
  }, async ({ task_id, version }) => {
    try {
      const result =
        version === "v2"
          ? await client.getStatusV2(task_id)
          : await client.getStatus(task_id);
      return formatResult(result);
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
      };
    }
  });
}
