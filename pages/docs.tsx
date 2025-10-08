import { useEffect, useState } from "react";

type Doc = {
  id: string;
  title: string;
  content?: string;
  created_at?: string;
};

export default function DocsPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadDocs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest");
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function addDoc(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setTitle("");
      setContent("");
      await loadDocs();
      alert("Saved!");
    } catch (e: any) {
      setError(e.message ?? String(e));
      alert("Error: " + (e.message ?? e));
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  return (
    <main style={{ maxWidth: 700, margin: "2rem auto", padding: "1rem" }}>
      <h1>Documents</h1>

      <form onSubmit={addDoc} style={{ marginBottom: "2rem" }}>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          required
          style={{ width: "100%", padding: 8 }}
        />
        <button type="submit" style={{ marginTop: 8 }}>
          Save
        </button>
      </form>

      <h2>
        Stored ({docs.length}) {loading ? "..." : ""}
      </h2>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <ul>
        {docs.map((d) => (
          <li key={d.id} style={{ marginBottom: "1rem" }}>
            <strong>{d.title}</strong>
            <div style={{ whiteSpace: "pre-wrap" }}>{d.content}</div>
            <small style={{ color: "#555" }}>
              {d.created_at
                ? new Date(d.created_at).toLocaleString()
                : ""}
            </small>
          </li>
        ))}
      </ul>
    </main>
  );
}
