// pages/api/ask.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// --- Supabase server client (uses service role; safe on server) ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Local embedder with Xenova (same model as ingest-local.ts) ---
let cachedEmbedder: null | ((text: string) => Promise<number[]>) = null;

async function getEmbedder() {
  if (cachedEmbedder) return cachedEmbedder;
  const { pipeline, env } = await import("@xenova/transformers");
  env.allowLocalModels = true;
  env.localModelPath = ".transformers-cache";
  const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  cachedEmbedder = async (text: string) => {
    const out: any = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array); // 384-dim
  };
  return cachedEmbedder;
}

// --- LLM via OpenAI SDK (pointed at Groq with your envs) ---
function llm() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  });
}
const MODEL = process.env.OPENAI_MODEL || "llama-3.1-8b-instant";

// --- Handler ---
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Use POST { q: string }" });
    }

    const q = (req.body?.q ?? "").toString().trim();
    if (!q) return res.status(400).json({ error: "Missing body.q" });

    // 1) Local embedding (no API cost)
    const embed = await (await getEmbedder())(q);

    // 2) Vector search in Supabase
    const { data: matches, error } = await supabase.rpc("match_documents", {
      query_embedding: embed,
      match_count: 5,
    });
    if (error) return res.status(500).json({ error: `match_documents: ${error.message}` });

    const context = (matches ?? [])
      .map((m: any, i: number) => `# Doc ${i + 1}: ${m.title}\n${m.content}`)
      .join("\n\n");

    const system = `You are a concise assistant. Use ONLY the provided documents.
If the answer isn't in them, say "I don't know based on the provided documents."`;

    const prompt = `Documents:\n\n${context}\n\nQuestion: ${q}\nAnswer:`;

    // 3) Call Groq (through OpenAI SDK)
    const client = llm();
    const r = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    });

    const answer = r.choices[0]?.message?.content ?? "";
    return res.status(200).json({ answer, sources: matches ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
