export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// app/api/retrieval/process/docx/route.ts
import { processDocx } from "@/lib/retrieval/processing";
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers";
import { Database } from "@/supabase/types";
import { FileItemChunk } from "@/types";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

export async function POST(req: Request) {
  const json = await req.json();
  const { text } = json as { text: string };

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const profile = await getServerProfile();
  checkApiKey(profile.openai_api_key, "OpenAI");

  const openai = new OpenAI({ apiKey: profile.openai_api_key });

  // split DOCX text into chunks (already implemented in your repo)
  const chunks: FileItemChunk[] = await processDocx(text);

  // OpenAI embeddings only — no local/onnx
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks.map((c) => c.content),
  });

  const embeddings = response.data.map((d: any) => d.embedding);
  return NextResponse.json({ embeddings });
}
