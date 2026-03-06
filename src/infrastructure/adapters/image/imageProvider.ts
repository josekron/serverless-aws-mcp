export class ImageProvider {
  async downloadImage(url: string): Promise<Buffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `Failed to download image from ${url}: ${response.statusText}`,
        );
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error(`Error downloading image ${url}:`, error);
      return null;
    }
  }
}
