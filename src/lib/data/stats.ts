import { aggregate } from "./aggregate";
import type { AdminArea, ApprovalRecord } from "./types";

/**
 * Data untuk grafik Statistik dan Beranda. Semua angka berasal dari fungsi aggregate()
 * yang sama dengan tabel, halaman Data, dan uji konsistensi terhadap pipeline.
 */
export const JENIS_ORDER = ["HD", "HKM", "HTR", "HA", "KK"] as const;

export interface RegionStat {
  code: string;
  name: string;
  records: number;
  area: number;
  members: number;
  byJenis: Record<string, number>;
}

export function jenisStats(records: ApprovalRecord[]) {
  return JENIS_ORDER.map((code) => {
    const b = aggregate(records.filter((r) => r.derived.jenis_ps_code === code));
    return { code, records: b.records, area: b.area_ha, members: b.members_male_plus_female };
  });
}

/** Statistik per wilayah: provinsi, atau kabupaten/kota bila level = "regency". */
export function regionStats(records: ApprovalRecord[], level: "province" | "regency", admin: AdminArea[]): RegionStat[] {
  const names = new Map(admin.map((a) => [a.code, a.name]));
  const groups = new Map<string, ApprovalRecord[]>();
  for (const r of records) {
    const code = level === "province" ? r.derived.province_code : r.derived.regency_code;
    const list = groups.get(code);
    if (list) list.push(r);
    else groups.set(code, [r]);
  }
  return [...groups].map(([code, list]) => {
    const b = aggregate(list);
    const byJenis: Record<string, number> = {};
    for (const j of JENIS_ORDER) byJenis[j] = 0;
    for (const r of list) byJenis[r.derived.jenis_ps_code] = (byJenis[r.derived.jenis_ps_code] ?? 0) + 1;
    return { code, name: names.get(code) ?? code, records: b.records, area: b.area_ha, members: b.members_male_plus_female, byJenis };
  });
}
