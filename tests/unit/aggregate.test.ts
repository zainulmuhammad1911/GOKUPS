import { describe, expect, it } from "vitest";
import { aggregate, aggregateBy } from "@/lib/data/aggregate";
import { loadRelease } from "@/lib/data/release";
import { UJI_RECORDS } from "../fixtures/uji-records";

/**
 * Agregasi TypeScript harus sama dengan total kontrol yang dihitung pipeline Python
 * (dua implementasi terpisah). Data: rilis aktif di data/releases/current.json.
 */
describe("agregasi rilis aktif = total kontrol pipeline", () => {
  const { approvals, totals } = loadRelease();

  it("nasional", () => {
    expect(aggregate(approvals)).toEqual(totals.national);
  });

  it.each([
    ["by_scheme", "scheme_code"],
    ["by_province", "province_code"],
    ["by_regency", "regency_code"],
  ] as const)("%s", (block, field) => {
    const ts = aggregateBy(approvals, (r) => r.derived[field]);
    expect(ts.size).toBe(totals[block].length);
    for (const row of totals[block]) {
      const { [field]: code, ...expected } = row as unknown as Record<string, unknown>;
      const { province_code: _p, ...rest } = expected as Record<string, unknown>;
      const got = ts.get(code as string);
      expect(got, String(code)).toEqual(field === "regency_code" ? rest : expected);
    }
  });

  it("rekap 5 jenis PS = total kontrol; Kemitraan Kehutanan = jumlah 3 subskema", () => {
    const ts = aggregateBy(approvals, (r) => r.derived.jenis_ps_code);
    for (const row of totals.by_jenis_ps) {
      const { jenis_ps_code, ...expected } = row;
      expect(ts.get(jenis_ps_code as "HD")).toEqual(expected);
    }
    const kk = ts.get("KK")!;
    const subs = totals.by_scheme.filter((s) => s.scheme_code.startsWith("KK_"));
    expect(kk.records).toBe(subs.reduce((a, s) => a + s.records, 0));
    expect(kk.area_ha).toBeCloseTo(subs.reduce((a, s) => a + s.area_ha, 0), 2);
  });

  it("tujuh kategori skema tidak digabung", () => {
    expect(new Set(approvals.map((a) => a.derived.scheme_code)).size).toBe(7);
  });
});

describe("aturan agregasi pada data uji (bukan data resmi)", () => {
  const block = aggregate(UJI_RECORDS);

  it("anggota 0 tetap dihitung; negatif dan kosong tidak", () => {
    expect(block.members_records_used).toBe(2);
    expect(block.members_male_plus_female).toBe(15);
    expect(block.members_records_not_used).toEqual({ nilai_negatif: 1, komponen_kosong: 1 });
  });

  it("laki-laki dan perempuan dari rekaman yang sama dengan total; perempuan 0 dihitung terpisah", () => {
    expect(block.members_male).toBe(10);
    expect(block.members_female).toBe(5);
    expect(block.members_male + block.members_female).toBe(block.members_male_plus_female);
    expect(block.members_female_zero_records).toBe(1);
  });

  it("luas dengan penanda selisih tetap dihitung; kosong tidak", () => {
    expect(block.area_ha).toBe(150);
    expect(block.area_records_used).toBe(3);
    expect(block.area_records_not_used).toEqual({ kosong: 1 });
  });

  it("kolom sumber Anggota Keseluruhan dijumlahkan terpisah, apa adanya", () => {
    expect(block.members_source_total_column).toBe(40);
    expect(block.members_source_total_column_records).toBe(3);
  });

  it("semua rekaman dihitung, termasuk duplikat", () => {
    expect(block.records).toBe(4);
  });
});
