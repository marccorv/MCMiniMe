import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { pipeline, env as xenEnv } from "@xenova/transformers";

// --- OpenAI SDK pointed at Groq (or OpenAI if you change the base URL) ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});
const MODEL = process.env.OPENAI_MODEL || "llama-3.1-8b-instant";

// --- Supabase (service role needed for RPC) ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Local, CPU-only embedder (Xenova all-MiniLM-L6-v2) with caching ---
let embedderPromise: ReturnType<typeof pipeline> | null = null;
async function getEmbedder() {
  if (!embedderPromise) {
    xenEnv.allowLocalModels = true;
    xenEnv.localModelPath = ".transformers-cache";
    embedderPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  const pipe = await embedderPromise;
  return async (text: string) => {
    const out: any = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array) as number[]; // length 384
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Body might already be parsed, or it might be a JSON string
    const raw = (req.body ?? {}) as any;
    const body = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;

    // Accept question under any of these keys
    const question =
      [body?.question, body?.q, body?.query, body?.prompt]
        .find((v) => typeof v === "string" && v.trim().length > 0) as
        | string
        | undefined;

    if (!question) {
      return res.status(400).json({
        error: "Missing question",
        hint: "Send JSON with one of: question | q | query | prompt",
      });
    }

    // 1) Embed the query
    const embed = await getEmbedder();
    const qEmbedding = await embed(question);

    // 2) Retrieve top matches from Supabase (RPC match_documents)
    const { data: matches, error: rpcError } = await supabase.rpc(
      "match_documents",
      {
        query_embedding: qEmbedding,
        match_count: 5,
      }
    );
    if (rpcError) {
      return res
        .status(500)
        .json({ error: "match_documents failed", detail: rpcError.message });
    }

    const context = (matches ?? [])
      .map((m: any) => `- ${m.title}: ${m.content}`)
      .join("\n");

    // 3) Ask the model via OpenAI SDK (Groq baseURL)
    const system =
      "You are a helpful assistant. Answer ONLY using the provided CONTEXT. If the answer isn't in the context, say you don't know.";
    const user = `CONTEXT:\n${context}\n\nQUESTION: ${question}\n\nANSWER:`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
    });

    const answer = completion.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ answer, sources: matches ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
