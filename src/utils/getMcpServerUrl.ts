import { LambdaEvent } from "../infrastructure/types/lambda";

export /**
 * Constructs the MCP server URL at runtime
 */
const getMcpServerUrl = (event: LambdaEvent): string => {
  // Try to get from environment variable first (for local testing)
  if (process.env.MCP_SERVER_URL) {
    return process.env.MCP_SERVER_URL;
  }

  // Construct URL from API Gateway endpoint
  // Format: https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/{path}
  // AWS_REGION is automatically available in Lambda runtime environment
  const region =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-2";

  // Try to get API ID from Host header (most reliable)
  if (event.headers) {
    const host =
      event.headers.Host ||
      event.headers.host ||
      event.headers["Host"] ||
      event.headers["host"];
    if (host) {
      // Extract API ID from host (format: {api-id}.execute-api.{region}.amazonaws.com)
      const apiIdMatch = host.match(/^([^.]+)\.execute-api\./);
      if (apiIdMatch && apiIdMatch[1]) {
        const apiId = apiIdMatch[1];
        console.log(`Extracted API ID from Host header: ${apiId}`);
        return `https://${apiId}.execute-api.${region}.amazonaws.com/Prod/mcp`;
      }
      // If host doesn't match expected pattern, use it directly
      return `https://${host}/Prod/mcp`;
    }
  }

  // Try to get API ID from request context
  const requestContext = event.requestContext || {};
  const apiId =
    (requestContext as { apiId?: string }).apiId ||
    (typeof (requestContext as { requestId?: string }).requestId === "string"
      ? (requestContext as { requestId: string }).requestId.split("-")[0]
      : undefined);

  if (apiId) {
    console.log(`Extracted API ID from request context: ${apiId}`);
    return `https://${apiId}.execute-api.${region}.amazonaws.com/Prod/mcp`;
  }

  // Fallback to localhost for local development
  console.warn("Could not determine API Gateway URL, using localhost fallback");
  return "http://localhost:3000/mcp";
};
