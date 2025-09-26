'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
        <h1>Client Error</h1>
        <p><strong>{error?.name}:</strong> {error?.message}</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#111', color: '#eee', padding: 16, borderRadius: 8 }}>
{error?.stack}
        </pre>
        <p>Digest: {error?.digest ?? 'n/a'}</p>
        <button
          onClick={() => location.reload()}
          style={{ marginTop: 12, padding: '8px 12px' }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
