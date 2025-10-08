import { useEffect, useState } from "react";

type Doc = { id: string; title: string; preview?: string; created_at: string };

export default function DocsPage() {
  const [list, setList] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => []);
      setList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    if (!id) return;
    try {
      await fetch("/api/documents", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setList((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // ignore
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTitle("");
      setContent("");
      await load();
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const safe = Array.isArray(list) ? list : [];

  return (
    <main style={{ maxWidth: 780, margin: "32px auto", padding: 16 }}>
      <h1>Documents</h1>

      <section style={{ marginTop: 24, padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>Add a document</h2>
        <form onSubmit={add}>
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
          Stored ({safe.length}) {loading ? "…loading" : ""}
        </h2>
        {err && <div style={{ color: "crimson" }}>Error: {err}</div>}
        <ul>
          {safe.map((d) => (
            <li key={d.id} style={{ marginBottom: 12 }}>
              <strong>{d.title}</strong>{" "}
              <small style={{ color: "#666" }}>
                {new Date(d.created_at).toLocaleString()}
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
