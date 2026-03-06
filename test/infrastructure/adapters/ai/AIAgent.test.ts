import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

import { GeminiAgent } from "../../../../src/infrastructure/adapters/ai/AIAgent";

// Mock the @google/generative-ai module
jest.mock("@google/generative-ai");

describe("GeminiAgent", () => {
  let mockGoogleGenerativeAI: jest.MockedClass<typeof GoogleGenerativeAI>;
  let mockGenAIInstance: jest.Mocked<GoogleGenerativeAI>;
  let mockGenerativeModel: jest.Mocked<GenerativeModel>;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };

    // Create mock instances
    mockGenerativeModel = {} as jest.Mocked<GenerativeModel>;
    mockGenAIInstance = {
      getGenerativeModel: jest.fn().mockReturnValue(mockGenerativeModel),
    } as unknown as jest.Mocked<GoogleGenerativeAI>;

    // Mock the GoogleGenerativeAI constructor
    mockGoogleGenerativeAI = GoogleGenerativeAI as jest.MockedClass<
      typeof GoogleGenerativeAI
    >;
    mockGoogleGenerativeAI.mockImplementation(() => mockGenAIInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should create an instance with provided apiKey and modelName", () => {
      const apiKey = "test-api-key";
      const modelName = "test-model";

      const agent = new GeminiAgent(apiKey, modelName);

      expect(mockGoogleGenerativeAI).toHaveBeenCalledWith(apiKey);
      expect(agent).toBeInstanceOf(GeminiAgent);
    });

    it("should create an instance with only apiKey provided", () => {
      const apiKey = "test-api-key";
      process.env.GEMINI_MODEL = "env-model";

      const agent = new GeminiAgent(apiKey);

      expect(mockGoogleGenerativeAI).toHaveBeenCalledWith(apiKey);
      expect(agent).toBeInstanceOf(GeminiAgent);
    });

    it("should create an instance with only modelName provided", () => {
      const modelName = "test-model";
      process.env.GEMINI_API_KEY = "env-api-key";

      const agent = new GeminiAgent(undefined, modelName);

      expect(mockGoogleGenerativeAI).toHaveBeenCalledWith("env-api-key");
      expect(agent).toBeInstanceOf(GeminiAgent);
    });

    it("should create an instance using environment variables", () => {
      process.env.GEMINI_API_KEY = "env-api-key";
      process.env.GEMINI_MODEL = "env-model";

      const agent = new GeminiAgent();

      expect(mockGoogleGenerativeAI).toHaveBeenCalledWith("env-api-key");
      expect(agent).toBeInstanceOf(GeminiAgent);
    });

    it("should use default model when modelName not provided and env var not set", () => {
      process.env.GEMINI_API_KEY = "env-api-key";
      delete process.env.GEMINI_MODEL;

      const agent = new GeminiAgent();

      expect(mockGoogleGenerativeAI).toHaveBeenCalledWith("env-api-key");
      expect(agent).toBeInstanceOf(GeminiAgent);
    });

    it("should throw an error when apiKey is not provided and env var is not set", () => {
      delete process.env.GEMINI_API_KEY;

      expect(() => new GeminiAgent()).toThrow("Gemini API key not configured");
      expect(mockGoogleGenerativeAI).not.toHaveBeenCalled();
    });

    it("should throw an error when apiKey is empty string and env var is not set", () => {
      delete process.env.GEMINI_API_KEY;

      expect(() => new GeminiAgent("")).toThrow(
        "Gemini API key not configured",
      );
      expect(mockGoogleGenerativeAI).not.toHaveBeenCalled();
    });

    it("should prioritize provided apiKey over environment variable", () => {
      const providedApiKey = "provided-api-key";
      process.env.GEMINI_API_KEY = "env-api-key";

      new GeminiAgent(providedApiKey);

      expect(mockGoogleGenerativeAI).toHaveBeenCalledWith(providedApiKey);
      expect(mockGoogleGenerativeAI).not.toHaveBeenCalledWith("env-api-key");
    });

    it("should prioritize provided modelName over environment variable", () => {
      const providedModelName = "provided-model";
      process.env.GEMINI_API_KEY = "env-api-key";
      process.env.GEMINI_MODEL = "env-model";

      new GeminiAgent(undefined, providedModelName);

      expect(mockGoogleGenerativeAI).toHaveBeenCalledWith("env-api-key");
    });
  });

  describe("createAgent", () => {
    it("should return the GoogleGenerativeAI instance", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const agent = new GeminiAgent();

      const result = agent.createAgent();

      expect(result).toBe(mockGenAIInstance);
    });

    it("should return the same instance on multiple calls", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const agent = new GeminiAgent();

      const result1 = agent.createAgent();
      const result2 = agent.createAgent();

      expect(result1).toBe(result2);
      expect(result1).toBe(mockGenAIInstance);
    });
  });

  describe("getModel", () => {
    it("should return a GenerativeModel with the default model name", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const modelName = "test-model";
      const agent = new GeminiAgent(undefined, modelName);

      const result = agent.getModel();

      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: modelName,
      });
      expect(result).toBe(mockGenerativeModel);
    });

    it("should return a GenerativeModel with model name from environment variable", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      process.env.GEMINI_MODEL = "env-model";
      const agent = new GeminiAgent();

      const result = agent.getModel();

      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: "env-model",
      });
      expect(result).toBe(mockGenerativeModel);
    });

    it("should return a GenerativeModel with default model name when not specified", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      delete process.env.GEMINI_MODEL;
      const agent = new GeminiAgent();

      const result = agent.getModel();

      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-2.5-flash-lite",
      });
      expect(result).toBe(mockGenerativeModel);
    });

    it("should call getGenerativeModel with correct parameters on multiple calls", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const modelName = "test-model";
      const agent = new GeminiAgent(undefined, modelName);

      agent.getModel();
      agent.getModel();

      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledTimes(2);
      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenNthCalledWith(1, {
        model: modelName,
      });
      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenNthCalledWith(2, {
        model: modelName,
      });
    });
  });

  describe("getModelWithName", () => {
    it("should return a GenerativeModel with the provided model name", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const agent = new GeminiAgent();
      const customModelName = "custom-model-name";

      const result = agent.getModelWithName(customModelName);

      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: customModelName,
      });
      expect(result).toBe(mockGenerativeModel);
    });

    it("should return different models for different model names", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const agent = new GeminiAgent();
      const model1 = "model-1";
      const model2 = "model-2";

      const result1 = agent.getModelWithName(model1);
      const result2 = agent.getModelWithName(model2);

      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: model1,
      });
      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: model2,
      });
      expect(result1).toBe(mockGenerativeModel);
      expect(result2).toBe(mockGenerativeModel);
    });

    it("should handle empty string model name", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const agent = new GeminiAgent();

      const result = agent.getModelWithName("");

      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: "",
      });
      expect(result).toBe(mockGenerativeModel);
    });

    it("should handle special characters in model name", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const agent = new GeminiAgent();
      const specialModelName = "model-v1.2.3-beta";

      const result = agent.getModelWithName(specialModelName);

      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: specialModelName,
      });
      expect(result).toBe(mockGenerativeModel);
    });
  });
});
