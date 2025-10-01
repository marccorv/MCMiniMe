// lib/generate-local-embedding.ts
// Stub to disable local embeddings and avoid importing @xenova/transformers / onnxruntime-node.
// Do NOT import any '@xenova/transformers' or other native deps here.

export async function createEmbedding(_text: string): Promise<number[]> {
  throw new Error(
    'Local embeddings are disabled in this deployment. Set EMBEDDINGS_PROVIDER=openai (or another API provider).'
  );
}
