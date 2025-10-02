import fs from "fs";
import path from "path";
import OpenAI from "openai";
import "dotenv/config";
import { supabaseAdmin } from "../lib/supabaseClient";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function embed(text: string) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return res.data[0].embedding;
}

async function run(dir = "./docs") {
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md") || f.endsWith(".txt"));
  if (files.length === 0) {
    console.log(`No files found in ${dir}. Create docs/example.md and run again.`);
    return;
  }

  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), "utf8");
    const chunks = content.split(/\n\n+/).map(s => s.trim()).filter(Boolean);

    for (const chunk of chunks) {
      const embedding = await embed(chunk);
      const { error } = await supabaseAdmin
        .from("documents")
        .insert([{ title: f, content: chunk, embedding }]);
      if (error) throw error;
      console.log(`Inserted chunk from ${f}`);
    }
  }
}

run().then(() => console.log("Done")).catch(e => { console.error(e); process.exit(1); });
