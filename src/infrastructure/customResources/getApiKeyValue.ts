import * as https from "https";
import { URL } from "url";

import {
  APIGatewayClient,
  GetApiKeyCommand,
} from "@aws-sdk/client-api-gateway";
import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";
// eslint-disable-next-line import/no-unresolved
import { CloudFormationCustomResourceEvent, Context } from "aws-lambda";

const apigateway = new APIGatewayClient({});
const ssm = new SSMClient({});

/**
 * Sends a response to CloudFormation
 */
const sendResponse = (
  event: CloudFormationCustomResourceEvent,
  status: "SUCCESS" | "FAILED",
  physicalResourceId: string,
  data?: Record<string, unknown>,
  reason?: string,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const responseBody = JSON.stringify({
      Status: status,
      Reason:
        reason ||
        `See the details in CloudWatch Log Stream: ${event.LogicalResourceId}`,
      PhysicalResourceId: physicalResourceId,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: data || {},
    });

    const parsedUrl = new URL(event.ResponseURL);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "PUT",
      headers: {
        "content-type": "",
        "content-length": responseBody.length,
      },
    };

    const request = https.request(options, (response) => {
      response.on("end", () => {
        console.log("Successfully sent response to CloudFormation");
        resolve();
      });
    });

    request.on("error", (error) => {
      console.error("Error sending response to CloudFormation:", error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
};

export const handler = async (
  event: CloudFormationCustomResourceEvent,
  _context: Context,
) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const apiKeyId = event.ResourceProperties?.ApiKeyId;
  const parameterName = event.ResourceProperties?.ParameterName;

  if (!apiKeyId || !parameterName) {
    const error = "ApiKeyId and ParameterName are required";
    console.error(error);
    await sendResponse(
      event,
      "FAILED",
      event.LogicalResourceId || "unknown",
      undefined,
      error,
    );
    return;
  }

  try {
    if (event.RequestType === "Create" || event.RequestType === "Update") {
      // Get the API key value
      const getApiKeyCommand = new GetApiKeyCommand({
        apiKey: apiKeyId,
        includeValue: true,
      });

      const apiKeyResponse = await apigateway.send(getApiKeyCommand);
      const apiKeyValue = apiKeyResponse.value;

      if (!apiKeyValue) {
        throw new Error("API key value not found");
      }

      // Store in Parameter Store
      const putParameterCommand = new PutParameterCommand({
        Name: parameterName,
        Value: apiKeyValue,
        Type: "SecureString",
        Overwrite: true,
        Description: "MCP Server API Key Value",
      });

      await ssm.send(putParameterCommand);

      console.log(
        `Successfully stored API key value in Parameter Store: ${parameterName}`,
      );

      await sendResponse(event, "SUCCESS", parameterName, {
        ParameterName: parameterName,
      });
    } else if (event.RequestType === "Delete") {
      // Optionally delete the parameter on stack deletion
      // For security, we might want to keep it, so we'll just return success
      console.log("Delete requested, but keeping parameter for security");
      await sendResponse(event, "SUCCESS", parameterName);
    } else {
      // Default for any other request type
      await sendResponse(event, "SUCCESS", parameterName);
    }
  } catch (error) {
    console.error("Error:", error);
    await sendResponse(
      event,
      "FAILED",
      parameterName || event.LogicalResourceId || "unknown",
      undefined,
      (error as Error).message,
    );
  }
};
