import { GeminiClient } from "../infrastructure/adapters/ai/AIClient";
import { AIProvider } from "../infrastructure/adapters/ai/AIProvider";
import { ImageProvider } from "../infrastructure/adapters/image/imageProvider";

export class ImageProcessor {
  private imageProvider: ImageProvider;
  private aiProvider: AIProvider;

  constructor() {
    this.imageProvider = new ImageProvider();
    const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview";
    const geminiApiKey =
      process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("Gemini API key not configured");
    }
    this.aiProvider = new AIProvider(
      new GeminiClient(geminiApiKey, geminiModel),
    );
  }

  async generateAltTextForImageUrl(
    imageUrl: string,
    userPrompt?: string,
  ): Promise<string | null> {
    const imageBuffer = await this.imageProvider.downloadImage(imageUrl);
    if (!imageBuffer) {
      return null;
    }
    const altText = await this.aiProvider.getAltTextForImage(
      imageBuffer,
      userPrompt,
    );
    return altText;
  }
}
