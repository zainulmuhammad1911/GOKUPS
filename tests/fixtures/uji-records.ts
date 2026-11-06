import type { ApprovalRecord } from "@/lib/data/types";

/**
 * DATA UJI. BUKAN DATA RESMI. Hanya dipakai uji unit aturan agregasi.
 * Tidak dibaca aplikasi dan tidak masuk rilis.
 */
function uji(
  id: string,
  source: Record<string, string | number | null>,
  derived: Partial<ApprovalRecord["derived"]>,
  duplicate = false,
): ApprovalRecord {
  return {
    id,
    source: { "Nama Lembaga": `DATA UJI ${id} (BUKAN DATA RESMI)`, ...source },
    derived: {
      sk_normalized: "UJI",
      approval_year: 2000,
      scheme_code: "HKM",
      scheme_label_id: "UJI",
      scheme_parent: null,
      jenis_ps_code: "HKM",
      jenis_ps_label_id: "UJI",
      record_kind: "persetujuan",
      province_code: "00",
      province_name_official: "UJI",
      regency_code: "00.00",
      regency_name_official: "UJI",
      regency_type: "kabupaten",
      members_male_plus_female: null,
      members_calc_status: "dihitung",
      area_calc_status: "dihitung",
      pendamping_status: "kosong",
      ...derived,
    },
    quality: {
      flags: duplicate ? ["duplicate_sk"] : [],
      duplicate: null,
      sk_spacing_variant_ids: [],
    },
    release_version: "UJI",
  };
}

export const UJI_RECORDS: ApprovalRecord[] = [
  // Anggota 0 + 0 tetap dihitung (K1).
  uji("uji-1", { "Luas Area Keseluruhan (Ha)": 100, "Anggota Laki-Laki": 0, "Anggota Perempuan": 0, "Anggota Keseluruhan": 0 }, { members_male_plus_female: 0 }),
  // Duplikat tetap dihitung (K4). Luas dengan penanda selisih tetap dihitung (K5).
  uji("uji-2", { "Luas Area Keseluruhan (Ha)": 50, "Anggota Laki-Laki": 10, "Anggota Perempuan": 5, "Anggota Keseluruhan": 5 }, { members_male_plus_female: 15 }, true),
  // Nilai negatif: tidak dihitung untuk anggota.
  uji("uji-3", { "Luas Area Keseluruhan (Ha)": 0, "Anggota Laki-Laki": 38, "Anggota Perempuan": -3, "Anggota Keseluruhan": 35 }, { members_calc_status: "nilai_negatif" }),
  // Komponen kosong: anggota tidak tersedia; luas kosong tidak dihitung.
  uji(
    "uji-4",
    { "Luas Area Keseluruhan (Ha)": null, "Anggota Keseluruhan": null },
    { members_calc_status: "komponen_kosong", area_calc_status: "kosong" },
  ),
];
