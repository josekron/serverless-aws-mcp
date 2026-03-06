import { z } from "zod";

import {
  LambdaEvent,
  LambdaContext,
  LambdaResponse,
  CorsHeaders,
  ApiKeyValidationResult,
} from "../infrastructure/types/lambda";
import {
  McpRequest,
  McpResponse,
  McpInitializeResponse,
  McpToolsListResponse,
  McpToolCallRequest,
  McpToolCallResponse,
  McpServer,
  JsonSchema,
  McpTool,
} from "../infrastructure/types/mcpServer";

// CORS headers
const corsHeaders: CorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, x-api-key, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

/**
 * Handles CORS preflight requests
 */
const handleCorsPreflight = (_event: LambdaEvent): LambdaResponse => {
  console.log("Handling OPTIONS request");
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: "",
  };
};

/**
 * Validates API key for non-local environments
 */
const validateApiKey = (event: LambdaEvent): ApiKeyValidationResult | null => {
  const isLocal =
    process.env.AWS_SAM_LOCAL === "true" || process.env.IS_OFFLINE === "true";

  if (!isLocal) {
    const apiKey = event.headers["x-api-key"] || event.headers["X-API-Key"];
    if (!apiKey) {
      console.log("Missing API key in request");
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
        body: JSON.stringify({
          error: "Unauthorized",
          message: "API key is required",
        }),
      };
    }
  } else {
    console.log("Running in local mode - skipping API key validation");
  }

  return null;
};

/**
 * Handles MCP initialize method
 */
const handleInitialize = (body: McpRequest): LambdaResponse => {
  const response: McpInitializeResponse = {
    result: {
      protocolVersion: "2025-06-18",
      capabilities: {
        tools: {
          listChanged: true,
        },
      },
      serverInfo: {
        name: "Lambda hosted MCP Server",
        version: "1.0.0",
      },
    },
    jsonrpc: "2.0",
    id: body.id,
  };

  console.log("Initialize response:", response);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
    body: JSON.stringify(response),
  };
};

/**
 * Converts Zod schema to JSON Schema
 */
const convertZodToJsonSchema = (zodSchema: z.ZodSchema): JsonSchema => {
  const jsonSchema: JsonSchema = {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  };

  // Extract properties from Zod schema
  if (
    zodSchema._def &&
    typeof zodSchema._def === "object" &&
    "shape" in zodSchema._def
  ) {
    const zodDef = zodSchema._def as { shape?: () => Record<string, unknown> };
    const shape = zodDef.shape?.() || {};
    Object.entries(shape).forEach(([key, field]) => {
      if (
        field &&
        typeof field === "object" &&
        "_def" in field &&
        field._def &&
        typeof field._def === "object" &&
        "typeName" in field._def
      ) {
        let type = "string";
        const fieldDef = field._def as { typeName?: string };
        const typeName = fieldDef.typeName;
        if (typeName === "ZodNumber") type = "number";
        if (typeName === "ZodBoolean") type = "boolean";

        jsonSchema.properties[key] = { type };

        // Check if required (not optional)
        if (typeName && !typeName.includes("Optional")) {
          jsonSchema.required.push(key);
        }
      }
    });
  }

  return jsonSchema;
};

/**
 * Handles MCP tools/list method
 */
const handleToolsList = (
  body: McpRequest,
  server: McpServer,
): LambdaResponse => {
  // Access tools from the MCP server's registered tools
  const tools = server._registeredTools || {};
  const toolsArray: McpTool[] = Object.entries(tools).map(([name, tool]) => {
    // Convert Zod schema to JSON Schema
    const zodSchema = tool.inputSchema;
    const jsonSchema = convertZodToJsonSchema(zodSchema);

    return {
      name,
      inputSchema: jsonSchema,
    };
  });

  const response: McpToolsListResponse = {
    result: {
      tools: toolsArray,
    },
    jsonrpc: "2.0",
    id: body.id,
  };

  console.log("Tools list response:", JSON.stringify(response, null, 2));
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
    body: JSON.stringify(response),
  };
};

/**
 * Handles MCP tools/call method
 */
const handleToolsCall = async (
  body: McpToolCallRequest,
  server: McpServer,
): Promise<LambdaResponse> => {
  const { name, arguments: args } = body.params;

  try {
    // Find and call the tool from the MCP server's registered tools
    const tools = server._registeredTools || {};
    const tool = tools[name];

    if (tool) {
      const result = await tool.callback(args);
      const response: McpToolCallResponse = {
        result,
        jsonrpc: "2.0",
        id: body.id,
      };

      console.log("Tool call response:", JSON.stringify(response, null, 2));
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
        body: JSON.stringify(response),
      };
    } else {
      const errorResponse: McpResponse = {
        error: {
          code: -32601,
          message: "Tool not found",
        },
        jsonrpc: "2.0",
        id: body.id,
      };

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
        body: JSON.stringify(errorResponse),
      };
    }
  } catch (error) {
    console.error("Tool execution error:", error);
    const errorResponse: McpResponse = {
      error: {
        code: -32603,
        message: "Tool execution failed",
        data: (error as Error).message,
      },
      jsonrpc: "2.0",
      id: body.id,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
      body: JSON.stringify(errorResponse),
    };
  }
};

/**
 * Handles unknown MCP methods
 */
const handleUnknownMethod = (body: McpRequest): LambdaResponse => {
  const errorResponse: McpResponse = {
    error: {
      code: -32601,
      message: "Method not found",
    },
    jsonrpc: "2.0",
    id: body.id,
  };

  console.log("Error response:", errorResponse);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
    body: JSON.stringify(errorResponse),
  };
};

/**
 * Handles MCP server errors
 */
const handleMcpError = (error: Error, body: McpRequest): LambdaResponse => {
  console.error("MCP server error:", error);

  const errorResponse: McpResponse = {
    error: {
      code: -32603,
      message: "Internal error",
      data: error.message,
    },
    jsonrpc: "2.0",
    id: body.id,
  };

  return {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
    body: JSON.stringify(errorResponse),
  };
};

/**
 * Handles POST requests using MCP server
 */
const handlePostRequest = async (
  event: LambdaEvent,
  server: McpServer,
): Promise<LambdaResponse> => {
  console.log("Handling POST request with MCP server");

  // Parse the request body
  const body: McpRequest = JSON.parse(event.body || "{}");
  console.log("Request body:", body);

  try {
    // Route to appropriate handler based on method
    switch (body.method) {
      case "initialize":
        return handleInitialize(body);
      case "tools/list":
        return handleToolsList(body, server);
      case "tools/call":
        return await handleToolsCall(body as McpToolCallRequest, server);
      default:
        return handleUnknownMethod(body);
    }
  } catch (error) {
    return handleMcpError(error as Error, body);
  }
};

/**
 * Creates a Lambda handler function with the provided MCP server
 */
export const createHandler = (server: McpServer) => {
  /**
   * Main Lambda handler function
   */
  return async (
    event: LambdaEvent,
    _context: LambdaContext,
  ): Promise<LambdaResponse> => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    try {
      // Handle CORS preflight requests
      if (event.httpMethod === "OPTIONS") {
        return handleCorsPreflight(event);
      }

      // Validate API key
      const apiKeyError = validateApiKey(event);
      if (apiKeyError) {
        return apiKeyError;
      }

      // Handle POST requests using MCP server
      if (event.httpMethod === "POST") {
        return await handlePostRequest(event, server);
      }

      // Method not allowed
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: "Method not allowed",
      };
    } catch (error) {
      console.error("Error in handler:", error);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
        body: JSON.stringify({
          error: "Internal server error",
          message: (error as Error).message,
          stack: (error as Error).stack,
        }),
      };
    }
  };
};
