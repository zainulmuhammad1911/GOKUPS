import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  AdminArea,
  ApprovalRecord,
  ControlTotals,
  Release,
  ReleaseMeta,
  SchemeInfo,
  SiteConfig,
} from "./types";

/**
 * Memuat rilis aktif (data/releases/current.json) sekali per proses server.
 * Hanya file publik yang dibaca. Folder internal/ tidak pernah dibuka di sini.
 */
const ROOT = process.cwd();

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf-8")) as T;
}

let cached: Release | null = null;

export function releaseDir(version: string): string {
  if (!/^[0-9A-Za-z.\-]+$/.test(version)) throw new Error(`Versi rilis tidak valid: ${version}`);
  return path.join(ROOT, "data", "releases", version);
}

export function loadRelease(): Release {
  if (cached) return cached;
  const { version } = readJson<{ version: string }>(path.join(ROOT, "data", "releases", "current.json"));
  const dir = releaseDir(version);
  const approvals = readJson<ApprovalRecord[]>(path.join(dir, "approvals.json"));
  cached = {
    meta: readJson<ReleaseMeta>(path.join(dir, "release.json")),
    approvals,
    byId: new Map(approvals.map((a) => [a.id, a])),
    totals: readJson<ControlTotals>(path.join(dir, "control_totals.json")),
    adminAreas: readJson<AdminArea[]>(path.join(dir, "admin_areas.json")),
    schemes: readJson<SchemeInfo[]>(path.join(dir, "schemes.json")).sort(
      (a, b) => Number(a.sort_order) - Number(b.sort_order),
    ),
    dir,
  };
  return cached;
}

let site: SiteConfig | null = null;

export function loadSiteConfig(): SiteConfig {
  site ??= readJson<SiteConfig>(path.join(ROOT, "config", "site.json"));
  return site;
}

export interface ExportSchema {
  id_column: { title: string; path: string; kind: string; description: string };
  source_column_notes: Record<string, string>;
  default_source_note: string;
  derived_columns: { title: string; path: string; transform: "join" | "default_1" | null; kind: string; description: string }[];
  flag_docs: Record<string, string>;
  texts: { unit: string; fidelity: string; aggregates: string; csv_format: string; not_set: string };
}

let exportSchema: ExportSchema | null = null;

/** Definisi kolom unduhan yang sama dengan pipeline (data/config/export_schema.json). */
export function loadExportSchema(): ExportSchema {
  exportSchema ??= readJson<ExportSchema>(path.join(ROOT, "data", "config", "export_schema.json"));
  return exportSchema;
}
