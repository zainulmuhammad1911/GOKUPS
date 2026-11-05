"""Agregat hasil pengolahan PDPSI dari data sumber.

Aplikasi web menghitung ulang agregat yang sama dari approvals.json. Uji otomatis
membandingkan keduanya. Definisi di bawah juga ditulis ke control_totals.json
agar setiap angka bisa ditelusuri ke rekaman pembentuknya.
"""
from __future__ import annotations

import pandas as pd

from .quality import AREA_TOTAL, T

DEFINITIONS = {
    "label": "Hasil pengolahan PDPSI dari data sumber GoKUPS. Bukan angka resmi nasional.",
    "records": "Jumlah rekaman (baris sumber). Semua rekaman dihitung, termasuk rekaman bernomor SK sama.",
    "area_ha": "Jumlah kolom sumber 'Luas Area Keseluruhan (Ha)' pada rekaman yang nilainya tersedia dan tidak negatif. Penanda selisih luas tidak mengeluarkan rekaman.",
    "members_male_plus_female": "Jumlah (Anggota Laki-Laki + Anggota Perempuan) pada rekaman yang kedua nilainya tersedia dan tidak negatif, termasuk yang hasilnya 0.",
    "members_source_total_column": "Jumlah kolom sumber 'Anggota Keseluruhan' apa adanya, untuk pembanding. Tidak dipakai sebagai indikator karena pada sebagian rekaman nilainya sama dengan anggota perempuan.",
    "jenis_ps": "Rekap memakai 5 jenis PS: Hutan Desa, Hutan Kemasyarakatan, Hutan Tanaman Rakyat, Hutan Adat, Kemitraan Kehutanan. Kemitraan Kehutanan = jumlah tiga subskema sumber berlabel 'KEMITRAAN KEHUTANAN ~' (Kulin KK, Konservasi, IPHPS); rinciannya ditampilkan di setiap rekap.",
    "unit": "Unit rekap adalah rekaman SK penerima persetujuan/penetapan, bukan jumlah kelompok. Sebagian rekaman HTR adalah izin perorangan, dan sebagian lembaga tercatat pada lebih dari satu nomor SK.",
    "trace": "Setiap baris agregat dapat diulang dengan memfilter approvals.json (atau halaman Data) dengan kunci yang sama: derived.province_code, derived.regency_code, derived.jenis_ps_code, derived.scheme_code, derived.approval_year.",
}


def _block(g: pd.DataFrame) -> dict:
    area_ok = g["area_calc_status"] == "dihitung"
    mem_ok = g["members_calc_status"] == "dihitung"
    return {
        "records": int(len(g)),
        "area_ha": round(float(g.loc[area_ok, AREA_TOTAL].sum()), 2),
        "area_records_used": int(area_ok.sum()),
        "area_records_not_used": {k: int(v) for k, v in g.loc[~area_ok, "area_calc_status"].value_counts().items()},
        "members_male_plus_female": int(g.loc[mem_ok, "members_male_plus_female"].sum()),
        "members_records_used": int(mem_ok.sum()),
        "members_records_not_used": {k: int(v) for k, v in g.loc[~mem_ok, "members_calc_status"].value_counts().items()},
        "members_source_total_column": int(g[T].sum(min_count=1)) if g[T].notna().any() else None,
        "members_source_total_column_records": int(g[T].notna().sum()),
    }


def _grouped(df: pd.DataFrame, keys: list[str]) -> list[dict]:
    out = []
    for vals, g in df.groupby(keys, sort=True, dropna=False):
        vals = vals if isinstance(vals, tuple) else (vals,)
        clean = [None if pd.isna(v) else (v.item() if hasattr(v, "item") else v) for v in vals]
        out.append({**dict(zip(keys, clean)), **_block(g)})
    return out


def control_totals(df: pd.DataFrame) -> dict:
    return {
        "definitions": DEFINITIONS,
        "national": _block(df),
        "by_jenis_ps": _grouped(df, ["jenis_ps_code"]),
        "by_scheme": _grouped(df, ["scheme_code"]),
        "by_province": _grouped(df, ["province_code"]),
        "by_regency": _grouped(df, ["province_code", "regency_code"]),
        "by_province_scheme": _grouped(df, ["province_code", "scheme_code"]),
        "by_province_jenis_ps": _grouped(df, ["province_code", "jenis_ps_code"]),
        "by_regency_scheme": _grouped(df, ["province_code", "regency_code", "scheme_code"]),
        "by_regency_jenis_ps": _grouped(df, ["province_code", "regency_code", "jenis_ps_code"]),
        "by_year": _grouped(df, ["approval_year"]),
        "provinces_with_records": int(df["province_code"].nunique()),
        "regencies_with_records": int(df["regency_code"].nunique()),
    }
