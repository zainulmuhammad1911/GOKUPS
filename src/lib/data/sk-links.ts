import "server-only";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Tautan dokumen SK di GoKUPS per ID rekaman (data/links/current.json), dari `pdpsi links`.
 * Opsional: bila belum ada, situs berjalan tanpa kolom dokumen SK. Situs hanya menautkan ke
 * GoKUPS; dokumen tidak diunduh atau disimpan. Dimuat ulang otomatis bila current.json berubah.
 */
export interface SkLink {
  detail: string | null;
  pdf: string[];
}
export interface SkLinks {
  version: string;
  release_version: string;
  collected_at: string;
  links: Record<string, SkLink>;
}

const DIR = path.join(process.cwd(), "data", "links");
const PREFIX = "https://gokups.hutsos.kehutanan.go.id/";
let cached: SkLinks | null = null;
let stamp = "";

export function loadSkLinks(): SkLinks | null {
  const current = path.join(DIR, "current.json");
  if (!existsSync(current)) return null;
  const st = statSync(current);
  const s = `${st.mtimeMs}:${st.size}`;
  if (s === stamp) return cached;
  const { version } = JSON.parse(readFileSync(current, "utf-8")) as { version: string };
  if (!/^[0-9A-Za-z.\-]+$/.test(version)) throw new Error(`Versi tautan SK tidak valid: ${version}`);
  const doc = JSON.parse(readFileSync(path.join(DIR, version, "sk_links.json"), "utf-8")) as SkLinks;
  // Lapisan pengaman kedua: hanya alamat GoKUPS yang boleh tampil sebagai tautan.
  for (const link of Object.values(doc.links)) {
    if (link.detail && !link.detail.startsWith(PREFIX)) link.detail = null;
    link.pdf = link.pdf.filter((u) => u.startsWith(PREFIX));
  }
  cached = doc;
  stamp = s;
  return cached;
}
