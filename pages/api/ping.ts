import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const redact = (s?: string | null) =>
    s ? `${s.slice(0, 4)}…(len:${s.length})` : "MISSING";

  res.status(200).json({
    ok: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: redact(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      SUPABASE_SERVICE_ROLE_KEY: redact(
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
      OPENAI_API_KEY: redact(process.env.OPENAI_API_KEY),
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "MISSING",
      OPENAI_MODEL: process.env.OPENAI_MODEL || "MISSING",
      EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "MISSING",
    },
  });
}
