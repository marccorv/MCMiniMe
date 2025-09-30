import { pipeline } from "@xenova/transformers";

// Initialize the embedding pipeline once (lazy-loaded)
let embedder: any = null;

export async function generateLocalEmbedding(content: string): Promise<number[]> {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  const result = await embedder(content, { pooling: "mean", normalize: true });
  return Array.from(result.data);
}
