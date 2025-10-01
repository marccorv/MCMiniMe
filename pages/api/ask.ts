import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { supabaseAdmin } from '../../lib/supabaseClient';

async function embedQuestion(text: string): Promise<number[]> {
  const r = await axios.post(
    'https://api.openai.com/v1/embeddings',
    { input: text, model: 'text-embedding-3-small' },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
  );
  return r.data.data[0].embedding;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  const { question } = req.body as { question?: string };
  if (!question) return res.status(400).json({ error: 'Missing question' });

  try {
    const qEmb = await embedQuestion(question);

    const { data: matches, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: qEmb,
      match_count: 5
    });
    if (error) throw error;

    const context = (matches || [])
      .map((m: any) => `${m.title}\n${m.content}`)
      .join('\n\n---\n\n');

    const messages = [
      { role: 'system', content: 'Use the provided context when relevant. If the context is not enough, say you are unsure.' },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
    ];

    const orRes = await axios.post(
      'https://api.openrouter.ai/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages,
        temperature: 0.2,
        max_tokens: 700
      },
      { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
    );

    const answer =
      orRes.data?.choices?.[0]?.message?.content ??
      orRes.data?.choices?.[0]?.text ??
      '';

    res.status(200).json({ answer, sources: matches || [] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Server error' });
  }
}
