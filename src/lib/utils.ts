import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Penggabung kelas Tailwind untuk komponen shadcn/ui. Ukuran teks PDPSI (text-caption, text-small,
 * text-h3, ...) didaftarkan sebagai ukuran font, agar tidak dianggap warna teks dan saling menghapus
 * dengan text-primary-foreground dan sejenisnya.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: ["display", "h1", "h2", "h3", "body", "small", "caption"] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
