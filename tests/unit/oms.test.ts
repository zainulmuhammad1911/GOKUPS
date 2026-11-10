import { describe, expect, it } from "vitest";
import { loadRelease } from "@/lib/data/release";
import { loadOmsDirectory } from "@/lib/data/oms";
import { filterOms, NATIONAL, omsActiveCount, omsCountForProvince, parseOmsQuery } from "@/lib/data/oms-query";
import { queryContext } from "@/lib/data/query";

const { approvals, adminAreas } = loadRelease();
const ctx = queryContext(adminAreas, approvals, []);
const dir = loadOmsDirectory();
const run = (p: Record<string, string>) => filterOms(dir.entries, parseOmsQuery(p, ctx), ctx.provinceRegion);

describe("data Direktori OMS yang terbit", () => {
  it("hanya memuat entri terverifikasi atau sebagian, sesuai hitungan", () => {
    expect(dir.entries.length).toBe(dir.counts.published);
    expect(dir.counts.published + dir.counts.withheld).toBe(dir.counts.rows);
    for (const e of dir.entries) expect(["verified", "partial"]).toContain(e.verification.status);
  });

  it("tidak memuat kolom internal direktori", () => {
    const keys = new Set(dir.entries.flatMap((e) => Object.keys(e)));
    for (const k of ["evidence_level", "Tingkat Bukti", "Asal Informasi", "Catatan / Perlu Verifikasi", "recommendation"]) {
      expect(keys.has(k)).toBe(false);
    }
  });

  it("semua tautan http(s) dan semua kode provinsi dikenal", () => {
    for (const e of dir.entries) {
      for (const x of e.verification.evidence) expect(x.url).toMatch(/^https?:\/\//);
      if (e.verification.website) expect(e.verification.website).toMatch(/^https?:\/\//);
      for (const c of e.province_codes) expect(ctx.provinceCodes.has(c)).toBe(true);
      expect(e.province_codes.length > 0 || e.national).toBe(true);
    }
  });
});

describe("filter Direktori OMS", () => {
  it("tanpa filter menampilkan semua", () => {
    expect(run({}).length).toBe(dir.entries.length);
  });

  it("provinsi, region, dan nasional", () => {
    const kalbar = run({ province: "61" });
    expect(kalbar.length).toBe(omsCountForProvince(dir.entries, "61"));
    expect(kalbar.every((e) => e.province_codes.includes("61"))).toBe(true);
    const kalimantan = run({ region: "Kalimantan" });
    expect(kalimantan.length).toBeGreaterThanOrEqual(kalbar.length);
    expect(run({ province: NATIONAL }).every((e) => e.national)).toBe(true);
  });

  it("provinsi di luar region terpilih diabaikan", () => {
    const q = parseOmsQuery({ region: "Papua", province: "61" }, ctx);
    expect(q.province).toBeNull();
    expect(q.region).toBe("Papua");
  });

  it("jenis PS, peran, dan pencarian tanpa membedakan huruf besar", () => {
    expect(run({ type: "HA" }).every((e) => e.scheme_codes.includes("HA"))).toBe(true);
    expect(run({ role: "adat" }).every((e) => e.roles.includes("adat"))).toBe(true);
    expect(run({ q: "warsi" }).some((e) => e.short_name === "KKI WARSI")).toBe(true);
    expect(run({ q: "zzzzzz" })).toEqual([]);
  });

  it("nilai tidak dikenal diabaikan", () => {
    const q = parseOmsQuery({ province: "99", type: "XX", role: "boss", region: "Mars" }, ctx);
    expect(omsActiveCount(q)).toBe(0);
  });
});
