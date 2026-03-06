import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

export interface AIAgent {
  createAgent(): GoogleGenerativeAI;
  getModel(): GenerativeModel;
  getModelWithName(modelName: string): GenerativeModel;
}

export class GeminiAgent implements AIAgent {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("Gemini API key not configured");
    }
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.modelName =
      modelName || process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  }

  /**
   * Creates a Gemini AI instance
   */
  createAgent(): GoogleGenerativeAI {
    return this.genAI;
  }

  /**
   * Gets a generative model instance
   */
  getModel(): GenerativeModel {
    return this.genAI.getGenerativeModel({ model: this.modelName });
  }

  /**
   * Gets a generative model instance with a custom model name
   */
  getModelWithName(modelName: string): GenerativeModel {
    return this.genAI.getGenerativeModel({ model: modelName });
  }
}
