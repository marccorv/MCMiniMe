// app/api/retrieval/process/docx/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { checkApiKey, getServerProfile } from '@/lib/server/server-chat-helpers';
import { Database } from '@/supabase/types';
import { FileItemChunk } from '@/types';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  // lazy-load the docx processor so fs/pdf deps aren’t bundled at build
  const { processDocx } = await import('@/lib/retrieval/processing');

  const json = await req.json();
  const { text } = json as { text: string };

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const profile = await getServerProfile();
  checkApiKey(profile.openai_api_key, 'OpenAI');

  const openai = new OpenAI({ apiKey: profile.openai_api_key });

  // split DOCX text into chunks (your lib already implements this)
  const chunks: FileItemChunk[] = await processDocx(text);

  // OpenAI embeddings only — no local/onnx code runs here
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks.map((c) => c.content),
  });

  const embeddings = response.data.map((d: any) => d.embedding);
  return NextResponse.json({ embeddings });
}
