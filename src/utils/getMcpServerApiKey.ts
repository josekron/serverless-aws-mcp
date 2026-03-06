import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
/**
 * Retrieves the MCP server API key from Parameter Store
 */
export const getMcpServerApiKey = async (): Promise<string> => {
  // Try environment variable first (for local testing)
  if (process.env.MCP_SERVER_API_KEY) {
    return process.env.MCP_SERVER_API_KEY;
  }

  // Get from Parameter Store
  const parameterName =
    process.env.MCP_API_KEY_PARAMETER_NAME || "/mcp-server/api-key-value";
  const ssmClient = new SSMClient({});

  try {
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    });

    const response = await ssmClient.send(command);
    const apiKey = response.Parameter?.Value;

    if (!apiKey) {
      throw new Error(`API key not found in Parameter Store: ${parameterName}`);
    }

    console.log("Retrieved API key from Parameter Store");
    return apiKey;
  } catch (error) {
    console.error("Error retrieving API key from Parameter Store:", error);
    throw new Error(
      `Failed to retrieve API key from Parameter Store: ${(error as Error).message}`,
    );
  }
};
