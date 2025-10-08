import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { pipeline, env as xenEnv } from "@xenova/transformers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

let cachedEmbedder: ((t: string) => Promise<number[]>) | null = null;

async function getEmbedder() {
  if (cachedEmbedder) return cachedEmbedder;

  xenEnv.allowLocalModels = true;
  xenEnv.localModelPath = ".transformers-cache";

  const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  cachedEmbedder = async (text: string) => {
    const out = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array) as unknown as number[];
  };
  return cachedEmbedder;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // your Groq API key
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});
const MODEL = process.env.OPENAI_MODEL || "llama-3.1-8b-instant";

function readBody(req: NextApiRequest): any {
  try {
    if (typeof req.body === "object" && req.body) return req.body;
    if (typeof req.body === "string" && req.body.trim()) {
      return JSON.parse(req.body);
    }
  } catch (_) {}
  return {};
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  const body = readBody(req);
  const question: string | undefined = body.q ?? body.question;

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Missing body.q / body.question" });
  }

  try {
    const embed = await (await getEmbedder())(question);

    const { data: matches, error } = await supabase.rpc("match_documents", {
      query_embedding: embed,
      match_count: 5,
    });
    if (error) return res.status(500).json({ error: `match_documents: ${error.message}` });

    const context =
      (matches ?? [])
        .map((m: any) => `# ${m.title}\n${m.content}`)
        .join("\n\n") || "No relevant documents.";

    const system =
      "You answer questions using ONLY the provided documents. " +
      "If the answer is not present, say you don't know. Keep answers short.";

    const prompt = `Documents:\n\n${context}\n\nQuestion: ${question}\nAnswer:`;

    const r = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    });

    const answer = r.choices?.[0]?.message?.content ?? "";
    const sources = (matches ?? []).map((m: any) => m.title);

    return res.status(200).json({ answer, sources });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
}
