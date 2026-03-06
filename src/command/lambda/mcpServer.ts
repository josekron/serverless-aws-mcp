// eslint-disable-next-line import/no-unresolved
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ImageProcessor } from "../../domain/imageProcessor";

import { createHandler } from "../../handlers/mcpServerHandler";
import { McpServer as McpServerType } from "../../infrastructure/types/mcpServer";

// Create an MCP server
const server = new McpServer({
  name: "MCP Server",
  version: "1.0.0",
});

// Add tools to the server
// AI tools:
server.tool(
  "getAltTextForImage",
  { imageUrl: z.string(), userPrompt: z.string().optional() },
  async ({ imageUrl, userPrompt }) => {
    const imageProcessor = new ImageProcessor();
    const altText = await imageProcessor.generateAltTextForImageUrl(
      imageUrl,
      userPrompt,
    );
    return {
      content: [
        { type: "text", text: altText || "Could not generate alt text." },
      ],
    };
  },
);



// Create the handler with the MCP server
const handler = createHandler(server as unknown as McpServerType);

export { handler };
