import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { pipeline, env } from "@xenova/transformers";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

type EmbedFn = (text: string) => Promise<number[]>;
let cachedEmbedder: EmbedFn | null = null;

async function getEmbedder(): Promise<EmbedFn> {
  if (cachedEmbedder) return cachedEmbedder;

  env.allowLocalModels = true;
  env.localModelPath = ".transformers-cache";

  const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  cachedEmbedder = async (text: string) => {
    const out = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data) as number[];
  };

  return cachedEmbedder;
}

function readText(file: string) {
  return fs.readFileSync(file, "utf8").trim();
}

async function listDocs(dir: string) {
  return await glob("**/*.{md,txt}", { cwd: dir, nodir: true, absolute: true });
}

async function main() {
  const docsDir = process.argv[2] || "docs";
  if (!fs.existsSync(docsDir)) {
    console.error(`Docs folder not found: ${docsDir}`);
    process.exit(1);
  }

  const files = await listDocs(docsDir);
  if (files.length === 0) {
    console.log("No .md or .txt files found under", docsDir);
    return;
  }

  console.log(`Found ${files.length} file(s). Downloading local model on first run...`);
  const embed = await getEmbedder();

  for (const file of files) {
    const content = readText(file);
    if (!content) continue;

    const title = path.basename(file);
    const embedding = await embed(content); // 384 numbers

    const { error } = await supabase.from("documents").insert({ title, content, embedding });

    if (error) {
      console.error(`Insert failed for ${file}:`, error.message);
    } else {
      console.log("Inserted:", title);
    }
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
