"""Audit read-only workbook GoKUPS untuk PDPSI (Tahap 0).

Membaca Data_SK_Perhutanan_Sosial_GoKUPS.xlsx tanpa mengubahnya, lalu menulis:
  docs/audit/audit_summary.json        angka ringkas yang dikutip di docs/DATA_AUDIT.md
  docs/audit/sk_duplicate_groups.csv   semua baris dalam kelompok nomor SK duplikat
  docs/audit/members_mismatch.csv      baris dengan L + P != total anggota
  docs/audit/area_mismatch.csv         baris dengan jumlah komponen luas != luas total
  docs/audit/region_crosswalk_draft.csv  usulan pemetaan nama wilayah sumber ke kode BIG/Kemendagri

File keluaran sengaja tidak memuat Nama Lembaga, Ketua Lembaga, Pra-Pendamping,
dan Pendamping karena sebagian berisi nama orang.

Jalankan dari root proyek:  python3 scripts/audit/audit_dataset.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "Data_SK_Perhutanan_Sosial_GoKUPS.xlsx"
BIG_REF = ROOT / "data/reference/big_kabkota_2023_attributes.csv"
OUT = ROOT / "docs/audit"
EXTRACTED_AT = pd.Timestamp("2026-11-02")  # dari sheet Catatan

SK = "Nomor Surat Keputusan"
DATE = "Tanggal Surat Keputusan"
NAME = "Nama Lembaga"
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
PERSONAL = ["Nama Lembaga", "Ketua Lembaga", "Pra-Pendamping", "Pendamping"]
SAFE_COLS = ["No", SK, DATE, "Skema", "Provinsi", "Kabupaten Kota", "Kecamatan"]


def i(x):
    """Konversi tipe numpy ke tipe JSON biasa."""
    if hasattr(x, "item"):
        return x.item()
    return x


def norm_sk(s: pd.Series) -> pd.Series:
    return s.str.upper().str.replace(r"\s+", "", regex=True)


def norm_name(s: str) -> str:
    s = s.upper().replace("KEP.", "KEPULAUAN").replace("DAERAH ISTIMEWA", "D I")
    s = re.sub(r"[^A-Z ]", " ", s)
    return re.sub(r"\s+", "", s)


# Alias manual yang tidak tertangkap normalisasi nama. Wajib diverifikasi manusia.
MANUAL_ALIAS = {("SULAWESI SELATAN", "PANGKAJENE KEPULAUAN"): "73.10"}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    xls = pd.ExcelFile(SRC)
    sheets = {n: pd.read_excel(xls, sheet_name=n, header=None).shape for n in xls.sheet_names}
    df = pd.read_excel(xls, sheet_name="SK Perhutanan Sosial")
    pdm = pd.read_excel(xls, sheet_name="Pendamping")
    s: dict = {"source_file": SRC.name, "sheets_raw_shape": sheets}

    # --- Struktur dan kelengkapan
    s["rows"] = len(df)
    s["columns"] = list(df.columns)
    s["null_counts"] = {c: i(v) for c, v in df.isna().sum().items()}
    s["pra_pendamping_literal_zero"] = i((df["Pra-Pendamping"].astype(str) == "0").sum())
    s["pendamping_sheet"] = {
        "rows": len(pdm),
        "unique_names": i(pdm["Nama Lengkap"].nunique()),
        "null_sk_ps": i(pdm["SK Perhutanan Sosial"].isna().sum()),
    }

    # --- Nomor SK
    nsk = norm_sk(df[SK])
    vc = df[SK].value_counts()
    dup = vc[vc > 1]
    s["sk"] = {
        "unique_raw": i(df[SK].nunique()),
        "unique_normalized_upper_nospace": i(nsk.nunique()),
        "duplicate_groups": len(dup),
        "rows_in_duplicate_groups": i(dup.sum()),
        "excess_rows": i(dup.sum() - len(dup)),
        "group_size_distribution": {str(k): i(v) for k, v in dup.value_counts().sort_index().items()},
        "distinct_format_patterns": i(
            df[SK].str.replace(r"\d+", "9", regex=True).nunique()
        ),
        "contains_double_space": i(df[SK].str.contains(r"\s{2,}").sum()),
        "truncated_year_tahun_3digit": i(df[SK].str.contains(r"TAHUN \d{3}$").sum()),
    }
    # Klasifikasi kelompok duplikat
    d = df[df[SK].isin(dup.index)].copy()
    cmp_cols = [c for c in df.columns if c != "No"]
    cls = {}
    for key, g in d.groupby(SK):
        if len(g.drop_duplicates(cmp_cols)) == 1:
            cls[key] = "identik_penuh"
        elif g[NAME].nunique(dropna=False) == len(g):
            cls[key] = "beda_lembaga"
        else:
            cls[key] = "campuran"
    d["dup_class"] = d[SK].map(cls)
    s["sk"]["duplicate_group_classes"] = {k: i(v) for k, v in pd.Series(cls).value_counts().items()}
    excess_identical = df.drop(columns=["No"]).duplicated()
    s["sk"]["exact_duplicate_rows_excess"] = i(excess_identical.sum())
    s["sk"]["exact_duplicate_excess_area_ha"] = i(df.loc[excess_identical, AREA_TOTAL].sum())
    s["sk"]["exact_duplicate_excess_members"] = i(df.loc[excess_identical, T].sum())
    coll = pd.DataFrame({"raw": df[SK], "n": nsk}).groupby("n")["raw"].nunique()
    s["sk"]["normalized_collisions_with_different_raw_text"] = i((coll > 1).sum())
    d["sk_normalized"] = nsk[d.index]
    d[SAFE_COLS + ["sk_normalized", "dup_class", AREA_TOTAL, T]].sort_values([SK, "No"]).to_csv(
        OUT / "sk_duplicate_groups.csv", index=False
    )

    # --- Tanggal SK
    t = df[DATE]
    yr = df[SK].str.extract(r"(?:TAHUN|THN|TH)\s*(\d{4})")[0].fillna(
        df[SK].str.extract(r"/(\d{4})\s*$")[0]
    ).astype(float)
    s["dates"] = {
        "min": str(t.min().date()),
        "max": str(t.max().date()),
        "after_extraction_date": i((t > EXTRACTED_AT).sum()),
        "by_year": {str(k): i(v) for k, v in t.dt.year.value_counts().sort_index().items()},
        "sk_number_with_parseable_year": i(yr.notna().sum()),
        "sk_year_differs_from_date_year": i(((yr != t.dt.year) & yr.notna()).sum()),
    }

    # --- Luas
    parts = df[AREA_PARTS].sum(axis=1)
    diff = df[AREA_TOTAL] - parts
    s["area"] = {
        "total_sum_ha": i(df[AREA_TOTAL].sum()),
        "components_sum_ha": round(float(parts.sum()), 2),
        "component_sums_ha": {c: round(float(df[c].sum()), 2) for c in AREA_PARTS},
        "total_is_integer_all_rows": bool((df[AREA_TOTAL] % 1 == 0).all()),
        "rows_component_with_decimals": i((df[AREA_PARTS] % 1 != 0).any(axis=1).sum()),
        "rows_total_eq_components_within_1ha": i((diff.abs() < 1).sum()),
        "rows_mismatch_ge_1ha": i((diff.abs() >= 1).sum()),
        "rows_mismatch_1_to_5ha": i(((diff.abs() >= 1) & (diff.abs() <= 5)).sum()),
        "rows_total_gt_components": i((diff >= 1).sum()),
        "rows_total_lt_components": i((diff <= -1).sum()),
        "rows_total_zero": i((df[AREA_TOTAL] == 0).sum()),
        "rows_total_zero_components_positive": i(((df[AREA_TOTAL] == 0) & (parts > 0)).sum()),
        "rows_total_eq_1ha": i((df[AREA_TOTAL] == 1).sum()),
        "negative_values": i((df[AREA_PARTS + [AREA_TOTAL]] < 0).sum().sum()),
        "median_by_scheme_ha": {k: i(v) for k, v in df.groupby("Skema")[AREA_TOTAL].median().items()},
    }
    df.loc[diff.abs() >= 1, SAFE_COLS + AREA_PARTS + [AREA_TOTAL]].assign(
        components_sum=parts, difference=diff
    ).to_csv(OUT / "area_mismatch.csv", index=False)

    # --- Anggota
    lp = df[M] + df[F]
    md = df[T] - lp
    mm = md != 0
    s["members"] = {
        "sum_male": i(df[M].sum()),
        "sum_female": i(df[F].sum()),
        "sum_total_column": i(df[T].sum()),
        "sum_male_plus_female": i(lp.sum()),
        "rows_consistent": i((~mm).sum()),
        "rows_mismatch": i(mm.sum()),
        "rows_mismatch_where_total_equals_female": i((mm & (df[T] == df[F])).sum()),
        "rows_mismatch_total_gt_sum": i((md > 0).sum()),
        "rows_all_zero": i(((df[T] == 0) & (lp == 0)).sum()),
        "rows_female_zero": i((df[F] == 0).sum()),
        "rows_female_negative": i((df[F] < 0).sum()),
        "rows_total_le_1": i((df[T] <= 1).sum()),
        "mismatch_by_year": {
            str(k): i(v) for k, v in mm.groupby(t.dt.year).sum().items() if v
        },
        "mismatch_by_scheme": {k: i(v) for k, v in mm.groupby(df["Skema"]).sum().items() if v},
        "female_zero_share_by_year": {
            str(k): round(float(v), 2) for k, v in (df[F] == 0).groupby(t.dt.year).mean().items()
        },
    }
    df.loc[mm, SAFE_COLS + [M, F, T]].to_csv(OUT / "members_mismatch.csv", index=False)

    # --- Skema dan kategori
    s["scheme_counts"] = {k: i(v) for k, v in df["Skema"].value_counts().items()}
    s["bentuk_lembaga_counts"] = {
        str(k): i(v) for k, v in df["Bentuk Lembaga"].value_counts(dropna=False).items()
    }
    htr = df[df["Skema"] == "HUTAN TANAMAN RAKYAT"]
    s["htr"] = {
        "rows": len(htr),
        "rows_members_le_1": i((htr[T] <= 1).sum()),
        "rows_name_pattern_person_with_group": i(
            htr[NAME].fillna("").str.match(r"^[^()]+\(.+\)\s*$").sum()
        ),
        "rows_bentuk_lphd": i((htr["Bentuk Lembaga"] == "LEMBAGA PENGELOLA HUTAN DESA").sum()),
        "top_regencies": {k: i(v) for k, v in htr["Kabupaten Kota"].value_counts().head(5).items()},
    }
    kph = df["Kesatuan Pengelola Hutan"].fillna("")
    s["kph_bengkulu_utara_outside_bengkulu"] = i(
        (kph.str.contains("BENGKULU UTARA") & (df["Provinsi"] != "BENGKULU")).sum()
    )

    # --- Wilayah
    s["regions"] = {
        "province_names": i(df["Provinsi"].nunique()),
        "regency_names": i(df["Kabupaten Kota"].nunique()),
        "province_regency_pairs": i(df.groupby(["Provinsi", "Kabupaten Kota"]).ngroups),
        "district_names": i(df["Kecamatan"].nunique()),
        "top_regencies_by_rows": {
            k: i(v) for k, v in df["Kabupaten Kota"].value_counts().head(10).items()
        },
    }
    ref = pd.read_csv(BIG_REF, dtype=str).fillna("")
    ref = ref[ref["kdpkab"].str.match(r"^\d\d\.\d\d$")].drop_duplicates("kdpkab")
    is_kota = ref["tipadm"] == "5"
    ref["key"] = [
        norm_name(p) + "|" + ("KOTA" + norm_name(k[5:]) if kt and k.startswith("Kota ") else norm_name(k))
        for p, k, kt in zip(ref["wadmpr"], ref["wadmkk"], is_kota)
    ]
    src = df.groupby(["Provinsi", "Kabupaten Kota"]).size().reset_index(name="rows")

    def skey(p: str, k: str) -> str:
        # "KOTA BARU" di Kalimantan Selatan adalah Kabupaten Kotabaru, bukan kota.
        if k.startswith("KOTA ") and k != "KOTA BARU":
            return norm_name(p) + "|KOTA" + norm_name(k[5:])
        return norm_name(p) + "|" + norm_name(k)

    src["key"] = [skey(p, k) for p, k in zip(src["Provinsi"], src["Kabupaten Kota"])]
    cw = src.merge(ref[["key", "kdppum", "kdpkab", "wadmpr", "wadmkk", "tipadm"]], on="key", how="left")
    cw["match_method"] = cw["kdpkab"].notna().map({True: "nama_ternormalisasi", False: ""})
    for (p, k), code in MANUAL_ALIAS.items():
        sel = (cw["Provinsi"] == p) & (cw["Kabupaten Kota"] == k)
        r = ref[ref["kdpkab"] == code].iloc[0]
        for col in ["kdppum", "kdpkab", "wadmpr", "wadmkk", "tipadm"]:
            cw.loc[sel, col] = r[col]
        cw.loc[sel, "match_method"] = "alias_manual"
    cw["verified"] = False
    cw = cw.drop(columns="key").rename(
        columns={
            "Provinsi": "source_province",
            "Kabupaten Kota": "source_regency",
            "kdppum": "province_code",
            "kdpkab": "regency_code",
            "wadmpr": "official_province_name",
            "wadmkk": "official_regency_name",
            "tipadm": "official_type",
        }
    )
    cw.to_csv(OUT / "region_crosswalk_draft.csv", index=False)
    s["regions"]["crosswalk"] = {
        "reference": "BIG geoservices Wilayah_Administrasi_Kabupaten__Kota (edisi Sep 2023)",
        "reference_regency_codes": len(ref),
        "reference_province_codes": i(ref["kdppum"].nunique()),
        "matched_by_normalized_name": i((cw["match_method"] == "nama_ternormalisasi").sum()),
        "matched_by_manual_alias": i((cw["match_method"] == "alias_manual").sum()),
        "unmatched": i((cw["match_method"] == "").sum()),
        "regency_codes_without_records": len(ref) - i(cw["regency_code"].nunique()),
    }

    (OUT / "audit_summary.json").write_text(json.dumps(s, indent=2, ensure_ascii=False))
    print(json.dumps(s, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
