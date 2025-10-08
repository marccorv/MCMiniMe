import { useState } from "react";

type Source = { id?: string; title?: string; content?: string; similarity?: number };

export default function Home() {
  const [question, setQuestion] = useState("What does the second paragraph of the test doc say?");
  const [answer, setAnswer] = useState<string>("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function ask() {
    setLoading(true);
    setAnswer("");
    setSources([]);
    setError("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // API accepts either {question} or {q}; we’ll send {question}
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Unknown error");
        return;
      }

      setAnswer(data?.answer ?? "");
      setSources(Array.isArray(data?.sources) ? data.sources : []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "48px auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h1 style={{ fontSize: 36, marginBottom: 16 }}>MCMiniMe clone</h1>

      <textarea
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask anything about your docs…"
        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ddd", fontSize: 16 }}
      />

      <button
        onClick={ask}
        disabled={loading || !question.trim()}
        style={{
          marginTop: 12,
          padding: "10px 16px",
          borderRadius: 8,
          border: "1px solid #111",
          background: loading ? "#eee" : "#111",
          color: loading ? "#111" : "#fff",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Thinking…" : "Ask"}
      </button>

      <h2 style={{ marginTop: 28 }}>Answer</h2>
      {error ? (
        <pre style={{ color: "#c00", background: "#fee", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap" }}>{error}</pre>
      ) : (
        <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", minHeight: 64 }}>
          {answer || (loading ? "" : "—")}
        </pre>
      )}

      {sources.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>Sources</h3>
          <ul>
            {sources.map((s, i) => (
              <li key={s.id ?? i}>
                <strong>{s.title ?? "Untitled"}</strong>
                {typeof s.similarity === "number" ? ` — sim: ${s.similarity.toFixed(3)}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
