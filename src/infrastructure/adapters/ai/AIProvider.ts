import { AIClient } from "./AIClient";

export class AIProvider {
  private iaClient: AIClient;

  constructor(iaClient: AIClient) {
    this.iaClient = iaClient;
  }

  async getAltTextForImage(
    imageBuffer: Buffer,
    userPrompt?: string,
  ): Promise<string> {
    return this.iaClient.generateAltText(imageBuffer, userPrompt);
  }

  async generateText(prompt: string): Promise<string> {
    return this.iaClient.generateText(prompt);
  }
}
