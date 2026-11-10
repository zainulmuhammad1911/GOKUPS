"""Direktori OMS pendamping Perhutanan Sosial (sumber kedua, terpisah dari data SK GoKUPS).

Masukan: workbook verifikasi (sheet "Database OMS (verifikasi)"), yaitu direktori OMS asli
ditambah kolom hasil pemeriksaan daring. Keluaran publik hanya memuat entri berstatus
"Terverifikasi" atau "Sebagian". Entri "Tidak ditemukan" ditahan dan namanya tidak ikut ditulis.

Kolom internal direktori (Tingkat Bukti, Asal Informasi, Catatan / Perlu Verifikasi, Sumber
tanpa tautan, Rekomendasi) tidak diterbitkan. Teks isian ditulis apa adanya; koreksi hasil
pemeriksaan hanya muncul di catatan verifikasi.
"""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import openpyxl
import pandas as pd

SHEET = "Database OMS (verifikasi)"
PUBLISHED_STATUS = {"Terverifikasi": "verified", "Sebagian": "partial"}
WITHHELD_STATUS = {"Tidak ditemukan", "Bertentangan"}
ROLE_COLUMNS = {
    "access": "Pra-izin / Akses",
    "post_approval": "Pasca-persetujuan",
    "adat": "Hutan Adat",
    "support": "Pendukung Teknis/Kebijakan",
}
# Kode jenis PS portal. IPHPS adalah bagian Kemitraan Kehutanan (KK).
SCHEME_PATTERNS = [
    ("HD", r"\bHD\b|HUTAN DESA"),
    ("HKM", r"\bHKM\b|HUTAN KEMASYARAKATAN"),
    ("HTR", r"\bHTR\b|HUTAN TANAMAN RAKYAT"),
    ("HA", r"\bHA\b|HUTAN ADAT"),
    ("KK", r"KEMITRAAN|KULIN|IPHPS"),
]
HTTP_URL = re.compile(r"^https?://[^\s]+$")


def _text(v) -> str | None:
    """Isian kosong atau "-" berarti tidak diisi."""
    if v is None:
        return None
    s = str(v).strip()
    return None if s in ("", "-") else s


def scheme_codes(text: str | None) -> list[str]:
    up = (text or "").upper()
    return [code for code, pat in SCHEME_PATTERNS if re.search(pat, up)]


def province_codes(text: str | None, kemendagri: pd.DataFrame) -> tuple[list[str], bool]:
    """Nama provinsi baku (dipisah "; ") ke kode Kemendagri. "Nasional" ditandai terpisah."""
    by_name = {r.name: r.code for r in kemendagri[kemendagri["level"] == "province"].itertuples()}
    codes, national = [], False
    for part in (text or "").split(";"):
        name = part.strip()
        if not name:
            continue
        if name == "Nasional":
            national = True
        elif name in by_name:
            codes.append(by_name[name])
        else:
            raise ValueError(f"Provinsi tidak dikenal di direktori OMS: {name!r}")
    return sorted(set(codes)), national


def evidence(row: dict) -> list[dict]:
    titles = (row.get("Judul Bukti") or "").split("; ") if row.get("Judul Bukti") else []
    out = []
    for i in range(3):
        url = _text(row.get(f"Tautan Bukti {i + 1}"))
        if not url:
            continue
        if not HTTP_URL.match(url):
            raise ValueError(f"Tautan bukti bukan URL http(s): {url!r}")
        title, year = (titles[i] if i < len(titles) else url), None
        m = re.match(r"^(.*) \(([^()]*)\)$", title)
        if m:
            title, year = m.group(1), m.group(2)
        out.append({"url": url, "title": title, "year": year if year and year not in ("-", "tidak tertera") else None})
    return out


def read_directory(source: Path, kemendagri: pd.DataFrame) -> tuple[list[dict], dict]:
    wb = openpyxl.load_workbook(source, read_only=True, data_only=True)
    rows = list(wb[SHEET].iter_rows(values_only=True))
    header = list(rows[0])
    entries, withheld, statuses = [], 0, {}
    for raw in rows[1:]:
        if not raw or raw[0] in (None, ""):
            continue
        row = dict(zip(header, raw))
        status = row["Status Verifikasi"]
        statuses[status] = statuses.get(status, 0) + 1
        if status in WITHHELD_STATUS:
            withheld += 1
            continue
        if status not in PUBLISHED_STATUS:
            raise ValueError(f"Entri {row['ID']} belum diperiksa daring (status {status!r}); periksa dulu sebelum terbit.")
        provinces, national = province_codes(row["Provinsi (nama baku)"], kemendagri)
        website = _text(row["Situs Resmi"])
        if website and not HTTP_URL.match(website):
            raise ValueError(f"Situs resmi bukan URL http(s): {website!r}")
        entries.append(
            {
                "id": int(row["ID"]),
                "name": _text(row["Nama Organisasi"]),
                "short_name": _text(row["Singkatan"]),
                "org_type": _text(row["Jenis Organisasi"]),
                "province_codes": provinces,
                "national": national,
                "province_text": _text(row["Provinsi"]),
                "locations": _text(row["Contoh Lokasi Dampingan"]),
                "scheme_text": _text(row["Skema PS"]),
                "scheme_codes": scheme_codes(row["Skema PS"]),
                "roles": [k for k, col in ROLE_COLUMNS.items() if _text(row[col]) == "Ya"],
                "activity": _text(row["Contoh Pendampingan & Bukti"]),
                "partners": _text(row["Mitra / Konsorsium"]),
                "period": _text(row["Periode Bukti"]),
                "verification": {
                    "status": PUBLISHED_STATUS[status],
                    "website": website,
                    "evidence": evidence(row),
                    "note": _text(row["Catatan Verifikasi"]),
                },
            }
        )
    entries.sort(key=lambda e: e["name"].casefold())
    return entries, {"rows": sum(statuses.values()), "published": len(entries), "withheld": withheld, "by_status": statuses}


def build_directory(source: Path, kemendagri: pd.DataFrame, version: str, directory_date: str, checked_date: str) -> dict:
    entries, counts = read_directory(source, kemendagri)
    return {
        "version": version,
        "built_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": {
            "name": "Direktori OMS Pendamping Perhutanan Sosial",
            "file_name": source.name,
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "directory_date": directory_date,
            "checked_date": checked_date,
        },
        "counts": counts,
        "entries": entries,
    }


def write_directory(directory: dict, oms_dir: Path) -> Path:
    out = oms_dir / directory["version"]
    out.mkdir(parents=True, exist_ok=True)
    (out / "directory.json").write_text(json.dumps(directory, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (oms_dir / "current.json").write_text(json.dumps({"version": directory["version"]}, indent=2) + "\n", encoding="utf-8")
    return out / "directory.json"
