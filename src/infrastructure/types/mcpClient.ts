export interface WebhookPayload {
  imageUrl: string;
  name: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentDecision {
  reasoning: string;
  toolCalls: ToolCall[];
  finalResponse: string;
}
