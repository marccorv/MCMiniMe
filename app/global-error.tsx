"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);
  return (
    <html>
      <body style={{ padding: 24 }}>
        <h1>Something went wrong</h1>
        {error?.digest && <p>Digest: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: 12 }}>Try again</button>
      </body>
    </html>
  );
}
