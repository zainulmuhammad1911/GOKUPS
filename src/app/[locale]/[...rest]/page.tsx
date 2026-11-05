import { notFound } from "next/navigation";

// Alamat yang tidak dikenal di dalam /[locale] diarahkan ke halaman not-found berbahasa sesuai.
export default function CatchAll() {
  notFound();
}
