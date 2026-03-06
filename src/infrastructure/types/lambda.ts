/* eslint-disable import/no-unresolved */
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
/* eslint-enable import/no-unresolved */

export interface LambdaEvent extends APIGatewayProxyEvent {
  headers: {
    [name: string]: string | undefined;
    "x-api-key"?: string;
    "X-API-Key"?: string;
  };
}

export interface LambdaContext extends Context {}

export interface LambdaResponse extends APIGatewayProxyResult {}

export interface CorsHeaders {
  [key: string]: string | number | boolean;
  "Access-Control-Allow-Origin": string;
  "Access-Control-Allow-Methods": string;
  "Access-Control-Allow-Headers": string;
  "Access-Control-Max-Age": string;
}

export interface ApiKeyValidationResult {
  statusCode: number;
  headers: {
    "Content-Type": string;
  } & CorsHeaders;
  body: string;
}
