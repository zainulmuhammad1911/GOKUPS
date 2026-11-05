"""Bentuk pembanding untuk pencocokan dan pencarian.

Fungsi di sini TIDAK dipakai untuk mengubah nilai yang ditampilkan. Nilai sumber
selalu dipublikasikan apa adanya (DECISIONS.md bagian 1). Hasil normalisasi hanya
disimpan sebagai kolom olahan terpisah, misalnya `sk_normalized`.
"""
from __future__ import annotations

import re
import unicodedata

import pandas as pd


def clean_text(value: object) -> str | None:
    """Bentuk pembanding: spasi dirapikan; kosong tetap None. Bukan untuk tampilan."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text or None


def norm_key(value: object) -> str | None:
    """Bentuk pembanding: huruf besar, tanpa tanda baca, spasi tunggal."""
    text = clean_text(value)
    if text is None:
        return None
    text = unicodedata.normalize("NFKD", text).upper()
    text = re.sub(r"[^A-Z0-9 ]", " ", text)
    return re.sub(r"\s+", " ", text).strip() or None


def norm_sk(value: object) -> str | None:
    text = clean_text(value)
    if text is None:
        return None
    return re.sub(r"\s+", "", text.upper())


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


SK_YEAR = re.compile(r"(?:TAHUN|THN|TH)\s*(\d{4})|/(\d{4})\s*$")


def sk_year(value: str | None) -> int | None:
    if not value:
        return None
    m = SK_YEAR.search(value.upper())
    if not m:
        return None
    return int(m.group(1) or m.group(2))


def map_schemes(df: pd.DataFrame, scheme_map: pd.DataFrame) -> pd.DataFrame:
    known = set(scheme_map["scheme_original"])
    unknown = sorted(set(df["Skema"].dropna()) - known)
    if unknown or df["Skema"].isna().any():
        raise ValueError(f"Skema tanpa pemetaan di scheme_map.csv: {unknown or ['<kosong>']}")
    cols = ["scheme_original", "scheme_code", "scheme_label_id", "scheme_label_en", "scheme_parent", "record_kind",
            "jenis_ps_code", "jenis_ps_label_id"]
    return df.merge(scheme_map[cols], left_on="Skema", right_on="scheme_original", how="left", validate="m:1")
