// ~/mcminime-clone/pages/api/ingest.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { pipeline, env as xenova } from "@xenova/transformers";

type Ok = { ok: true; id: string };
type Err = { error: string };

let cachedEmbedder: null | ((text: string) => Promise<number[]>) = null;

async function getEmbedder() {
  if (cachedEmbedder) return cachedEmbedder;
  xenova.allowLocalModels = true;
  xenova.localModelPath = ".transformers-cache";
  const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  cachedEmbedder = async (text: string) => {
    const out = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array) as number[]; // 384 dims
  };
  return cachedEmbedder;
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err | any>
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return res.status(500).json({ error: "Server not configured" });

  if (req.method === "POST") {
    const { title, content } = req.body ?? {};
    if (!title || !content) return res.status(400).json({ error: "title and content are required" });

    const supabase = createClient(url, service);
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
    const supabase = createClient(url, service);
    const { data, error } = await supabase
      .from("documents")
      .select("id,title,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
