import "server-only";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { OmsDirectory } from "./oms-query";

/**
 * Memuat Direktori OMS aktif (data/oms/current.json). Ini sumber kedua yang terpisah dari
 * rilis GoKUPS: tidak dipakai di angka SK, peta, atau statistik.
 * Dimuat ulang otomatis bila current.json berubah, sama seperti loadRelease.
 */
const OMS_DIR = path.join(process.cwd(), "data", "oms");

let cached: OmsDirectory | null = null;
let cachedStamp = "";

export function loadOmsDirectory(): OmsDirectory {
  const currentFile = path.join(OMS_DIR, "current.json");
  const stat = statSync(currentFile);
  const stamp = `${stat.mtimeMs}:${stat.size}`;
  if (cached && stamp === cachedStamp) return cached;
  const { version } = JSON.parse(readFileSync(currentFile, "utf-8")) as { version: string };
  if (!/^[0-9A-Za-z.\-]+$/.test(version)) throw new Error(`Versi direktori OMS tidak valid: ${version}`);
  cached = JSON.parse(readFileSync(path.join(OMS_DIR, version, "directory.json"), "utf-8")) as OmsDirectory;
  cachedStamp = stamp;
  return cached;
}
