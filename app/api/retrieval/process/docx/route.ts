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
    // Supabase admin client
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get profile
    const profile = await getServerProfile();

    // Validate API keys for OpenAI/Azure
    if (embeddingsProvider === "openai") {
      if (profile.use_azure_openai) {
        checkApiKey(profile.azure_openai_api_key, "Azure OpenAI");
      } else {
        checkApiKey(profile.openai_api_key, "OpenAI");
      }
    }

    // Parse docx chunks
    let chunks: FileItemChunk[] = [];
    switch (fileExtension) {
      case "docx":
        chunks = await processDocx(text);
        break;
      default:
        return new NextResponse("Unsupported file type", { status: 400 });
    }

    // --- Build embeddings (OpenAI vs Local WASM) ---
    let embeddings: number[][] = [];

    if (embeddingsProvider === "openai") {
      const openai = profile.use_azure_openai
        ? new OpenAI({
            apiKey: profile.azure_openai_api_key || "",
            baseURL: `${profile.azure_openai_endpoint}/openai/deployments/${profile.azure_openai_embeddings_id}`,
            defaultQuery: { "api-version": "2023-12-01-preview" },
            defaultHeaders: { "api-key": profile.azure_openai_api_key },
          })
        : new OpenAI({
            apiKey: profile.openai_api_key || "",
            organization: profile.openai_organization_id,
          });

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunks.map((chunk) => chunk.content),
      });

      embeddings = response.data.map((item: any) => item.embedding as number[]);
    } else {
      // Local path: Xenova (WASM)
      embeddings = await Promise.all(
        chunks.map((chunk) => generateLocalEmbedding(chunk.content))
      );
    }
    // --- end embeddings ---

    // TODO: store embeddings into Supabase or return response
    return NextResponse.json({ success: true, embeddingsCount: embeddings.length });
  } catch (err: any) {
    console.error("Error in /process/docx:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
