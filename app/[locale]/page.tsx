// app/[locale]/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Chatbot UI</h1>
      <Link className="underline" href="/en/login">
        Start Chatting →
      </Link>
    </main>
  );
}
