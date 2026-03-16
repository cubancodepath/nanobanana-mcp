#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { NanoBananaClient } from "./api/client.js";
import { registerGenerateTool } from "./tools/generate.js";
import { registerEditTool } from "./tools/edit.js";

const apiKey = process.env.NANOBANANA_API_KEY;
if (!apiKey) {
  console.error("Error: NANOBANANA_API_KEY environment variable is required.");
  console.error("Get your API key from https://aistudio.google.com/apikey");
  process.exit(1);
}

const client = new NanoBananaClient(apiKey);

const server = new McpServer({
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

registerGenerateTool(server, client);
registerEditTool(server, client);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
