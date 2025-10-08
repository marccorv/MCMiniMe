import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { pipeline, env as xenovaEnv } from "@xenova/transformers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

let cachedEmbedder:
  | ((text: string) => Promise<number[]>)
  | null = null;

async function getEmbedder() {
  if (cachedEmbedder) return cachedEmbedder;

  xenovaEnv.allowLocalModels = true;
  xenovaEnv.localModelPath = ".transformers-cache";

  const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  cachedEmbedder = async (text: string) => {
    const out = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array) as number[]; // length 384
  };
  return cachedEmbedder;
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});
const MODEL = process.env.OPENAI_MODEL || "llama-3.1-8b-instant";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST" });
    }
    let body: any = req.body;
    if (!body || typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch { body = {}; }
    }

    const question: string | undefined = body.question || body.q;
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "Missing body.question (or q)" });
    }

    const embed = await getEmbedder();
    const queryEmbedding = await embed(question);

    const { data: matches, error: matchErr } = await supabase.rpc(
      "match_documents",
      { query_embedding: queryEmbedding, match_count: 5 }
    );
    if (matchErr) {
      console.error("match_documents error:", matchErr);
      return res.status(500).json({ error: `match_documents: ${matchErr.message}` });
    }

    const context = (matches || [])
      .map((m: any) => `# ${m.title}\n${m.content}`)
      .join("\n\n---\n\n")
      .slice(0, 6000); // keep prompt sane

    const system =
      "You are a helpful assistant. Answer using ONLY the provided documents. If unsure, say you don't know.";

    const prompt = `Documents:\n\n${context}\n\nQuestion: ${question}\nAnswer:`;

    const r = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    });

    const answer = r.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ answer, sources: matches ?? [] });
  } catch (e: any) {
    console.error("ask route error:", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
