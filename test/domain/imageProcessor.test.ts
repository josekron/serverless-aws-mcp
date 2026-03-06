import { ImageProcessor } from "../../src/domain/imageProcessor";
import { AIProvider } from "../../src/infrastructure/adapters/ai/AIProvider";
import { ImageProvider } from "../../src/infrastructure/adapters/image/imageProvider";

// Mock the dependencies
jest.mock("../../src/infrastructure/adapters/image/imageProvider");
jest.mock("../../src/infrastructure/adapters/ai/AIProvider");
jest.mock("../../src/infrastructure/adapters/ai/AIClient");

describe("ImageProcessor", () => {
  let imageProcessor: ImageProcessor;
  let mockImageProvider: jest.Mocked<ImageProvider>;
  let mockAIProvider: jest.Mocked<AIProvider>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock environment variables
    process.env.GEMINI_API_KEY = "test-api-key";
    process.env.GEMINI_MODEL = "test-model";

    // Create mock instances
    mockImageProvider = {
      downloadImage: jest.fn(),
    } as jest.Mocked<ImageProvider>;

    mockAIProvider = {
      getAltTextForImage: jest.fn(),
      generateText: jest.fn(),
    } as unknown as jest.Mocked<AIProvider>;

    // Mock the constructors
    (
      ImageProvider as jest.MockedClass<typeof ImageProvider>
    ).mockImplementation(() => mockImageProvider);
    (AIProvider as jest.MockedClass<typeof AIProvider>).mockImplementation(
      () => mockAIProvider,
    );

    imageProcessor = new ImageProcessor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default environment variables", () => {
      expect(ImageProvider).toHaveBeenCalled();
      expect(AIProvider).toHaveBeenCalled();
    });

    it("should throw error when GEMINI_API_KEY is not configured", () => {
      // Clear the environment variable
      const originalApiKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      // Should throw because there's no fallback API key in the code now
      expect(() => new ImageProcessor()).toThrow("Gemini API key not configured");

      // Restore the original value
      if (originalApiKey) {
        process.env.GEMINI_API_KEY = originalApiKey;
      }
    });

    it("should use default model when GEMINI_MODEL is not set", () => {
      delete process.env.GEMINI_MODEL;
      process.env.GEMINI_API_KEY = "test-key";

      new ImageProcessor();

      expect(AIProvider).toHaveBeenCalled();
    });
  });

  describe("generateAltTextForImageUrl", () => {
    const mockImageUrl = "https://example.com/image.jpg";
    const mockImageBuffer = Buffer.from("mock-image-data");
    const mockAltText = "A beautiful landscape";

    it("should successfully generate alt text for image URL", async () => {
      mockImageProvider.downloadImage.mockResolvedValue(mockImageBuffer);
      mockAIProvider.getAltTextForImage.mockResolvedValue(mockAltText);

      const result =
        await imageProcessor.generateAltTextForImageUrl(mockImageUrl);

      expect(mockImageProvider.downloadImage).toHaveBeenCalledWith(
        mockImageUrl,
      );
      expect(mockAIProvider.getAltTextForImage).toHaveBeenCalledWith(
        mockImageBuffer,
        undefined,
      );
      expect(result).toBe(mockAltText);
    });

    it("should generate alt text with user prompt", async () => {
      const userPrompt = "Focus on the main subject";
      mockImageProvider.downloadImage.mockResolvedValue(mockImageBuffer);
      mockAIProvider.getAltTextForImage.mockResolvedValue(mockAltText);

      const result = await imageProcessor.generateAltTextForImageUrl(
        mockImageUrl,
        userPrompt,
      );

      expect(mockImageProvider.downloadImage).toHaveBeenCalledWith(
        mockImageUrl,
      );
      expect(mockAIProvider.getAltTextForImage).toHaveBeenCalledWith(
        mockImageBuffer,
        userPrompt,
      );
      expect(result).toBe(mockAltText);
    });

    it("should return null when image download fails", async () => {
      mockImageProvider.downloadImage.mockResolvedValue(null);

      const result =
        await imageProcessor.generateAltTextForImageUrl(mockImageUrl);

      expect(mockImageProvider.downloadImage).toHaveBeenCalledWith(
        mockImageUrl,
      );
      expect(mockAIProvider.getAltTextForImage).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should return null when image download returns null", async () => {
      mockImageProvider.downloadImage.mockResolvedValue(null);

      const result =
        await imageProcessor.generateAltTextForImageUrl(mockImageUrl);

      expect(mockImageProvider.downloadImage).toHaveBeenCalledWith(
        mockImageUrl,
      );
      expect(mockAIProvider.getAltTextForImage).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should handle image download errors", async () => {
      const error = new Error("Download failed");
      mockImageProvider.downloadImage.mockRejectedValue(error);

      await expect(
        imageProcessor.generateAltTextForImageUrl(mockImageUrl),
      ).rejects.toThrow("Download failed");
      expect(mockImageProvider.downloadImage).toHaveBeenCalledWith(
        mockImageUrl,
      );
      expect(mockAIProvider.getAltTextForImage).not.toHaveBeenCalled();
    });

    it("should handle AI provider errors", async () => {
      const error = new Error("AI service error");
      mockImageProvider.downloadImage.mockResolvedValue(mockImageBuffer);
      mockAIProvider.getAltTextForImage.mockRejectedValue(error);

      await expect(
        imageProcessor.generateAltTextForImageUrl(mockImageUrl),
      ).rejects.toThrow("AI service error");
      expect(mockImageProvider.downloadImage).toHaveBeenCalledWith(
        mockImageUrl,
      );
      expect(mockAIProvider.getAltTextForImage).toHaveBeenCalledWith(
        mockImageBuffer,
        undefined,
      );
    });

    it("should handle empty image URL", async () => {
      mockImageProvider.downloadImage.mockResolvedValue(null);

      const result = await imageProcessor.generateAltTextForImageUrl("");

      expect(mockImageProvider.downloadImage).toHaveBeenCalledWith("");
      expect(mockAIProvider.getAltTextForImage).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should handle undefined user prompt", async () => {
      mockImageProvider.downloadImage.mockResolvedValue(mockImageBuffer);
      mockAIProvider.getAltTextForImage.mockResolvedValue(mockAltText);

      const result = await imageProcessor.generateAltTextForImageUrl(
        mockImageUrl,
        undefined,
      );

      expect(mockImageProvider.downloadImage).toHaveBeenCalledWith(
        mockImageUrl,
      );
      expect(mockAIProvider.getAltTextForImage).toHaveBeenCalledWith(
        mockImageBuffer,
        undefined,
      );
      expect(result).toBe(mockAltText);
    });

    it("should handle empty string user prompt", async () => {
      const userPrompt = "";
      mockImageProvider.downloadImage.mockResolvedValue(mockImageBuffer);
      mockAIProvider.getAltTextForImage.mockResolvedValue(mockAltText);

      const result = await imageProcessor.generateAltTextForImageUrl(
        mockImageUrl,
        userPrompt,
      );

      expect(mockImageProvider.downloadImage).toHaveBeenCalledWith(
        mockImageUrl,
      );
      expect(mockAIProvider.getAltTextForImage).toHaveBeenCalledWith(
        mockImageBuffer,
        userPrompt,
      );
      expect(result).toBe(mockAltText);
    });
  });
});
