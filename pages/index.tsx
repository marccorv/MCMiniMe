// ~/mcminime-clone/pages/index.tsx
import { useState } from "react";

type AskResult = {
  answer?: string;
  sources?: Array<{ title?: string; similarity?: number } | string>;
  error?: string;
};

export default function Home() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ingestBusy, setIngestBusy] = useState(false);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAnswer("");
    setSources([]);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data: AskResult = await r.json();
      if (!r.ok) throw new Error(data?.error || r.statusText);
      setAnswer(data.answer || "");
      const src = Array.isArray(data.sources)
        ? data.sources.map((s: any) => s?.title ?? String(s))
        : [];
      setSources(src);
    } catch (err: any) {
      setAnswer(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onIngest(e: React.FormEvent) {
    e.preventDefault();
    setIngestBusy(true);
    try {
      const r = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || r.statusText);
      alert(`Inserted: ${data.id}`);
      setTitle("");
      setContent("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIngestBusy(false);
    }
  }

  const box = { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" } as const;

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>MCMiniMe clone</h1>

      <section style={{ border: "1px solid #eee", padding: 16, borderRadius: 10 }}>
        <h2>Ask</h2>
        <form onSubmit={onAsk}>
          <textarea rows={3} style={box} placeholder="Ask about your docs…" value={q} onChange={e => setQ(e.target.value)} />
          <button disabled={busy || !q.trim()} style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8 }}>
            {busy ? "Thinking…" : "Ask"}
          </button>
        </form>
        <pre style={{ marginTop: 12, background: "#f7f7f7", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", minHeight: 60 }}>
          {answer || "—"}
        </pre>
        {!!sources.length && (
          <>
            <h3 style={{ marginTop: 12 }}>Sources</h3>
            <ul>{sources.map((s, i) => (<li key={i}>{s}</li>))}</ul>
          </>
        )}
      </section>

      <section style={{ border: "1px solid #eee", padding: 16, borderRadius: 10, marginTop: 20 }}>
        <h2>Add document</h2>
        <form onSubmit={onIngest}>
          <input style={{ ...box, marginBottom: 8 }} placeholder="Title, e.g. meeting-notes.md" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea rows={8} style={box} placeholder="Paste markdown or text…" value={content} onChange={e => setContent(e.target.value)} />
          <button disabled={ingestBusy || !title.trim() || !content.trim()} style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8 }}>
            {ingestBusy ? "Saving…" : "Save"}
          </button>
        </form>
      </section>
    </main>
  );
}
