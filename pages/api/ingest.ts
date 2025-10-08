// pages/api/ingest.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { pipeline, env as xenovaEnv } from "@xenova/transformers";

// ---- env checks ----
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !service) {
  // Do not throw on import; return 500 at runtime instead.
}

// ---- local embeddings (no API cost) ----
let cachedEmbedder: ((text: string) => Promise<number[]>) | null = null;

async function getEmbedder() {
  if (cachedEmbedder) return cachedEmbedder;

  // Cache model files in repo on first run
  xenovaEnv.allowLocalModels = true;
  xenovaEnv.localModelPath = ".transformers-cache";

  const pipe = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  cachedEmbedder = async (text: string) => {
    const out = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array) as number[]; // length 384
  };

  return cachedEmbedder;
}

type ApiOk = { ok: true; id?: string; deduped?: boolean };
type ApiErr = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr | any>
) {
  if (!url || !service) {
    return res.status(500).json({ error: "Server not configured" });
  }

  const supabase = createClient(url, service, { auth: { persistSession: false } });

  if (req.method === "POST") {
    // Accept JSON only
    const { title, content } = (req.body ?? {}) as {
      title?: string;
      content?: string;
    };

    if (!title || !content) {
      return res
        .status(400)
        .json({ error: "Both 'title' and 'content' are required" });
    }

    // De-dupe by (title, content_hash) that we enforced in SQL
    const content_hash = crypto.createHash("md5").update(content).digest("hex");
    const { data: exists, error: findErr } = await supabase
      .from("documents")
      .select("id")
      .eq("title", title)
      .eq("content_hash", content_hash)
      .limit(1);

    if (findErr) return res.status(500).json({ error: findErr.message });
    if (exists && exists.length) {
      return res.status(200).json({ ok: true, id: exists[0].id, deduped: true });
    }

    // Embed locally (free) then insert
    const embedder = await getEmbedder();
    const embedding = await embedder(content);

    const { data, error } = await supabase
      .from("documents")
      .insert([{ title, content, embedding, content_hash }])
      .select("id")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, id: data.id });
  }

  if (req.method === "GET") {
    // Handy for debugging / listing
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
