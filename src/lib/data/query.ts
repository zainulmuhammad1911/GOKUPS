import type { AdminArea, ApprovalRecord } from "./types";
import { AREA_COLUMN } from "./aggregate";

/**
 * Filter, pencarian, urutan, dan paginasi halaman Data (PRD §6.4).
 * Dipakai bersama oleh halaman /data dan unduhan /unduh-hasil, sehingga unduhan
 * selalu berisi rekaman yang sama dengan tabel untuk filter yang sama.
 *
 * Pencarian hanya memakai bentuk pembanding (huruf besar, tanpa tanda baca); nilai
 * yang ditampilkan tetap nilai sumber apa adanya.
 */

export const JENIS_CODES = ["HD", "HKM", "HTR", "HA", "KK"] as const;
export const KK_SUB_CODES = ["KK_KULIN", "KK_KONSERVASI", "KK_IPHPS"] as const;
export const SORT_KEYS = ["no", "sk", "name", "type", "province", "regency", "date", "area"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
/**
 * Filter jumlah anggota tercatat (laki-laki + perempuan, hasil pengolahan K1). "1" dipakai untuk
 * melihat rekaman yang anggotanya tercatat satu orang, misalnya izin HTR yang kemungkinan dimiliki
 * perorangan. Sumber tidak punya penanda perorangan yang konsisten, jadi ini bukan status resmi.
 * "na" = anggota tidak dapat dihitung (ada nilai negatif atau kosong).
 */
export const MEMBER_FILTERS = ["1", "2plus", "0", "na"] as const;
export type MemberFilter = (typeof MEMBER_FILTERS)[number];
/** Filter pendamping (K11): "ada" = kolom sumber Pendamping terisi, "tidak" = kosong di sumber. */
export const PENDAMPING_FILTERS = ["ada", "tidak"] as const;
export type PendampingFilter = (typeof PENDAMPING_FILTERS)[number];
export const PAGE_SIZE = 25;
const MAX_Q = 100;

export interface DataQuery {
  q: string;
  /** Nilai kolom sumber "Region" apa adanya (kelompok pulau; diturunkan penyusun workbook dari provinsi). */
  region: string | null;
  province: string | null;
  regency: string | null;
  type: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  flag: string | null;
  members: MemberFilter | null;
  pendamping: PendampingFilter | null;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
}

export const EMPTY_QUERY: DataQuery = {
  q: "", region: null, province: null, regency: null, type: null, yearFrom: null, yearTo: null, flag: null, members: null, pendamping: null,
  sort: "no", dir: "asc", page: 1,
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function first(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

export interface QueryContext {
  regions: Set<string>;
  /** Region tiap provinsi menurut rekaman sumber (setiap provinsi tepat satu region). */
  provinceRegion: Map<string, string>;
  provinceCodes: Set<string>;
  regencyCodes: Set<string>;
  flags: Set<string>;
  years: { min: number; max: number };
}

export function queryContext(adminAreas: AdminArea[], records: ApprovalRecord[], flagCodes: string[]): QueryContext {
  let min = Infinity;
  let max = -Infinity;
  const provinceRegion = new Map<string, string>();
  for (const r of records) {
    const region = r.source["Region"];
    if (typeof region === "string") provinceRegion.set(r.derived.province_code, region);
    const y = r.derived.approval_year;
    if (y !== null) {
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
  }
  return {
    regions: new Set(provinceRegion.values()),
    provinceRegion,
    provinceCodes: new Set(adminAreas.filter((a) => a.level === "province").map((a) => a.code)),
    regencyCodes: new Set(adminAreas.filter((a) => a.level === "regency").map((a) => a.code)),
    flags: new Set(flagCodes),
    years: { min, max },
  };
}

/** Daftar Region, diurutkan menurut kode provinsi terkecil di dalamnya (barat ke timur). */
export function regionList(ctx: QueryContext): string[] {
  const first = new Map<string, string>();
  for (const [code, region] of ctx.provinceRegion) if (!first.has(region) || code < first.get(region)!) first.set(region, code);
  return [...first].sort((a, b) => a[1].localeCompare(b[1])).map(([region]) => region);
}

/** Parameter yang tidak valid diabaikan (dan dicatat), bukan menyebabkan galat. */
export function parseQuery(params: Params, ctx: QueryContext): { query: DataQuery; ignored: string[] } {
  const ignored: string[] = [];
  const q = (first(params, "q") ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_Q);

  const pick = (key: string, ok: (v: string) => boolean): string | null => {
    const v = first(params, key)?.trim();
    if (!v) return null;
    if (ok(v)) return v;
    ignored.push(key);
    return null;
  };
  const year = (key: string): number | null => {
    const v = pick(key, (x) => /^\d{4}$/.test(x) && Number(x) >= ctx.years.min && Number(x) <= ctx.years.max);
    return v === null ? null : Number(v);
  };

  const region = pick("region", (v) => ctx.regions.has(v));
  let province = pick("province", (v) => ctx.provinceCodes.has(v));
  if (province && region && ctx.provinceRegion.get(province) !== region) {
    ignored.push("province");
    province = null;
  }
  let regency = pick("regency", (v) => ctx.regencyCodes.has(v));
  if (regency && province && !regency.startsWith(`${province}.`)) {
    ignored.push("regency");
    regency = null;
  }
  if (regency && region && ctx.provinceRegion.get(regency.slice(0, 2)) !== region) {
    ignored.push("regency");
    regency = null;
  }
  const type = pick("type", (v) => (JENIS_CODES as readonly string[]).includes(v) || (KK_SUB_CODES as readonly string[]).includes(v));
  let yearFrom = year("year_from");
  let yearTo = year("year_to");
  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) [yearFrom, yearTo] = [yearTo, yearFrom];
  const flag = pick("flag", (v) => ctx.flags.has(v));
  const members = pick("members", (v) => (MEMBER_FILTERS as readonly string[]).includes(v)) as MemberFilter | null;
  const pendamping = pick("pendamping", (v) => (PENDAMPING_FILTERS as readonly string[]).includes(v)) as PendampingFilter | null;
  const sort = (pick("sort", (v) => (SORT_KEYS as readonly string[]).includes(v)) ?? "no") as SortKey;
  const dir = pick("dir", (v) => v === "asc" || v === "desc") === "desc" ? "desc" : "asc";
  const pageRaw = first(params, "page");
  const page = pageRaw && /^\d{1,6}$/.test(pageRaw) ? Math.max(1, Number(pageRaw)) : 1;

  return { query: { q, region, province, regency, type, yearFrom, yearTo, flag, members, pendamping, sort, dir, page }, ignored };
}

const normalize = (s: string) =>
  s.normalize("NFKD").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

const SEARCH_COLUMNS = ["Nomor Surat Keputusan", "Nama Lembaga", "Ketua Lembaga", "Pendamping", "Provinsi", "Kabupaten Kota", "Kecamatan"];
const searchIndex = new WeakMap<ApprovalRecord, string>();

function searchText(r: ApprovalRecord): string {
  let s = searchIndex.get(r);
  if (s === undefined) {
    const parts = SEARCH_COLUMNS.map((c) => r.source[c]).filter((v): v is string => typeof v === "string");
    parts.push(r.id, r.derived.province_name_official, r.derived.regency_name_official);
    s = ` ${normalize(parts.join(" "))} `;
    searchIndex.set(r, s);
  }
  return s;
}

function matchesMembers(r: ApprovalRecord, f: MemberFilter): boolean {
  const m = r.derived.members_calc_status === "dihitung" ? r.derived.members_male_plus_female : null;
  if (f === "na") return m === null;
  if (m === null) return false;
  return f === "1" ? m === 1 : f === "0" ? m === 0 : m >= 2;
}

/** Jumlah rekaman per pilihan filter anggota (untuk label pilihan). */
export function memberFilterCounts(records: ApprovalRecord[]): Record<MemberFilter, number> {
  const out: Record<MemberFilter, number> = { "1": 0, "2plus": 0, "0": 0, na: 0 };
  for (const r of records) for (const f of MEMBER_FILTERS) if (matchesMembers(r, f)) out[f] += 1;
  return out;
}

export function matches(r: ApprovalRecord, q: DataQuery): boolean {
  const d = r.derived;
  if (q.region && r.source["Region"] !== q.region) return false;
  if (q.province && d.province_code !== q.province) return false;
  if (q.regency && d.regency_code !== q.regency) return false;
  if (q.type) {
    if (q.type.startsWith("KK_") ? d.scheme_code !== q.type : d.jenis_ps_code !== q.type) return false;
  }
  if (q.yearFrom !== null && (d.approval_year === null || d.approval_year < q.yearFrom)) return false;
  if (q.yearTo !== null && (d.approval_year === null || d.approval_year > q.yearTo)) return false;
  if (q.flag && !r.quality.flags.includes(q.flag)) return false;
  if (q.members && !matchesMembers(r, q.members)) return false;
  if (q.pendamping && (d.pendamping_status === "tercatat") !== (q.pendamping === "ada")) return false;
  if (q.q) {
    const text = searchText(r);
    // Semua kata pencarian harus muncul (AND), dicocokkan sebagai awal kata.
    for (const token of normalize(q.q).split(" ")) {
      if (token && !text.includes(` ${token}`)) return false;
    }
  }
  return true;
}

function sortValue(r: ApprovalRecord, key: SortKey): string | number | null {
  switch (key) {
    case "no": return typeof r.source["No"] === "number" ? r.source["No"] : null;
    case "sk": return (r.source["Nomor Surat Keputusan"] as string | null) ?? null;
    case "name": return (r.source["Nama Lembaga"] as string | null) ?? null;
    case "type": return r.source["Skema"] as string | null;
    case "province": return r.derived.province_name_official;
    case "regency": return r.derived.regency_name_official;
    case "date": return (r.source["Tanggal Surat Keputusan"] as string | null) ?? null;
    case "area": return typeof r.source[AREA_COLUMN] === "number" ? (r.source[AREA_COLUMN] as number) : null;
  }
}

const collator = new Intl.Collator("id", { sensitivity: "base", numeric: true });

export function applyQuery(records: ApprovalRecord[], q: DataQuery): ApprovalRecord[] {
  const out = records.filter((r) => matches(r, q));
  if (q.sort === "no" && q.dir === "asc") return out;
  const sign = q.dir === "desc" ? -1 : 1;
  // Urutan stabil; nilai kosong selalu di akhir, ke arah mana pun.
  return out
    .map((r, i) => ({ r, i, v: sortValue(r, q.sort) }))
    .sort((a, b) => {
      if (a.v === null && b.v === null) return a.i - b.i;
      if (a.v === null) return 1;
      if (b.v === null) return -1;
      const c = typeof a.v === "number" && typeof b.v === "number" ? a.v - b.v : collator.compare(String(a.v), String(b.v));
      return c !== 0 ? sign * c : a.i - b.i;
    })
    .map((x) => x.r);
}

export function paginate<T>(items: T[], page: number): { rows: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  return { rows: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), page, pages };
}

/** Parameter URL untuk query (tanpa nilai bawaan), dipakai tautan, paginasi, dan unduhan. */
export function toSearchParams(q: DataQuery, overrides: Partial<DataQuery> = {}): Record<string, string> {
  const m = { ...q, ...overrides };
  const out: Record<string, string> = {};
  if (m.q) out.q = m.q;
  if (m.region) out.region = m.region;
  if (m.province) out.province = m.province;
  if (m.regency) out.regency = m.regency;
  if (m.type) out.type = m.type;
  if (m.yearFrom !== null) out.year_from = String(m.yearFrom);
  if (m.yearTo !== null) out.year_to = String(m.yearTo);
  if (m.flag) out.flag = m.flag;
  if (m.members) out.members = m.members;
  if (m.pendamping) out.pendamping = m.pendamping;
  if (m.sort !== "no") out.sort = m.sort;
  if (m.dir !== "asc") out.dir = m.dir;
  if (m.page > 1) out.page = String(m.page);
  return out;
}

export function activeFilterCount(q: DataQuery): number {
  return [q.q, q.region, q.province, q.regency, q.type, q.yearFrom, q.yearTo, q.flag, q.members, q.pendamping].filter((v) => v !== null && v !== "").length;
}
