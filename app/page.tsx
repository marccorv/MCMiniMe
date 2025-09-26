// app/page.tsx
import { redirect } from "next/navigation";

export default function RootRedirect() {
  // Pick your default locale (the repo uses "en")
  redirect("/en");
}
