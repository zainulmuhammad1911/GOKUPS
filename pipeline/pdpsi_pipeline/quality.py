"""Pemeriksaan per rekaman.

Modul ini hanya menambah metadata hasil pemeriksaan sistem: penanda (flags),
referensi duplikat, dan status dapat-dihitung. Tidak ada nilai sumber yang
diubah dan tidak ada rekaman yang dihapus atau dikeluarkan karena penanda
(DECISIONS.md bagian 1, K1, K4, K5).
"""
from __future__ import annotations

import pandas as pd

SK = "Nomor Surat Keputusan"
AREA_PARTS = [
    "Luas Area Hutan Lindung (Ha)",
    "Luas Area Hutan Produksi (Ha)",
    "Luas Area Hutan Produksi Konversi (Ha)",
    "Luas Area Hutan Produksi Terbatas (Ha)",
    "Luas Area Hutan Konservasi (Ha)",
    "Luas Area Penggunaan Lain (Ha)",
]
AREA_TOTAL = "Luas Area Keseluruhan (Ha)"
M, F, T = "Anggota Laki-Laki", "Anggota Perempuan", "Anggota Keseluruhan"

FLAG_DOCS = {
    "duplicate_sk": "Duplikat: nomor SK (teks persis sama) juga dipakai rekaman lain. Semua rekaman tetap dihitung.",
    "duplicate_identical": "Duplikat identik: semua kolom sumber selain No sama dengan rekaman lain bernomor SK sama.",
    "duplicate_attributes_differ": "Duplikat dengan atribut berbeda: nomor SK sama, tetapi isi kolom lain berbeda.",
    "sk_spacing_variant": "Nomor SK hanya berbeda spasi atau huruf besar/kecil dengan nomor SK rekaman lain; kemungkinan nomor SK sama dengan penulisan berbeda.",
    "sk_year_truncated": "Tahun pada nomor SK tertulis 3 digit.",
    "date_after_extraction": "Tanggal SK sesudah tanggal pengambilan data.",
    "date_year_mismatch": "Tahun pada nomor SK berbeda dengan tahun tanggal SK.",
    "area_zero": "Luas total di sumber bernilai 0.",
    "area_component_mismatch": "Selisih luas total dan jumlah komponen luas lebih dari ambang penanda (5 ha). Luas tetap dihitung.",
    "area_component_rounding": "Selisih luas total dan jumlah komponen 1 sampai 5 ha. Luas tetap dihitung.",
    "area_missing": "Luas total kosong di sumber; tidak bisa dihitung.",
    "area_negative": "Luas total negatif di sumber; tidak dihitung.",
    "members_total_column_mismatch": "Anggota Keseluruhan di sumber tidak sama dengan laki-laki + perempuan.",
    "members_total_equals_female": "Anggota Keseluruhan di sumber sama dengan jumlah anggota perempuan, padahal anggota laki-laki lebih dari 0.",
    "members_negative": "Ada nilai anggota negatif di sumber; laki-laki + perempuan tidak dihitung.",
    "members_component_missing": "Anggota laki-laki atau perempuan kosong di sumber; laki-laki + perempuan tidak tersedia.",
    "institution_type_lphd_on_htr": "Bentuk lembaga tercatat Lembaga Pengelola Hutan Desa pada skema Hutan Tanaman Rakyat.",
    "kph_bengkulu_utara_outside_bengkulu": "KPH tercatat KPHP Bengkulu Utara pada rekaman di luar Provinsi Bengkulu. Catatan workbook menyebut ini isian sumber GoKUPS yang perlu dikonfirmasi.",
}


def duplicate_info(df: pd.DataFrame, compare_cols: list[str], ids: pd.Series, sk_norm: pd.Series) -> pd.DataFrame:
    """Referensi duplikat per rekaman.

    duplicate_sk  : rekaman lain dengan teks nomor SK persis sama (semua, tanpa batas jumlah)
    duplicate_type: 'identik' bila ada rekaman lain dalam kelompok dengan semua kolom pembanding sama,
                    selain itu 'atribut_berbeda'
    spacing       : rekaman lain yang nomor SK-nya hanya berbeda spasi/huruf besar-kecil
    """
    out = pd.DataFrame(index=df.index)
    out["dup_count"] = df.groupby(SK)[SK].transform("size").astype(int)
    out["dup_related_ids"] = [[] for _ in range(len(df))]
    out["dup_type"] = None
    for _, g in df[out["dup_count"] > 1].groupby(SK, sort=False):
        sig = g[compare_cols].astype(str).agg("\x1f".join, axis=1)
        sig_counts = sig.value_counts()
        for i in g.index:
            out.at[i, "dup_related_ids"] = sorted(ids[j] for j in g.index if j != i)
            out.at[i, "dup_type"] = "identik" if sig_counts[sig[i]] > 1 else "atribut_berbeda"

    out["spacing_related_ids"] = [[] for _ in range(len(df))]
    raw_by_norm = pd.DataFrame({"raw": df[SK], "norm": sk_norm, "id": ids})
    for _, g in raw_by_norm.groupby("norm"):
        if g["raw"].nunique() > 1:
            for i in g.index:
                out.at[i, "spacing_related_ids"] = sorted(g.loc[g["raw"] != g.at[i, "raw"], "id"])
    return out


def compute_flags(df: pd.DataFrame, rules: dict, extracted_at: pd.Timestamp, sk_year: pd.Series) -> pd.DataFrame:
    flags: dict[int, list[str]] = {i: [] for i in df.index}

    def add(mask: pd.Series, flag: str) -> None:
        for i in mask[mask.fillna(False).astype(bool)].index:
            flags[i].append(flag)

    add(df["dup_count"] > 1, "duplicate_sk")
    add(df["dup_type"] == "identik", "duplicate_identical")
    add(df["dup_type"] == "atribut_berbeda", "duplicate_attributes_differ")
    add(df["spacing_related_ids"].map(len) > 0, "sk_spacing_variant")
    add(df[SK].str.contains(r"TAHUN \d{3}$", regex=True, na=False), "sk_year_truncated")

    date = df["Tanggal Surat Keputusan"]
    add(date > extracted_at.tz_convert(None).normalize(), "date_after_extraction")
    add(sk_year.notna() & (sk_year != date.dt.year), "date_year_mismatch")

    total = df[AREA_TOTAL]
    parts = df[AREA_PARTS].sum(axis=1, min_count=1)
    diff = (total - parts).abs()
    threshold = rules["area"]["flag_component_diff_above_ha"]
    add(total == 0, "area_zero")
    add(diff > threshold, "area_component_mismatch")
    add((diff >= 1) & (diff <= threshold), "area_component_rounding")
    add(total.isna(), "area_missing")
    add(total < 0, "area_negative")

    male, female, src_total = df[M], df[F], df[T]
    missing = male.isna() | female.isna()
    negative = ~missing & ((male < 0) | (female < 0))
    add(~missing & src_total.notna() & (src_total != male + female), "members_total_column_mismatch")
    add(~missing & (male > 0) & (src_total == female) & (src_total != male + female), "members_total_equals_female")
    add(negative, "members_negative")
    add(missing, "members_component_missing")

    add((df["Skema"] == "HUTAN TANAMAN RAKYAT") & (df["Bentuk Lembaga"] == "LEMBAGA PENGELOLA HUTAN DESA"),
        "institution_type_lphd_on_htr")
    kph = df["Kesatuan Pengelola Hutan"].fillna("")
    add(kph.str.contains("BENGKULU UTARA") & (df["Provinsi"] != "BENGKULU"), "kph_bengkulu_utara_outside_bengkulu")

    out = pd.DataFrame(index=df.index)
    out["flags"] = pd.Series(flags)
    out["members_calc_status"] = "dihitung"
    out.loc[negative, "members_calc_status"] = "nilai_negatif"
    out.loc[missing, "members_calc_status"] = "komponen_kosong"
    out["members_male_plus_female"] = (male + female).where(out["members_calc_status"] == "dihitung")
    out["area_calc_status"] = "dihitung"
    out.loc[total < 0, "area_calc_status"] = "nilai_negatif"
    out.loc[total.isna(), "area_calc_status"] = "kosong"
    return out
