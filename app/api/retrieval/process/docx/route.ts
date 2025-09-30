// app/api/retrieval/process/docx/route.ts
export const runtime = "edge";

import { processDocx } from "@/lib/retrieval/processing";
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers";
import { Database } from "@/supabase/types";
import { FileItemChunk } from "@/types";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  const json = await req.json();
  const { text, fileId, fileExtension } = json as {
    text: string;
    fileId: string;
    fileExtension: string;
  };

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const profile = await getServerProfile();

    // Ensure a valid key is present
    if (profile.use_azure_openai) {
      checkApiKey(profile.azure_openai_api_key, "Azure OpenAI");
    } else {
      checkApiKey(profile.openai_api_key, "OpenAI");
    }

    // Chunk the file
    let chunks: FileItemChunk[] = [];
    switch (fileExtension) {
      case "docx":
        chunks = await processDocx(text);
        break;
      default:
        return new NextResponse("Unsupported file type", { status: 400 });
    }

    // Configure OpenAI / Azure OpenAI
    let openai: OpenAI;
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

    // Create embeddings (OpenAI only)
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks.map((c) => c.content),
    });
    const embeddings = response.data.map((d) => d.embedding as number[]);

    // Example save (adjust to your DB schema if needed)
    // await supabaseAdmin.from("file_items").upsert(
    //   chunks.map((c, i) => ({
    //     id: c.id,
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
      provider: "openai",
    });
  } catch (err: any) {
    console.error("[docx route] error:", err?.message || err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
