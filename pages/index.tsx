import React, { useState } from 'react';

export default function Home() {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask() {
    setLoading(true);
    setAnswer('');
    const r = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q })
    });
    const data = await r.json();
    setAnswer(data.answer || JSON.stringify(data, null, 2));
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1>MCMiniMe clone</h1>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        rows={5}
        style={{ width: '100%', padding: 12 }}
        placeholder="Ask something"
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={ask} disabled={loading || !q} style={{ padding: '8px 14px' }}>
          {loading ? 'Asking…' : 'Ask'}
        </button>
      </div>
      <section style={{ marginTop: 20 }}>
        <h3>Answer</h3>
        <pre style={{ background: '#f7f7f7', padding: 12, whiteSpace: 'pre-wrap' }}>{answer}</pre>
      </section>
    </main>
  );
}
