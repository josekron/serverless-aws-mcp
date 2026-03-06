import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

export interface AIClient {
  generateAltText(imageBuffer: Buffer, userPrompt?: string): Promise<string>;
  generateText(prompt: string): Promise<string>;
}

export class GeminiClient implements AIClient {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async generateAltText(
    imageBuffer: Buffer,
    userPrompt?: string,
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.model });

    const image = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    const parts: Array<
      { inlineData: { data: string; mimeType: string } } | { text: string }
    > = [image];
    const prompt =
      "Generate a short alt-text for this picture. Focus the alt-text in the main object and include any text in the main object as a branding. Return only the alt-text without any additional text or explanation.";
    if (userPrompt) {
      parts.push({ text: `${prompt}. Consider this feedback: ${userPrompt}` });
    } else {
      parts.push({ text: prompt });
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });
    const response = result.response;
    return response.text();
  }

  async generateText(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.model });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const response = result.response;
    return response.text();
  }
}
