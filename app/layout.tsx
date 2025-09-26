// app/layout.tsx (minimal safe shell)
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://mc-mini-me.vercel.app"),
  title: "MC Mini Me",
  description: "Chatbot UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100dvh" }}>{children}</body>
    </html>
  );
}
