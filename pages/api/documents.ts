// pages/api/documents.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) return res.status(500).json({ error: "Server not configured" });

  const supabase = createClient(url, service, { auth: { persistSession: false } });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, left(content, 80) as preview, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === "DELETE") {
    const id = (req.query.id || (req.body && req.body.id)) as string | undefined;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
