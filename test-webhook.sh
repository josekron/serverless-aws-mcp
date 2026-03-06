#!/bin/bash

# Test script for MCP Client Webhook
# Usage: ./test-webhook.sh <imageUrl> <name>

WEBHOOK_URL="https://sa3r3sjx9h.execute-api.us-east-2.amazonaws.com/Prod/webhook"

# Default values if not provided
IMAGE_URL="${1:-https://raw.githubusercontent.com/modelcontextprotocol/specification/main/docs/mcp.png}"
NAME="${2:-John Doe}"

echo "Testing MCP Client Webhook..."
echo "Webhook URL: $WEBHOOK_URL"
echo "Image URL: $IMAGE_URL"
echo "Name: $NAME"
echo ""

# Make the POST request
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"imageUrl\": \"$IMAGE_URL\",
    \"name\": \"$NAME\"
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo "Test completed!"

