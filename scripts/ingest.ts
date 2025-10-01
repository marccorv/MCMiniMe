import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use service role key because this script runs on your laptop (server-side).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function embed(text: string): Promise<number[]> {
  const r = await axios.post(
    'https://api.openai.com/v1/embeddings',
    { input: text, model: 'text-embedding-3-small' },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
  );
  return r.data.data[0].embedding;
}

async function run(dir = './docs') {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
  if (files.length === 0) {
    console.log(\`No files found in \${dir}. Create docs/example.md and run again.\`);
    return;
  }
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const chunks = content.split(/\\n\\n+/).map(s => s.trim()).filter(Boolean);
    for (const chunk of chunks) {
      const emb = await embed(chunk);
      const { error } = await supabase.from('documents').insert([{ title: f, content: chunk, embedding: emb }]);
      if (error) throw error;
      console.log(\`Inserted chunk from \${f}\`);
    }
  }
}

run()
  .then(() => console.log('Done'))
  .catch(e => { console.error(e); process.exit(1); });
