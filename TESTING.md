# Testing the MCP Client

## Quick Test

Use the following curl command to test the MCP client webhook:

```bash
curl -X POST "https://sa3r3sjx9h.execute-api.us-east-2.amazonaws.com/Prod/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://raw.githubusercontent.com/modelcontextprotocol/specification/main/docs/mcp.png",
    "name": "John Doe"
  }'
```

## Expected Response

The webhook should return a JSON response with:
- `success`: true/false
- `message`: Final response from the intelligent agent
- `agentAnalysis`: Detailed information about the agent's decision-making process
  - `query`: The query that was analyzed
  - `availableTools`: List of tools discovered from the MCP server
  - `agentDecision`: The agent's reasoning and tool selection
  - `toolExecutionResults`: Results from executing the selected tools
- `processedAt`: Timestamp of when the request was processed

## Example Response

```json
{
  "success": true,
  "message": "Hello John Doe! I've analyzed your image and here's what I found...",
  "agentAnalysis": {
    "query": "I have an image at https://... and a person named John Doe...",
    "availableTools": [
      {"name": "getAltTextForImage", "description": "..."},
      {"name": "tellMeSomethingNow", "description": "..."},
      {"name": "additionInText", "description": "..."}
    ],
    "agentDecision": {
      "reasoning": "I need to generate alt text for the image and create a personalized message",
      "toolCalls": [
        {"name": "getAltTextForImage", "arguments": {...}},
        {"name": "tellMeSomethingNow", "arguments": {...}}
      ],
      "initialResponse": "..."
    },
    "toolExecutionResults": {
      "getAltTextForImage": {...},
      "tellMeSomethingNow": {...}
    }
  },
  "processedAt": "2024-01-15T10:30:00.000Z"
}
```

## Testing with Different Images

You can test with different images by changing the `imageUrl`:

```bash
curl -X POST "https://sa3r3sjx9h.execute-api.us-east-2.amazonaws.com/Prod/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/your-image.jpg",
    "name": "Jane Smith"
  }'
```

## Testing the MCP Server Directly

To test the MCP server directly (requires API key):

```bash
# Get the API key from AWS Console or use the value from deployment output
API_KEY="qwgce2px4a"

curl -X POST "https://sa3r3sjx9h.execute-api.us-east-2.amazonaws.com/Prod/mcp" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

## Troubleshooting

If you encounter errors:

1. **Check CloudWatch Logs**: Look at the Lambda function logs in CloudWatch to see detailed error messages
2. **Verify API Key**: Make sure the API key is correctly configured in the MCP client function
3. **Check Network**: Ensure the Lambda function can reach the MCP server endpoint
4. **Verify Environment Variables**: Check that all required environment variables are set correctly

## Using the Test Script

You can also use the provided test script:

```bash
./test-webhook.sh "https://example.com/image.jpg" "Your Name"
```

Or with default values:

```bash
./test-webhook.sh
```

