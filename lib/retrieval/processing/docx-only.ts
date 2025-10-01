// lib/retrieval/processing/docx-only.ts
// Minimal, zero fs/pdf/langchain imports. Just split text into chunks.

import type { FileItemChunk } from '@/types';

function chunkText(text: string, chunkSize = 800, overlap = 100): FileItemChunk[] {
  const chunks: FileItemChunk[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + chunkSize);
    const content = text.slice(i, end);
    chunks.push({ content, tokens: content.length });
    i = Math.max(0, end - overlap);
  }
  return chunks;
}

export async function processDocx(text: string): Promise<FileItemChunk[]> {
  // If you ever need true .docx parsing on the server, do it here with a
  // *lazy import* to a library that works on Node (not Edge) — but keep it lazy.
  return chunkText(text);
}
