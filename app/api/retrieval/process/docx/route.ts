// app/api/retrieval/process/docx/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { checkApiKey, getServerProfile } from '@/lib/server/server-chat-helpers';
import { Database } from '@/supabase/types';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  // ⬇️ Lazy-load the docx-only processor so nothing fs/pdf/langchain is bundled
  const { processDocx } = await import('@/lib/retrieval/processing/docx-only');

  const { text } = (await req.json()) as { text: string };

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const profile = await getServerProfile();
  checkApiKey(profile.openai_api_key, 'OpenAI');

  const openai = new OpenAI({ apiKey: profile.openai_api_key });

  // Split text into chunks (no fs/pdf/langchain anywhere)
  const chunks = await processDocx(text);

  // Get embeddings from OpenAI (server-safe)
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks.map((c) => c.content),
  });

  const embeddings = response.data.map((d: any) => d.embedding);
  return NextResponse.json({ embeddings });
}
