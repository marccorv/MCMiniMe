// pages/api/ping.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    });

    const r = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "llama-3.1-8b-instant",
      messages: [{ role: "user", content: 'Say "pong" only.' }],
      temperature: 0,
    });

    res.status(200).json({ ok: true, text: r.choices[0]?.message?.content ?? "" });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: (e as any)?.message || String(e) });
  }
}
