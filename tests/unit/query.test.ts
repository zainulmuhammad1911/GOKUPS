import { describe, expect, it } from "vitest";
import { aggregate } from "@/lib/data/aggregate";
import { loadExportSchema, loadRelease } from "@/lib/data/release";
import { applyQuery, EMPTY_QUERY, memberFilterCounts, paginate, parseQuery, queryContext, regionList, toSearchParams } from "@/lib/data/query";

const { approvals, adminAreas, totals } = loadRelease();
const ctx = queryContext(adminAreas, approvals, Object.keys(loadExportSchema().flag_docs));
const run = (p: Record<string, string>) => applyQuery(approvals, parseQuery(p, ctx).query);

describe("filter cocok dengan total kontrol pipeline", () => {
  it("provinsi", () => {
    for (const row of totals.by_province) {
      expect(run({ province: row.province_code }).length).toBe(row.records);
    }
  });
  it("kabupaten/kota", () => {
    for (const row of totals.by_regency.slice(0, 50)) {
      expect(run({ regency: row.regency_code }).length).toBe(row.records);
    }
  });
  it("jenis PS dan subskema KK", () => {
    for (const row of totals.by_jenis_ps) expect(run({ type: row.jenis_ps_code }).length).toBe(row.records);
    for (const row of totals.by_scheme.filter((s) => s.scheme_code.startsWith("KK_"))) {
      expect(run({ type: row.scheme_code }).length).toBe(row.records);
    }
  });
  it("provinsi × jenis PS, dan agregat hasil filter = total kontrol", () => {
    for (const row of totals.by_province_jenis_ps) {
      const rows = run({ province: row.province_code, type: row.jenis_ps_code });
      const { province_code: _p, jenis_ps_code: _j, ...expected } = row;
      expect(aggregate(rows)).toEqual(expected);
    }
  });
  it("rentang tahun", () => {
    const expected = totals.by_year.filter((y) => y.approval_year !== null && y.approval_year >= 2017 && y.approval_year <= 2020);
    expect(run({ year_from: "2017", year_to: "2020" }).length).toBe(expected.reduce((a, y) => a + y.records, 0));
  });
  it("penanda: duplikat", () => {
    expect(run({ flag: "duplicate_sk" }).length).toBe(282);
  });
});

describe("filter anggota tercatat (laki-laki + perempuan)", () => {
  const counted = approvals.filter((r) => r.derived.members_calc_status === "dihitung");
  it("1 orang = rekaman dengan anggota L+P = 1", () => {
    const rows = run({ members: "1" });
    expect(rows.length).toBe(counted.filter((r) => r.derived.members_male_plus_female === 1).length);
    expect(rows.every((r) => (r.source["Anggota Laki-Laki"] as number) + (r.source["Anggota Perempuan"] as number) === 1)).toBe(true);
    // Agregat hasil filter: anggota = jumlah rekaman.
    expect(aggregate(rows).members_male_plus_female).toBe(rows.length);
  });
  it("keempat pilihan membagi seluruh rekaman tanpa tumpang tindih", () => {
    const c = memberFilterCounts(approvals);
    expect(c["1"] + c["2plus"] + c["0"] + c.na).toBe(approvals.length);
    expect(c.na).toBe(approvals.length - counted.length);
    expect(run({ members: "2plus" }).length).toBe(c["2plus"]);
  });
  it("bisa digabung dengan jenis PS; nilai tidak dikenal diabaikan", () => {
    const htr = run({ members: "1", type: "HTR" });
    expect(htr.every((r) => r.derived.jenis_ps_code === "HTR")).toBe(true);
    expect(parseQuery({ members: "3" }, ctx).ignored).toEqual(["members"]);
    expect(toSearchParams({ ...EMPTY_QUERY, members: "1" })).toEqual({ members: "1" });
  });
});

describe("filter pendamping (K11)", () => {
  it("ada + tidak = seluruh rekaman; ada = total kontrol", () => {
    const ada = run({ pendamping: "ada" });
    const tidak = run({ pendamping: "tidak" });
    expect(ada.length + tidak.length).toBe(approvals.length);
    expect(ada.length).toBe(totals.national.pendamping_recorded_records);
    expect(ada.every((r) => r.derived.pendamping_status === "tercatat")).toBe(true);
  });
  it("per provinsi cocok dengan total kontrol; digabung dengan filter anggota", () => {
    for (const row of totals.by_province) {
      expect(run({ province: row.province_code, pendamping: "ada" }).length).toBe(row.pendamping_recorded_records);
    }
    const both = run({ members: "1", pendamping: "ada" });
    expect(both.every((r) => r.derived.members_male_plus_female === 1 && r.derived.pendamping_status === "tercatat")).toBe(true);
    expect(parseQuery({ pendamping: "ya" }, ctx).ignored).toEqual(["pendamping"]);
  });
});

describe("filter Region (kolom sumber)", () => {
  it("7 region membagi seluruh rekaman; nilai = kolom sumber apa adanya", () => {
    const regions = regionList(ctx);
    expect(regions).toHaveLength(7);
    expect(regions[0]).toBe("Sumatera");
    expect(regions.reduce((a, r) => a + run({ region: r }).length, 0)).toBe(approvals.length);
    expect(run({ region: "Sulawesi" }).every((r) => r.source["Region"] === "Sulawesi")).toBe(true);
  });
  it("region = jumlah provinsi di dalamnya; provinsi di luar region diabaikan", () => {
    const sulawesi = totals.by_province.filter((p) => ctx.provinceRegion.get(p.province_code) === "Sulawesi");
    expect(run({ region: "Sulawesi" }).length).toBe(sulawesi.reduce((a, p) => a + p.records, 0));
    const parsed = parseQuery({ region: "Jawa", province: "72" }, ctx);
    expect(parsed.query.province).toBeNull();
    expect(parsed.ignored).toContain("province");
    expect(parseQuery({ region: "Atlantis" }, ctx).ignored).toEqual(["region"]);
  });
});

describe("pencarian, urutan, validasi", () => {
  it("pencarian tidak peka huruf dan tanda baca, nilai sumber tidak berubah", () => {
    const rows = run({ q: "kth muara kilis" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.source["Nama Lembaga"] === "KTH  MUARA KILIS")).toBe(true);
    expect(run({ q: "SK.10404/MENLHK-PSKL/PKPS/PSL.0/12/2019" }).length).toBe(3);
  });
  it("urut luas menurun, nilai terbesar di depan", () => {
    const rows = run({ sort: "area", dir: "desc" });
    const areas = rows.map((r) => r.source["Luas Area Keseluruhan (Ha)"] as number);
    expect(areas[0]).toBe(Math.max(...areas));
    expect(rows.length).toBe(approvals.length);
  });
  it("parameter tidak valid diabaikan dan dicatat", () => {
    const { query, ignored } = parseQuery({ province: "99", type: "XX", year_from: "1800", sort: "drop table", page: "-1" }, ctx);
    expect(query).toEqual({ ...EMPTY_QUERY });
    expect(ignored.sort()).toEqual(["province", "sort", "type", "year_from"]);
  });
  it("kabupaten di luar provinsi terpilih diabaikan", () => {
    const { query, ignored } = parseQuery({ province: "11", regency: "72.09" }, ctx);
    expect(query.regency).toBeNull();
    expect(ignored).toContain("regency");
  });
  it("toSearchParams hanya memuat nilai yang bukan bawaan", () => {
    expect(toSearchParams({ ...EMPTY_QUERY, province: "72", page: 3 })).toEqual({ province: "72", page: "3" });
  });
  it("paginasi", () => {
    const p = paginate(run({}), 403);
    expect(p.pages).toBe(403);
    expect(p.rows.length).toBe(approvals.length - 402 * 25);
  });
});

import { jenisStats, regionStats } from "@/lib/data/stats";

describe("data grafik = total kontrol", () => {
  it("per jenis PS", () => {
    const js = jenisStats(approvals);
    for (const row of totals.by_jenis_ps) {
      const s = js.find((j) => j.code === row.jenis_ps_code)!;
      expect([s.records, s.area, s.members]).toEqual([row.records, row.area_ha, row.members_male_plus_female]);
    }
  });
  it("per provinsi, komposisi jenis PS menjumlah ke total wilayah", () => {
    const rs = regionStats(approvals, "province", adminAreas);
    expect(rs.length).toBe(totals.provinces_with_records);
    for (const r of rs) {
      const row = totals.by_province.find((p) => p.province_code === r.code)!;
      expect(r.records).toBe(row.records);
      expect(Object.values(r.byJenis).reduce((a, b) => a + b, 0)).toBe(r.records);
    }
  });
  it("per kabupaten/kota di dalam provinsi terfilter", () => {
    const rs = regionStats(run({ province: "72" }), "regency", adminAreas);
    expect(rs.every((r) => r.code.startsWith("72."))).toBe(true);
    expect(rs.reduce((a, r) => a + r.records, 0)).toBe(totals.by_province.find((p) => p.province_code === "72")!.records);
  });
});
