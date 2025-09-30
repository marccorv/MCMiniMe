import { pipeline } from "@xenova/transformers";

// Lazy-load the embedding pipeline
let embeddingPipeline: any;

export async function generateLocalEmbedding(text: string) {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }

  const output = await embeddingPipeline(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
