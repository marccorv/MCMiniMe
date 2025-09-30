// lib/generate-local-embedding.ts
import { pipeline } from "@xenova/transformers";

// Lazy-init the pipeline once for the serverless environment
let embeddingPipeline: any;

/**
 * Generate a local embedding for a single text string.
 * Returns a plain number[] suitable to store in Postgres vector columns.
 */
export async function generateLocalEmbedding(text: string): Promise<number[]> {
  if (!embeddingPipeline) {
    // Xenova model that runs without native deps (works on Vercel)
    embeddingPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }

  const output = await embeddingPipeline(text, { pooling: "mean", normalize: true });
  // Convert to a simple array
  return Array.from(output.data);
}
