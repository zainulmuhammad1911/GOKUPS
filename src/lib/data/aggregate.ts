import type { AggregateBlock, ApprovalRecord } from "./types";

/**
 * Satu-satunya tempat agregasi di aplikasi (TECHNICAL_PLAN §5.2, DECISIONS.md K1/K4/K5).
 * Aturannya sama dengan pipeline Python (pipeline/pdpsi_pipeline/aggregate.py);
 * uji Vitest membandingkan hasil keduanya.
 *
 * - Rekaman: semua rekaman, termasuk yang bernomor SK sama.
 * - Luas: kolom sumber "Luas Area Keseluruhan (Ha)" bila area_calc_status = dihitung.
 * - Anggota: laki-laki + perempuan bila members_calc_status = dihitung (termasuk 0).
 * - Pembanding: jumlah kolom sumber "Anggota Keseluruhan" apa adanya.
 */
export const AREA_COLUMN = "Luas Area Keseluruhan (Ha)";
export const MEMBERS_SOURCE_COLUMN = "Anggota Keseluruhan";

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

export function aggregate(records: Iterable<ApprovalRecord>): AggregateBlock {
  const block: AggregateBlock = {
    records: 0,
    area_ha: 0,
    area_records_used: 0,
    area_records_not_used: {},
    members_male_plus_female: 0,
    members_records_used: 0,
    members_records_not_used: {},
    members_source_total_column: null,
    members_source_total_column_records: 0,
  };
  let sourceTotal = 0;
  for (const r of records) {
    block.records += 1;
    const area = r.source[AREA_COLUMN];
    if (r.derived.area_calc_status === "dihitung" && typeof area === "number") {
      block.area_ha += area;
      block.area_records_used += 1;
    } else {
      bump(block.area_records_not_used, r.derived.area_calc_status);
    }
    const members = r.derived.members_male_plus_female;
    if (r.derived.members_calc_status === "dihitung" && typeof members === "number") {
      block.members_male_plus_female += members;
      block.members_records_used += 1;
    } else {
      bump(block.members_records_not_used, r.derived.members_calc_status);
    }
    const src = r.source[MEMBERS_SOURCE_COLUMN];
    if (typeof src === "number") {
      sourceTotal += src;
      block.members_source_total_column_records += 1;
    }
  }
  block.area_ha = Math.round(block.area_ha * 100) / 100;
  block.members_source_total_column = block.members_source_total_column_records > 0 ? sourceTotal : null;
  return block;
}

export function aggregateBy<K extends string>(
  records: ApprovalRecord[],
  key: (r: ApprovalRecord) => K,
): Map<K, AggregateBlock> {
  const groups = new Map<K, ApprovalRecord[]>();
  for (const r of records) {
    const k = key(r);
    const list = groups.get(k);
    if (list) list.push(r);
    else groups.set(k, [r]);
  }
  return new Map([...groups].map(([k, list]) => [k, aggregate(list)]));
}

export function countFlag(records: ApprovalRecord[], flag: string): number {
  let n = 0;
  for (const r of records) if (r.quality.flags.includes(flag)) n += 1;
  return n;
}
