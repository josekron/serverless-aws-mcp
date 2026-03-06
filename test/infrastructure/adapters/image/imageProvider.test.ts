import { ImageProvider } from "../../../../src/infrastructure/adapters/image/imageProvider";

// Mock fetch globally
global.fetch = jest.fn();

describe("ImageProvider", () => {
  let imageProvider: ImageProvider;

  beforeEach(() => {
    imageProvider = new ImageProvider();
    jest.clearAllMocks();
  });

  describe("downloadImage", () => {
    it("should successfully download an image and return a Buffer", async () => {
      const mockImageData = new ArrayBuffer(8);
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockImageData),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await imageProvider.downloadImage(
        "https://example.com/image.jpg",
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/image.jpg",
      );
      expect(mockResponse.arrayBuffer).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
      expect(result).toEqual(Buffer.from(mockImageData));
    });

    it("should return null when response is not ok", async () => {
      const mockResponse = {
        ok: false,
        statusText: "Not Found",
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await imageProvider.downloadImage(
        "https://example.com/notfound.jpg",
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/notfound.jpg",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to download image from https://example.com/notfound.jpg: Not Found",
      );
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should return null when fetch throws an error", async () => {
      const error = new Error("Network error");
      (global.fetch as jest.Mock).mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await imageProvider.downloadImage(
        "https://example.com/image.jpg",
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/image.jpg",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error downloading image https://example.com/image.jpg:",
        error,
      );
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should handle arrayBuffer rejection", async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest
          .fn()
          .mockRejectedValue(new Error("ArrayBuffer error")),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await imageProvider.downloadImage(
        "https://example.com/image.jpg",
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/image.jpg",
      );
      expect(mockResponse.arrayBuffer).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error downloading image https://example.com/image.jpg:",
        expect.any(Error),
      );
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should handle empty URL", async () => {
      const mockResponse = {
        ok: false,
        statusText: "Bad Request",
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await imageProvider.downloadImage("");

      expect(global.fetch).toHaveBeenCalledWith("");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to download image from : Bad Request",
      );
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });
});
