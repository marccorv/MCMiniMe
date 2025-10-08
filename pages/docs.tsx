// pages/docs.tsx
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      // Use /api/ingest GET (this endpoint already works via curl)
      const res = await fetch("/api/ingest", { method: "GET" });
      if (!res.ok) throw new Error(`GET /api/ingest -> ${res.status}`);
      const data = await res.json();
      // Accept either shape: [{id,title,created_at,...}] or {data:[...]}
      const list: Doc[] = Array.isArray(data) ? data : data.data ?? [];
      setDocs(list);
    } catch (e: any) {
      setError(e.message ?? String(e));
      setDocs([]);
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? `POST /api/ingest -> ${res.status}`);
      }
      // Clear inputs and reload
      setTitle("");
      setContent("");
      await load();
      alert(`Saved! id=${body.id ?? "ok"}`);
    } catch (e: any) {
      setError(e.message ?? String(e));
      alert(`HTTP 500`);
    }
  }

  async function del(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? `DELETE /api/documents -> ${res.status}`);
      }
      await load();
    } catch (e: any) {
      setError(e.message ?? String(e));
      alert(`Delete failed: ${e.message ?? e}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ maxWidth: 780, margin: "32px auto", padding: 16 }}>
      <h1>Documents</h1>

      <section style={{ marginTop: 24, padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>Add a document</h2>
        <form onSubmit={addDoc}>
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
            rows={8}
            required
            style={{ width: "100%", padding: 8, fontFamily: "monospace" }}
          />
          <div style={{ marginTop: 8 }}>
            <button type="submit">Save</button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginTop: 0 }}>
          Stored ({docs.length}) {loading ? "…loading" : ""}
        </h2>
        {error && <div style={{ color: "crimson" }}>Error: {error}</div>}
        <ul>
          {docs.map((d) => (
            <li key={d.id} style={{ marginBottom: 12 }}>
              <strong>{d.title}</strong>{" "}
              <small style={{ color: "#666" }}>
                {d.created_at ? new Date(d.created_at).toLocaleString() : ""}
              </small>
              <div style={{ whiteSpace: "pre-wrap", color: "#444" }}>
                {(d as any).preview ?? d.content ?? ""}
              </div>
              <button onClick={() => del(d.id)} style={{ marginTop: 4 }}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
