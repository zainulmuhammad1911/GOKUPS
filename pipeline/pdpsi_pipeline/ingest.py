"""Membaca workbook GoKUPS tanpa mengubahnya.

Pipeline berhenti bila struktur kolom berubah, karena semua aturan di hilir
bergantung pada nama kolom sumber.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

MAIN_SHEET = "SK Perhutanan Sosial"
NOTES_SHEET = "Catatan"

EXPECTED_COLUMNS = [
    "No",
    "Nomor Surat Keputusan",
    "Tanggal Surat Keputusan",
    "Nama Lembaga",
    "Skema",
    "Bentuk Lembaga",
    "Balai",
    "Seksi Wilayah",
    "Region",
    "Provinsi",
    "Kabupaten Kota",
    "Kecamatan",
    "Luas Area Hutan Lindung (Ha)",
    "Luas Area Hutan Produksi (Ha)",
    "Luas Area Hutan Produksi Konversi (Ha)",
    "Luas Area Hutan Produksi Terbatas (Ha)",
    "Luas Area Hutan Konservasi (Ha)",
    "Luas Area Penggunaan Lain (Ha)",
    "Luas Area Keseluruhan (Ha)",
    "Anggota Laki-Laki",
    "Anggota Perempuan",
    "Anggota Keseluruhan",
    "Ketua Lembaga",
    "Pra-Pendamping",
    "Pendamping",
    "Kesatuan Pengelola Hutan",
]

# Kolom yang dikecualikan dari publikasi (DECISIONS.md bagian 1, PRD §6.5):
# nama orang yang publikasinya menunggu penilaian kelayakan. Hanya ada di internal/.
# K11 (diubah 2026-11-06): kolom Pendamping dipublikasikan atas keputusan pemilik produk, karena
# nama pendamping juga disajikan publik di situs GoKUPS. Ketua Lembaga dan Pra-Pendamping tetap tidak.
PRIVATE_COLUMNS = ["Ketua Lembaga", "Pra-Pendamping"]
PUBLISHED_COLUMNS = [c for c in EXPECTED_COLUMNS if c not in PRIVATE_COLUMNS]
EXCLUSION_REASON = (
    "Berisi nama orang. PRD §6.5: tidak ditampilkan secara default sampai ada pemeriksaan "
    "dasar hukum, tujuan, dan risiko privasi."
)


class SourceFormatError(ValueError):
    pass


@dataclass(frozen=True)
class SourceMeta:
    file_name: str
    sha256: str
    source_description: str | None
    source_url: str | None
    extracted_at: pd.Timestamp
    records_total_reported: int | None


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _read_notes(xls: pd.ExcelFile) -> dict[str, object]:
    notes = pd.read_excel(xls, sheet_name=NOTES_SHEET, header=None)
    out: dict[str, object] = {}
    for _, row in notes.iterrows():
        key, value = row.iloc[0], row.iloc[1]
        if isinstance(key, str) and pd.notna(value):
            out.setdefault(key.strip(), value)
    return out


def read_source(path: Path) -> tuple[pd.DataFrame, SourceMeta]:
    xls = pd.ExcelFile(path)
    for sheet in (MAIN_SHEET, NOTES_SHEET):
        if sheet not in xls.sheet_names:
            raise SourceFormatError(f"Sheet '{sheet}' tidak ditemukan di {path.name}")

    df = pd.read_excel(xls, sheet_name=MAIN_SHEET, dtype={"Nomor Surat Keputusan": str})
    if list(df.columns) != EXPECTED_COLUMNS:
        missing = sorted(set(EXPECTED_COLUMNS) - set(df.columns))
        extra = sorted(set(df.columns) - set(EXPECTED_COLUMNS))
        raise SourceFormatError(f"Struktur kolom berubah. Hilang: {missing}. Baru: {extra}.")
    if df["No"].duplicated().any():
        raise SourceFormatError("Kolom No tidak unik")

    notes = _read_notes(xls)
    extracted_raw = notes.get("Waktu pengambilan daftar SK")
    if extracted_raw is None:
        raise SourceFormatError("Catatan tidak memuat 'Waktu pengambilan daftar SK'")
    source_text = notes.get("Sumber")
    url = None
    if isinstance(source_text, str):
        for token in source_text.replace("(", " ").split():
            if token.startswith("http"):
                url = token.rstrip(",")
                break
    reported = notes.get("Jumlah SK di GoKUPS (recordsTotal)")

    meta = SourceMeta(
        file_name=path.name,
        sha256=sha256_of(path),
        source_description=source_text if isinstance(source_text, str) else None,
        source_url=url,
        extracted_at=pd.Timestamp(extracted_raw).tz_convert("UTC")
        if pd.Timestamp(extracted_raw).tzinfo
        else pd.Timestamp(extracted_raw).tz_localize("UTC"),
        records_total_reported=int(reported) if reported is not None else None,
    )
    return df, meta
