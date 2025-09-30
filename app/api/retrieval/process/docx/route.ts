// app/api/retrieval/process/docx/route.ts
export const runtime = "edge";

import { generateLocalEmbedding } from "@/lib/generate-local-embedding";
import { processDocx } from "@/lib/retrieval/processing";
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers";
import { Database } from "@/supabase/types";
import { FileItemChunk } from "@/types";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import OpenAI from "openai";

// POST handler
export async function POST(req: Request) {
  const json = await req.json();
  const { text, fileId, embeddingsProvider, fileExtension } = json as {
    text: string;
    fileId: string;
    embeddingsProvider: "openai" | "local";
    fileExtension: string;
  };

  try {
    // Supabase (admin) – uses env vars already configured in your project
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const profile = await getServerProfile();

    // Enforce the correct key depending on provider
    if (embeddingsProvider === "openai") {
      if (profile.use_azure_openai) {
        checkApiKey(profile.azure_openai_api_key, "Azure OpenAI");
      } else {
        checkApiKey(profile.openai_api_key, "OpenAI");
      }
    }

    // Break content into chunks (uses your existing helper)
    let chunks: FileItemChunk[] = [];

    switch (fileExtension) {
      case "docx":
        chunks = await processDocx(text);
        break;
      default:
        return new NextResponse("Unsupported file type", { status: 400 });
    }

    // Prepare OpenAI client (used only when embeddingsProvider === "openai")
    let openai: OpenAI | null = null;
    if (embeddingsProvider === "openai") {
      if (profile.use_azure_openai) {
        openai = new OpenAI({
          apiKey: profile.azure_openai_api_key || "",
          baseURL: `${profile.azure_openai_endpoint}/openai/deployments/${profile.azure_openai_embeddings_id}`,
          defaultQuery: { "api-version": "2023-12-01-preview" },
          defaultHeaders: { "api-key": profile.azure_openai_api_key },
        });
      } else {
        openai = new OpenAI({
          apiKey: profile.openai_api_key || "",
          organization: profile.openai_organization_id || undefined,
        });
      }
    }

    // Create embeddings
    let embeddings: number[][] = [];

    if (embeddingsProvider === "openai") {
      // OpenAI embeddings
      const response = await openai!.embeddings.create({
        model: "text-embedding-3-small",
        input: chunks.map((c) => c.content),
      });
      embeddings = response.data.map((d) => d.embedding as number[]);
    } else {
      // Local embeddings via Xenova (no native deps)
      embeddings = await Promise.all(
        chunks.map((c) => generateLocalEmbedding(c.content))
      );
    }

    // Save (or update) the chunks + embeddings into your DB
    // (This assumes you already have the table and logic wired; only the embeddings generation changed.)
    // Example upsert (adjust to your schema):
    // await supabaseAdmin.from("file_items").upsert(
    //   chunks.map((c, i) => ({
    //     id: c.id,                // or whatever identifier you use
    //     file_id: fileId,
    //     content: c.content,
    //     embedding: embeddings[i],
    //   })),
    //   { onConflict: "id" }
    // );

    return NextResponse.json({
      ok: true,
      chunks: chunks.length,
      embeddings: embeddings.length,
      provider: embeddingsProvider,
    });
  } catch (err: any) {
    console.error("[docx route] error:", err?.message || err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
