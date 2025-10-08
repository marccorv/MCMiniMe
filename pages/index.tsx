import { useEffect, useState } from "react";

type Source = { id?: string; title?: string; similarity?: number } | string;

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  async function ask(q: string) {
    setLoading(true);
    setErr("");
    setAnswer("");
    setSources([]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${t}`);
      }
      const data = await res.json().catch(() => ({}));
      setAnswer(typeof data.answer === "string" ? data.answer : "");
      const src: Source[] = Array.isArray(data.sources) ? data.sources : [];
      setSources(src);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    ask(question.trim());
  }

  const safeSources = Array.isArray(sources) ? sources : [];

  return (
    <main style={{ maxWidth: 780, margin: "32px auto", padding: 16 }}>
      <h1>MCMiniMe clone</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <textarea
          placeholder="Ask something about your stored docs…"
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ width: "100%", padding: 8, fontFamily: "monospace" }}
        />
        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={loading}>
            {loading ? "Asking…" : "Ask"}
          </button>
        </div>
      </form>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Answer</h2>
        <pre
          style={{
            background: "#f7f7f7",
            padding: 12,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            minHeight: 48,
          }}
        >
          {err ? `Error: ${err}` : loading ? "…" : (answer || "")}
        </pre>
      </section>

      {safeSources.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Sources</h3>
          <ul>
            {safeSources.map((s, i) => {
              const o = typeof s === "string" ? { title: s } : s || {};
              const title =
                typeof o.title === "string" && o.title.trim()
                  ? o.title
                  : "Untitled";
              const sim =
                typeof o.similarity === "number"
                  ? ` — sim: ${o.similarity.toFixed(3)}`
                  : "";
              return (
                <li key={i}>
                  <strong>{title}</strong>
                  {sim}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
