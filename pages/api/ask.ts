// pages/api/ask.ts  (Next.js "pages" router)
// Uses Groq via OpenAI SDK + Supabase (service role). Accepts {question} or {q}.

import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ----- Environment guards (do NOT log secrets) -----
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

// Groq via OpenAI SDK
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";           // gsk_...
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "llama-3.1-8b-instant";

// Tiny redaction helper for debug
const redact = (s?: string) => (s ? `${s.slice(0, 4)}…(len:${s.length})` : "MISSING");

const client = new OpenAI({ apiKey: OPENAI_API_KEY, baseURL: OPENAI_BASE_URL });

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST" });
    }

    // Accept either {question} or {q}
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const question: string = body?.question ?? body?.q ?? "";

    if (!question.trim()) {
      return res.status(400).json({ error: "Missing body.question or body.q" });
    }

    // Quick env sanity (lengths only)
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Server env missing",
        debug: {
          supabaseUrl: SUPABASE_URL,
          srk: redact(SUPABASE_SERVICE_ROLE_KEY),
          openaiKey: redact(OPENAI_API_KEY),
          baseUrl: OPENAI_BASE_URL,
          model: OPENAI_MODEL,
        },
      });
    }

    // 1) Embed the question to search similar docs
    const embedResp = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });
    const query_embedding = embedResp.data[0].embedding;

    // 2) Search your documents via RPC
    const { data: matches, error: rpcError } = await supabase.rpc("match_documents", {
      query_embedding,
      match_count: 5,
    });

    if (rpcError) {
      // Return PostgREST/Supabase error transparently
      return res.status(500).json({
        error: rpcError.message,
        hint: "If you see 'Invalid API key', re-check SUPABASE_SERVICE_ROLE_KEY in Vercel & .env.local",
      });
    }

    const context =
      (matches || [])
        .map((m: any) => `# ${m.title}\n${m.content}`)
        .join("\n\n") || "(no matching docs)";

    const prompt = `Documents:\n\n${context}\n\nQuestion: ${question}\nAnswer:`;

    // 3) Ask Groq (OpenAI SDK)
    const chat = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.1,
      messages: [
        { role: "system", content: "Answer using only the provided documents. If unknown, say so." },
        { role: "user", content: prompt },
      ],
    });

    const answer = chat.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ answer, sources: matches ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
