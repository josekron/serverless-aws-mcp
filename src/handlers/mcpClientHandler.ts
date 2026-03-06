// eslint-disable-next-line import/no-unresolved
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// eslint-disable-next-line import/no-unresolved
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { GeminiAgent as AIAgent } from "../infrastructure/adapters/ai/AIAgent";
import {
  LambdaEvent,
  LambdaContext,
  LambdaResponse,
  CorsHeaders,
} from "../infrastructure/types/lambda";
import {
  AgentDecision,
  ToolCall,
  WebhookPayload,
} from "../infrastructure/types/mcpClient";
import { getMcpServerApiKey } from "../utils/getMcpServerApiKey";
import { getMcpServerUrl } from "../utils/getMcpServerUrl";

// CORS headers
const corsHeaders: CorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
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
 * Validates webhook payload
 */
const validateWebhookPayload = (
  payload: unknown,
): { valid: boolean; error?: LambdaResponse } => {
  const webhookPayload = payload as WebhookPayload;
  if (!webhookPayload.imageUrl || !webhookPayload.name) {
    return {
      valid: false,
      error: {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
        body: JSON.stringify({
          error: "Missing required fields",
          message: "Both imageUrl and name are required",
        }),
      },
    };
  }
  return { valid: true };
};

/**
 * Creates an MCP client and connects to the MCP server
 */
const createMcpClient = async (event: LambdaEvent): Promise<Client> => {
  const mcpServerUrl = getMcpServerUrl(event);
  const apiKey = await getMcpServerApiKey();

  console.log("MCP Server URL:", mcpServerUrl);
  console.log("API Key configured:", !!apiKey);

  if (!apiKey) {
    throw new Error("MCP Server API key could not be retrieved");
  }

  const client = new Client(
    {
      name: "MCP Client",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Create HTTP transport for the MCP server
  const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl), {
    requestInit: {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    },
  });

  // Connect to the MCP server
  console.log("Connecting to MCP server at:", mcpServerUrl);
  await client.connect(transport);
  console.log("Successfully connected to MCP server");

  return client;
};

interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
}

/**
 * Gets the list of available tools from the MCP server
 */
const getAvailableTools = async (client: Client): Promise<McpToolInfo[]> => {
  try {
    const tools = await client.listTools();
    console.log("Available tools from MCP server:", tools);
    // Cast to our interface type since the MCP SDK types are complex
    return (tools.tools || []) as McpToolInfo[];
  } catch (error) {
    console.error("Error getting tools list:", error);
    return [];
  }
};

/**
 * Uses Gemini as an intelligent agent to analyze the query and decide which tools to use
 */
const makeIntelligentDecision = async (
  query: string,
  availableTools: McpToolInfo[],
  context: { imageUrl: string; name: string },
): Promise<AgentDecision> => {
  const aiAgent = new AIAgent();
  const model = aiAgent.getModel();

  // Create detailed tool descriptions with schemas
  const toolsDescription = availableTools
    .map((tool) => {
      const schema = tool.inputSchema || {};
      const properties = schema.properties || {};
      const required = schema.required || [];

      const params = Object.entries(properties)
        .map(
          ([key, value]: [string, { type?: string; description?: string }]) => {
            const isRequired = required.includes(key);
            return `  - ${key} (${value.type || "any"}${isRequired ? ", required" : ", optional"}): ${value.description || "No description"}`;
          },
        )
        .join("\n");

      return `- ${tool.name}:
  Description: ${tool.description || "No description available"}
  Parameters:
${params}`;
    })
    .join("\n\n");

  const prompt = `
You are an intelligent MCP (Model Context Protocol) agent powered by Google Gemini. You have access to a set of tools from an MCP server to help fulfill user requests, primarily focused on processing and analyzing images.

Available Tools:
${toolsDescription}

User Query: "${query}"

Context:
- Image URL: ${context.imageUrl}

Your task is to:
1. Analyze the user's query and the provided image context.
2. Determine which of the available tools are necessary to fulfill the request.
3. Call the tools that are required based on your analysis.
4. Use the EXACT parameter names as defined in the tool schemas.
5. Provide a thoughtful and helpful final response.

IMPORTANT: 
- Only call tools that are directly relevant to providing what the user requested.
- If the request requires multiple tool calls to be fully satisfied, include all of them.
- Use the EXACT parameter names from the tool schemas (e.g., "imageUrl").
- Return ONLY valid JSON. Do not include markdown code blocks or any other text.

Respond with ONLY a JSON object in this exact format:
{
    "reasoning": "Your analysis of the user's needs and why you chose these specific tools",
    "toolCalls": [
        {
            "name": "toolName",
            "arguments": { "param1": "value1", "param2": "value2" }
        }
    ],
    "finalResponse": "Your final response to the user based on the tool results (if any) or direct analysis"
}

If no tools are needed to answer the query, return an empty toolCalls array.
`;

  let rawResponse = "";
  try {
    const result = await model.generateContent(prompt);
    rawResponse = result.response.text();

    console.log("Gemini agent response (raw):", rawResponse);

    // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
    let response = rawResponse.trim();
    if (response.startsWith("```")) {
      // Remove opening code block (```json or ```)
      response = response.replace(/^```(?:json)?\s*/i, "");
      // Remove closing code block (```)
      response = response.replace(/\s*```$/i, "");
      response = response.trim();
    }

    console.log("Gemini agent response (cleaned):", response);

    // Try to parse the JSON response
    const parsed = JSON.parse(response) as {
      reasoning?: string;
      toolCalls?: Array<{
        name: string;
        arguments?: Record<string, unknown>;
      }>;
      finalResponse?: string;
    };

    // Validate and normalize tool calls
    const toolCalls = (parsed.toolCalls || []).map((toolCall) => {
      // Fix common parameter name issues
      if (toolCall.arguments) {
        const args = toolCall.arguments as Record<string, unknown>;
        // Fix "url" -> "imageUrl" for getAltTextForImage
        if (
          toolCall.name === "getAltTextForImage" &&
          "url" in args &&
          !("imageUrl" in args)
        ) {
          args.imageUrl = args.url;
          delete args.url;
        }
      }
      return toolCall as ToolCall;
    });

    return {
      reasoning: parsed.reasoning || "No reasoning provided",
      toolCalls: toolCalls,
      finalResponse: parsed.finalResponse || "No response generated",
    };
  } catch (error) {
    console.error("Error with Gemini agent:", error);
    console.error("Response that failed to parse:", rawResponse);

    // Fallback: provide a basic response without tool calls
    return {
      reasoning:
        "Error occurred with Gemini agent, providing fallback response",
      toolCalls: [],
      finalResponse: `Hello ${context.name}! I received your image at ${context.imageUrl}, but I encountered an error processing your request. Please try again.`,
    };
  }
};

/**
 * Executes the tool calls decided by the Gemini agent
 */
interface ToolResult {
  content?: Array<{ type: string; text?: string }>;
  error?: string;
  success?: boolean;
}

const executeToolCalls = async (
  client: Client,
  toolCalls: ToolCall[],
): Promise<Record<string, ToolResult>> => {
  const results: Record<string, ToolResult> = {};

  for (const toolCall of toolCalls) {
    try {
      console.log(
        `Executing tool: ${toolCall.name} with args:`,
        toolCall.arguments,
      );

      const result = await client.callTool({
        name: toolCall.name,
        arguments: toolCall.arguments,
      });

      // Cast to our interface type since the MCP SDK types are complex
      results[toolCall.name] = result as ToolResult;
      console.log(`Tool ${toolCall.name} result:`, result);
    } catch (error) {
      console.error(`Error executing tool ${toolCall.name}:`, error);
      results[toolCall.name] = {
        error: `Failed to execute ${toolCall.name}: ${error}`,
        success: false,
      };
    }
  }

  return results;
};

/**
 * Uses Gemini to generate a final response incorporating tool results
 */
const generateFinalResponse = async (
  agentDecision: AgentDecision,
  toolResults: Record<string, ToolResult>,
  context: { imageUrl: string; name: string },
): Promise<string> => {
  const aiAgent = new AIAgent();
  const model = aiAgent.getModel();

  const toolResultsSummary = Object.entries(toolResults)
    .map(([toolName, result]) => {
      if (result.error) {
        return `${toolName}: Error - ${result.error}`;
      }
      if (
        result.content &&
        Array.isArray(result.content) &&
        result.content.length > 0
      ) {
        return `${toolName}: ${result.content[0].text || "No text content"}`;
      }
      return `${toolName}: ${JSON.stringify(result)}`;
    })
    .join("\n");

  const prompt = `
You are generating a final response for a user based on the following information:

Original Agent Decision:
- Reasoning: ${agentDecision.reasoning}
- Tool Calls Made: ${agentDecision.toolCalls.map((tc) => tc.name).join(", ")}
- Initial Response: ${agentDecision.finalResponse}

Tool Execution Results:
${toolResultsSummary}

User Context:
- Name: ${context.name}
- Image URL: ${context.imageUrl}

Generate a comprehensive, friendly, and engaging final response that:
1. Acknowledges the user by name
2. Incorporates relevant information from the tool results
3. Provides value based on what was requested
4. Is warm and personal

Keep it concise but meaningful. If tools were executed, reference their results naturally.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error generating final response:", error);
    return (
      agentDecision.finalResponse ||
      `Hello ${context.name}! I've processed your request regarding the image at ${context.imageUrl}.`
    );
  }
};

/**
 * Handles POST requests with webhook payload
 */
const handlePostRequest = async (
  event: LambdaEvent,
): Promise<LambdaResponse> => {
  console.log("Handling POST request");

  // Parse the webhook payload
  const payload: WebhookPayload = JSON.parse(event.body || "{}");

  // Validate payload
  const validation = validateWebhookPayload(payload);
  if (!validation.valid) {
    return validation.error!;
  }

  console.log("Processing webhook payload:", payload);

  // Create MCP client and connect to server
  const mcpClient = await createMcpClient(event);
  console.log("Connected to MCP server");

  try {
    // Get available tools from MCP server
    const availableTools = await getAvailableTools(mcpClient);
    console.log("Available tools:", availableTools);

    // Create a query based on the webhook payload
    const query = `I have an image at ${payload.imageUrl} and a person named ${payload.name}. I need to generate alt text for the image and create a personalized message for ${payload.name}.`;

    // Use Gemini as an intelligent agent to decide what to do
    const agentDecision = await makeIntelligentDecision(query, availableTools, {
      imageUrl: payload.imageUrl,
      name: payload.name,
    });
    console.log("Agent decision:", agentDecision);

    // Execute only the tools that the agent decided are necessary
    const toolResults = await executeToolCalls(
      mcpClient,
      agentDecision.toolCalls,
    );
    console.log("Tool execution results:", toolResults);

    // Generate final response incorporating tool results
    const finalResponse = await generateFinalResponse(
      agentDecision,
      toolResults,
      {
        imageUrl: payload.imageUrl,
        name: payload.name,
      },
    );
    console.log("Final response:", finalResponse);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
      body: JSON.stringify({
        success: true,
        message: finalResponse,
        agentAnalysis: {
          query: query,
          availableTools: availableTools.map((tool) => ({
            name: tool.name,
            description: tool.description,
          })),
          agentDecision: {
            reasoning: agentDecision.reasoning,
            toolCalls: agentDecision.toolCalls,
            initialResponse: agentDecision.finalResponse,
          },
          toolExecutionResults: toolResults,
        },
        processedAt: new Date().toISOString(),
      }),
    };
  } finally {
    // Close MCP client connection
    await mcpClient.close();
  }
};

/**
 * Creates a Lambda handler function for MCP client
 */
export const createHandler = () => {
  /**
   * Main Lambda handler function
   */
  return async (
    event: LambdaEvent,
    _context: LambdaContext,
  ): Promise<LambdaResponse> => {
    console.log("Received webhook event:", JSON.stringify(event, null, 2));

    try {
      // Handle CORS preflight requests
      if (event.httpMethod === "OPTIONS") {
        return handleCorsPreflight(event);
      }

      // Only handle POST requests
      if (event.httpMethod !== "POST") {
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Method not allowed" }),
        };
      }

      // Handle POST requests
      return await handlePostRequest(event);
    } catch (error) {
      console.error("Error in webhook handler:", error);
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
