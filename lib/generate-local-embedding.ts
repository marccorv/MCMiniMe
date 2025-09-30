// lib/generate-local-embedding.ts

// Hint TFJS to use WASM when needed (safe on Vercel)
process.env.TFJS_BACKEND = "wasm";

import { pipeline } from "@xenova/transformers";

/**
 * Returns an embedding vector using Xenova (WASM) – no native binaries.
 */
export async function generateLocalEmbedding(content: string) {
  const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  const output = await extractor(content, { pooling: "mean", normalize: true });
  // output can be a TypedArray or an object with .data; flatten to plain array
  return Array.from((output as any).data ?? output);
}
