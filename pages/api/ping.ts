// pages/api/ping.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const redact = (s?: string) => (s ? `${s.slice(0, 4)}…(len:${s.length})` : "MISSING");

  res.status(200).json({
    ok: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: redact(process.env.SUPABASE_SERVICE_ROLE_KEY),
      OPENAI_API_KEY: redact(process.env.OPENAI_API_KEY),
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "MISSING",
      OPENAI_MODEL: process.env.OPENAI_MODEL || "MISSING",
    },
  });
}
