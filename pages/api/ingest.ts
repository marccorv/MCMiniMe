import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { pipeline, env } from "@xenova/transformers";

// Cache Xenova models in /tmp for Vercel
env.allowLocalModels = true;
env.cacheDir = "/tmp/transformers-cache";

let cachedEmbedder: null | ((t: string) => Promise<number[]>) = null;
async function getEmbedder() {
  if (cachedEmbedder) return cachedEmbedder;
  const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  cachedEmbedder = async (text: string) => {
    const out = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array) as number[];
  };
  return cachedEmbedder;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !service) return res.status(500).json({ error: "Server not configured" });

    const supabase = createClient(url, service, { auth: { persistSession: false } });

    if (req.method === "POST") {
      const { title, content } = (req.body ?? {}) as { title?: string; content?: string };
      if (!title || !content) return res.status(400).json({ error: "title and content are required" });

      const embed = await (await getEmbedder())(content);

      const { data, error } = await supabase
        .from("documents")
        .insert({ title, content, embedding: embed })
        .select("id")
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, id: data!.id });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("documents")
        .select("id,title,content,created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      const id = (req.query.id || (req.body && (req.body as any).id)) as string | undefined;
      if (!id) return res.status(400).json({ error: "Missing id" });
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
