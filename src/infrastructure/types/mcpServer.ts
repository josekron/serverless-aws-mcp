import { z } from "zod";

export interface McpRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpInitializeResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    protocolVersion: string;
    capabilities: {
      tools: {
        listChanged: boolean;
      };
    };
    serverInfo: {
      name: string;
      version: string;
    };
  };
}

export interface McpToolsListResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    tools: McpTool[];
  };
}

export interface McpTool {
  name: string;
  inputSchema: JsonSchema;
}

export interface JsonSchema {
  type: "object";
  properties: Record<string, { type: string }>;
  required: string[];
  additionalProperties: false;
  $schema: string;
}

export interface McpToolCallRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: "tools/call";
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface McpToolCallResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    content: Array<{
      type: "text";
      text: string;
    }>;
  };
}

export interface McpServerTool {
  name: string;
  inputSchema: z.ZodSchema;
  callback: (args: Record<string, unknown>) => Promise<{
    content: Array<{
      type: "text";
      text: string;
    }>;
  }>;
}

export interface McpServer {
  _registeredTools?: Record<string, McpServerTool>;
}
