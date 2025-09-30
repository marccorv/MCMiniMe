export const runtime = "edge";

import { processDocx } from "@/lib/retrieval/processing";
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers";
import { Database } from "@/supabase/types";
import { FileItemChunk } from "@/types";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { text, fileId, embeddingsProvider, fileExtension } = json as {
      text: string;
      fileId: string;
      embeddingsProvider: "openai" | "local";
      fileExtension: string;
    };

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const profile = await getServerProfile();

    if (embeddingsProvider !== "openai") {
      return NextResponse.json(
        { error: "Local embeddings are disabled on this deployment." },
        { status: 400 }
      );
    }

    let chunks: FileItemChunk[] = [];
    switch (fileExtension) {
      case "docx":
        chunks = await processDocx(text);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported file type: ${fileExtension}` },
          { status: 400 }
        );
    }
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No text content found to embed." },
        { status: 400 }
      );
    }

    let openai: OpenAI;
    if (profile.use_azure_openai) {
      await checkApiKey(profile.azure_openai_api_key, "Azure OpenAI");
      openai = new OpenAI({
        apiKey: profile.azure_openai_api_key || "",
        baseURL: `${profile.azure_openai_endpoint}/openai/deployments/${profile.azure_openai_embeddings_id}`,
        defaultQuery: { "api-version": "2023-12-01-preview" },
        defaultHeaders: { "api-key": profile.azure_openai_api_key || "" },
      });
    } else {
      await checkApiKey(profile.openai_api_key, "OpenAI");
      openai = new OpenAI({
        apiKey: profile.openai_api_key || process.env.OPENAI_API_KEY,
        organization: profile.openai_organization_id || undefined,
      });
    }

    const resp = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks.map((c) => c.content),
    });

    const vectors = resp.data.map((d) => d.embedding);

    const items = chunks.map((c, i) => ({
      file_id: fileId,
      content: c.content,
      openai_embedding: vectors[i],
      tokens: c.tokens ?? 0,
    }));

    const { error } = await supabaseAdmin.from("file_items").insert(items);
    if (error) {
      return NextResponse.json(
        { error: `Supabase insert failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
