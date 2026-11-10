import { JENIS_CODES } from "./query";

export const OMS_ROLES = ["access", "post_approval", "adat", "support"] as const;
export type OmsRole = (typeof OMS_ROLES)[number];
/** Nilai filter provinsi untuk organisasi yang bekerja di tingkat nasional. */
export const NATIONAL = "nasional";

export interface OmsEvidence {
  url: string;
  title: string;
  year: string | null;
}

export interface OmsEntry {
  id: number;
  name: string;
  short_name: string | null;
  org_type: string | null;
  province_codes: string[];
  national: boolean;
  province_text: string | null;
  locations: string | null;
  scheme_text: string | null;
  scheme_codes: string[];
  roles: OmsRole[];
  activity: string | null;
  partners: string | null;
  period: string | null;
  verification: {
    status: "verified" | "partial";
    website: string | null;
    evidence: OmsEvidence[];
    note: string | null;
  };
}

export interface OmsDirectory {
  version: string;
  built_at: string;
  source: { name: string; file_name: string; sha256: string; directory_date: string; checked_date: string };
  counts: { rows: number; published: number; withheld: number; by_status: Record<string, number> };
  entries: OmsEntry[];
}

export interface OmsQuery {
  q: string;
  region: string | null;
  province: string | null;
  type: string | null;
  role: OmsRole | null;
}

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function first(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Nilai filter yang tidak dikenal diabaikan, bukan menghasilkan galat. */
export function parseOmsQuery(
  params: Params,
  ctx: { regions: Set<string>; provinceCodes: Set<string>; provinceRegion: Map<string, string> },
): OmsQuery {
  const q = (first(params, "q") ?? "").trim().slice(0, 100);
  const regionRaw = first(params, "region") ?? "";
  const region = ctx.regions.has(regionRaw) ? regionRaw : null;
  const provRaw = first(params, "province") ?? "";
  let province = provRaw === NATIONAL || ctx.provinceCodes.has(provRaw) ? provRaw : null;
  // Provinsi yang tidak berada di region terpilih tidak dipakai.
  if (province && province !== NATIONAL && region && ctx.provinceRegion.get(province) !== region) province = null;
  const typeRaw = first(params, "type") ?? "";
  const type = (JENIS_CODES as readonly string[]).includes(typeRaw) ? typeRaw : null;
  const roleRaw = first(params, "role") ?? "";
  const role = (OMS_ROLES as readonly string[]).includes(roleRaw) ? (roleRaw as OmsRole) : null;
  return { q, region, province, type, role };
}

const fold = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("id");

export function filterOms(entries: OmsEntry[], query: OmsQuery, provinceRegion: Map<string, string>): OmsEntry[] {
  const needle = query.q ? fold(query.q) : "";
  return entries.filter((e) => {
    if (query.region && !e.province_codes.some((c) => provinceRegion.get(c) === query.region)) return false;
    if (query.province === NATIONAL && !e.national) return false;
    if (query.province && query.province !== NATIONAL && !e.province_codes.includes(query.province)) return false;
    if (query.type && !e.scheme_codes.includes(query.type)) return false;
    if (query.role && !e.roles.includes(query.role)) return false;
    if (needle) {
      const hay = [e.name, e.short_name, e.locations, e.activity, e.partners, e.org_type].filter(Boolean).join(" ");
      if (!fold(hay).includes(needle)) return false;
    }
    return true;
  });
}

export function omsActiveCount(q: OmsQuery): number {
  return [q.q, q.region, q.province, q.type, q.role].filter((v) => v !== null && v !== "").length;
}

/** Jumlah organisasi per provinsi, untuk tautan dari halaman lain. */
export function omsCountForProvince(entries: OmsEntry[], provinceCode: string): number {
  return entries.filter((e) => e.province_codes.includes(provinceCode)).length;
}
