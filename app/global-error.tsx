'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  console.error(error);
  return (
    <html>
      <body style={{ padding: 20, fontFamily: 'system-ui' }}>
        <h1>Something went wrong</h1>
        <p>{error.message}</p>
      </body>
    </html>
  );
}
