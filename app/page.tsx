// app/page.tsx
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/en"); // change "en" only if your default locale is different
}
