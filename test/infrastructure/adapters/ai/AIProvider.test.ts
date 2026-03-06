import { AIClient } from "../../../../src/infrastructure/adapters/ai/AIClient";
import { AIProvider } from "../../../../src/infrastructure/adapters/ai/AIProvider";

describe("AIProvider", () => {
  let aiProvider: AIProvider;
  let mockAIClient: jest.Mocked<AIClient>;

  beforeEach(() => {
    mockAIClient = {
      generateAltText: jest.fn(),
      generateText: jest.fn(),
    };
    aiProvider = new AIProvider(mockAIClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAltTextForImage", () => {
    it("should call the AI client with image buffer and return the result", async () => {
      const mockImageBuffer = Buffer.from("mock-image-data");
      const expectedAltText = "A beautiful landscape with mountains and trees";

      mockAIClient.generateAltText.mockResolvedValue(expectedAltText);

      const result = await aiProvider.getAltTextForImage(mockImageBuffer);

      expect(mockAIClient.generateAltText).toHaveBeenCalledWith(
        mockImageBuffer,
        undefined,
      );
      expect(result).toBe(expectedAltText);
    });

    it("should call the AI client with image buffer and user prompt", async () => {
      const mockImageBuffer = Buffer.from("mock-image-data");
      const userPrompt = "Focus on the main subject in the image";
      const expectedAltText = "A person standing in front of a building";

      mockAIClient.generateAltText.mockResolvedValue(expectedAltText);

      const result = await aiProvider.getAltTextForImage(
        mockImageBuffer,
        userPrompt,
      );

      expect(mockAIClient.generateAltText).toHaveBeenCalledWith(
        mockImageBuffer,
        userPrompt,
      );
      expect(result).toBe(expectedAltText);
    });

    it("should handle AI client errors", async () => {
      const mockImageBuffer = Buffer.from("mock-image-data");
      const error = new Error("AI service unavailable");

      mockAIClient.generateAltText.mockRejectedValue(error);

      await expect(
        aiProvider.getAltTextForImage(mockImageBuffer),
      ).rejects.toThrow("AI service unavailable");
      expect(mockAIClient.generateAltText).toHaveBeenCalledWith(
        mockImageBuffer,
        undefined,
      );
    });

    it("should handle empty image buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);
      const expectedAltText = "Empty image";

      mockAIClient.generateAltText.mockResolvedValue(expectedAltText);

      const result = await aiProvider.getAltTextForImage(emptyBuffer);

      expect(mockAIClient.generateAltText).toHaveBeenCalledWith(
        emptyBuffer,
        undefined,
      );
      expect(result).toBe(expectedAltText);
    });

    it("should handle null user prompt", async () => {
      const mockImageBuffer = Buffer.from("mock-image-data");
      const expectedAltText = "A generic image description";

      mockAIClient.generateAltText.mockResolvedValue(expectedAltText);

      const result = await aiProvider.getAltTextForImage(
        mockImageBuffer,
        null as unknown as string | undefined,
      );

      expect(mockAIClient.generateAltText).toHaveBeenCalledWith(
        mockImageBuffer,
        null,
      );
      expect(result).toBe(expectedAltText);
    });

    it("should handle undefined user prompt", async () => {
      const mockImageBuffer = Buffer.from("mock-image-data");
      const expectedAltText = "A generic image description";

      mockAIClient.generateAltText.mockResolvedValue(expectedAltText);

      const result = await aiProvider.getAltTextForImage(
        mockImageBuffer,
        undefined,
      );

      expect(mockAIClient.generateAltText).toHaveBeenCalledWith(
        mockImageBuffer,
        undefined,
      );
      expect(result).toBe(expectedAltText);
    });

    it("should handle empty string user prompt", async () => {
      const mockImageBuffer = Buffer.from("mock-image-data");
      const userPrompt = "";
      const expectedAltText = "A generic image description";

      mockAIClient.generateAltText.mockResolvedValue(expectedAltText);

      const result = await aiProvider.getAltTextForImage(
        mockImageBuffer,
        userPrompt,
      );

      expect(mockAIClient.generateAltText).toHaveBeenCalledWith(
        mockImageBuffer,
        userPrompt,
      );
      expect(result).toBe(expectedAltText);
    });
  });
});
