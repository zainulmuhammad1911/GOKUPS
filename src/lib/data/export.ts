import "server-only";
import ExcelJS from "exceljs";
import { strToU8, zipSync } from "fflate";
import type { ExportSchema } from "./release";
import type { DataQuery } from "./query";
import type { AdminArea, ApprovalRecord, ReleaseMeta, SchemeInfo, SiteConfig } from "./types";

/**
 * Unduhan sesuai filter. Kolom, judul, dan keterangan berasal dari
 * data/config/export_schema.json yang juga dipakai pipeline, sehingga file ini
 * sama strukturnya dengan file unduhan rilis lengkap.
 */

type Cell = string | number | null;

function getPath(record: ApprovalRecord, path: string, transform: "join" | "default_1" | null): Cell {
  let cur: unknown = record;
  for (const part of path.split(".")) {
    cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[part] : null;
  }
  if (transform === "join") return Array.isArray(cur) ? cur.join(";") : "";
  if (transform === "default_1") return cur === null || cur === undefined ? 1 : (cur as number);
  return (cur ?? null) as Cell;
}

export function exportTable(records: ApprovalRecord[], meta: ReleaseMeta, schema: ExportSchema) {
  const sourceCols = meta.source_fidelity.published_source_columns;
  const headers = [schema.id_column.title, ...sourceCols, ...schema.derived_columns.map((c) => c.title)];
  const rows: Cell[][] = records.map((r) => [
    r.id,
    ...sourceCols.map((c) => r.source[c] ?? null),
    ...schema.derived_columns.map((c) => getPath(r, c.path, c.transform)),
  ]);
  return { headers, rows };
}

export function dictionaryRows(meta: ReleaseMeta, schema: ExportSchema): [string, string, string][] {
  return [
    [schema.id_column.title, schema.id_column.kind, schema.id_column.description],
    ...meta.source_fidelity.published_source_columns.map(
      (c): [string, string, string] => [c, "Sumber (apa adanya)", schema.source_column_notes[c] ?? schema.default_source_note],
    ),
    ...schema.derived_columns.map((c): [string, string, string] => [c.title, c.kind, c.description]),
    ...meta.source_fidelity.excluded_columns.map(
      (c): [string, string, string] => [c, "Tidak dipublikasikan", meta.source_fidelity.exclusion_reason],
    ),
  ];
}

/** Uraian filter dalam bahasa Indonesia untuk metadata file. */
export function describeQuery(q: DataQuery, admin: AdminArea[], schemes: SchemeInfo[], schema: ExportSchema): string {
  const name = new Map(admin.map((a) => [a.code, a.name]));
  const typeName = (c: string) =>
    c.startsWith("KK_")
      ? schemes.find((s) => s.scheme_code === c)?.scheme_original
      : schemes.find((s) => s.jenis_ps_code === c)?.jenis_ps_label_id;
  const parts = [
    q.q && `Pencarian: "${q.q}"`,
    q.region && `Region (kolom sumber, kelompok pulau): ${q.region}`,
    q.province && `Provinsi: ${name.get(q.province)} (${q.province})`,
    q.regency && `Kabupaten/Kota: ${name.get(q.regency)} (${q.regency})`,
    q.type && `Jenis PS: ${typeName(q.type)} (${q.type})`,
    (q.yearFrom !== null || q.yearTo !== null) && `Tahun SK: ${q.yearFrom ?? "awal"} sampai ${q.yearTo ?? "akhir"}`,
    q.flag && `Catatan pemeriksaan: ${q.flag} (${schema.flag_docs[q.flag]})`,
    q.members &&
      `Anggota tercatat (laki-laki + perempuan, hasil pengolahan PDPSI): ${
        { "1": "1 orang", "2plus": "2 orang atau lebih", "0": "0 orang", na: "tidak dapat dihitung" }[q.members]
      } (members=${q.members})`,
    q.pendamping &&
      `Pendamping: ${q.pendamping === "ada" ? "kolom sumber Pendamping terisi" : "kolom sumber Pendamping kosong"} (pendamping=${q.pendamping})`,
  ].filter(Boolean) as string[];
  const order = q.sort === "no" && q.dir === "asc" ? "urutan sumber" : `${q.sort}, ${q.dir === "asc" ? "naik" : "turun"}`;
  return `${parts.length ? parts.join("; ") : "Tanpa filter (seluruh rekaman)"}. Urutan: ${order}.`;
}

export function metadataLines(
  meta: ReleaseMeta,
  site: SiteConfig,
  schema: ExportSchema,
  filter: string,
  count: number,
  neutralized: number,
): [string, string][] {
  const notSet = schema.texts.not_set;
  const lines: [string, string][] = [
    ["Dataset", `${site.product.name_id} (${site.product.short_name}): rekaman sesuai filter`],
    ["Versi rilis", meta.version],
    ["Status rilis", meta.status === "draft" ? "draft (bukan rilis publik final)" : meta.status],
    ["Sumber data", meta.source.description ?? notSet],
    ["Waktu pengambilan data sumber (UTC)", meta.source.extracted_at],
    ["Waktu pembuatan rilis (UTC)", meta.built_at],
    ["Waktu unduhan (UTC)", new Date().toISOString().replace(/\.\d+Z$/, "+00:00")],
    ["Filter", filter],
    ["Jumlah rekaman dalam file", String(count)],
    ["Unit analisis", schema.texts.unit],
    ["Kesetiaan pada sumber", schema.texts.fidelity],
    [
      "Kolom yang tidak dipublikasikan",
      `${meta.source_fidelity.excluded_columns.join(", ")}. ${meta.source_fidelity.exclusion_reason} Karena itu file ini bukan salinan mentah sepenuhnya.`,
    ],
    ["Angka agregat", schema.texts.aggregates],
    ["Institusi pengelola", site.institution.name_id ?? notSet],
    ["Kontak", site.institution.contact_email ?? notSet],
    ["Lisensi data", site.data_license.name ?? notSet],
  ];
  if (neutralized > 0) {
    lines.push([
      "Penetralan rumus (CSV)",
      `${neutralized} sel teks diawali = + - @ diberi awalan ' agar tidak dijalankan sebagai rumus oleh aplikasi spreadsheet. Nilai aslinya ada di file XLSX.`,
    ]);
  }
  lines.push(["Arti kode penanda", ""]);
  for (const [k, v] of Object.entries(schema.flag_docs)) lines.push([`  ${k}`, v]);
  return lines;
}

// --- CSV ---------------------------------------------------------------------------

const FORMULA_START = /^[=+\-@\t\r]/;

function csvField(v: Cell, counter: { n: number }): string {
  if (v === null) return "";
  let s = String(v);
  if (typeof v === "string" && FORMULA_START.test(s)) {
    s = `'${s}`;
    counter.n += 1;
  }
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsvZip(
  table: { headers: string[]; rows: Cell[][] },
  makeMeta: (neutralized: number) => [string, string][],
  dictionary: [string, string, string][],
  csvFormatText: string,
  csvName: string,
): Uint8Array {
  const counter = { n: 0 };
  const lines = [table.headers.map((h) => csvField(h, counter)).join(",")];
  for (const row of table.rows) lines.push(row.map((v) => csvField(v, counter)).join(","));
  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  const meta = makeMeta(counter.n);
  const readme = [
    meta.map(([k, v]) => (v ? `${k}: ${v}` : k)).join("\n"),
    "Kamus kolom:\n" + dictionary.map(([c, j, d]) => `- ${c} [${j}]: ${d}`).join("\n"),
    csvFormatText,
  ].join("\n\n") + "\n";
  return zipSync({ [csvName]: strToU8(csv), "BACA_SAYA.txt": strToU8(readme) }, { level: 6 });
}

// --- XLSX --------------------------------------------------------------------------

export async function buildXlsx(
  table: { headers: string[]; rows: Cell[][] },
  meta: [string, string][],
  dictionary: [string, string, string][],
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PDPSI";
  const bold = { bold: true };
  const fill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF1EEE6" } };

  const data = wb.addWorksheet("Data", { views: [{ state: "frozen", ySplit: 1 }] });
  data.addRow(table.headers);
  // Teks ditulis sebagai teks (bukan rumus), jadi tidak perlu penetralan di XLSX.
  for (const row of table.rows) data.addRow(row.map((v) => (v === null ? null : v)));
  data.getRow(1).font = bold;
  data.getRow(1).fill = fill;
  data.columns.forEach((col, i) => {
    col.width = Math.min(Math.max(10, (table.headers[i]?.length ?? 10) + 2), 45);
  });
  data.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: table.headers.length } };

  const m = wb.addWorksheet("Metadata");
  m.addRow(["Keterangan", "Nilai"]).font = bold;
  for (const [k, v] of meta) m.addRow([k, v]);
  m.getColumn(1).width = 38;
  m.getColumn(2).width = 110;

  const d = wb.addWorksheet("Kamus Kolom");
  d.addRow(["Kolom", "Jenis", "Keterangan"]).font = bold;
  for (const r of dictionary) d.addRow(r);
  d.getColumn(1).width = 50;
  d.getColumn(2).width = 22;
  d.getColumn(3).width = 100;

  return new Uint8Array(await wb.xlsx.writeBuffer());
}
