// pages/docs.tsx
import { useEffect, useState } from "react";

type Doc = { id: string; title: string; preview?: string; created_at: string };

export default function Docs() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/documents");
    const json = await res.json();
    setDocs(json);
    setLoading(false);
  }

  async function addDoc(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) {
      setTitle("");
      setContent("");
      await load();
    } else {
      alert(await res.text());
    }
  }

  async function del(id: string) {
    const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setDocs(docs.filter((d) => d.id !== id));
    } else {
      alert(await res.text());
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
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
            required
          />
          <textarea
            placeholder="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            style={{ width: "100%", padding: 8, fontFamily: "monospace" }}
            required
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
        <ul>
          {docs.map((d) => (
            <li key={d.id} style={{ marginBottom: 12 }}>
              <strong>{d.title}</strong>{" "}
              <small style={{ color: "#666" }}>
                — {new Date(d.created_at).toLocaleString()}
              </small>
              <div style={{ whiteSpace: "pre-wrap", color: "#444" }}>
                {d.preview ?? ""}
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
