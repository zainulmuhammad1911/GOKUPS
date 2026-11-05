"""Kode wilayah resmi (Kepmendagri 300.2.2-2138/2025) dan crosswalk nama sumber ke kode.

Crosswalk dibuat sekali dengan `pdpsi crosswalk`, lalu dipelihara manusia
(kolom verified_by_human). Saat build, pipeline hanya membaca crosswalk dan
berhenti bila ada wilayah sumber yang belum terpetakan.
"""
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

from .normalize import slugify

# Alias yang tidak tertangkap normalisasi nama. Wajib diverifikasi manusia.
MANUAL_ALIASES = {("SULAWESI SELATAN", "PANGKAJENE KEPULAUAN"): "73.10"}
# Nama sumber yang memakai kata KOTA tetapi merupakan kabupaten.
NOT_A_CITY = {("KALIMANTAN SELATAN", "KOTA BARU")}


def _norm(name: str) -> str:
    s = name.upper().replace("KEP.", "KEPULAUAN").replace("DAERAH ISTIMEWA", "DI")
    return re.sub(r"[^A-Z]", "", s)


def load_kemendagri(path: Path) -> pd.DataFrame:
    ref = pd.read_csv(path, dtype=str, keep_default_na=False)
    if (ref["level"] == "province").sum() != 38 or (ref["level"] == "regency").sum() != 514:
        raise ValueError("Referensi Kemendagri harus berisi 38 provinsi dan 514 kabupaten/kota")
    return ref


def build_admin_areas(kemendagri: pd.DataFrame) -> pd.DataFrame:
    """Tabel administrative_areas (PRD §8) tanpa geometri."""
    rows = []
    for r in kemendagri.itertuples(index=False):
        if r.level == "province":
            kind, short = "provinsi", r.name
        elif r.name.startswith("Kota "):
            kind, short = "kota", r.name
        else:
            kind, short = "kabupaten", r.name.removeprefix("Kabupaten ")
        rows.append(
            {
                "code": r.code,
                "level": r.level,
                "type": kind,
                "name": r.name,
                "short_name": short,
                "parent_code": r.parent_code or None,
                "slug": slugify(short if r.level == "province" else r.name),
            }
        )
    return pd.DataFrame(rows)


def generate_crosswalk(source: pd.DataFrame, kemendagri: pd.DataFrame, big: pd.DataFrame) -> pd.DataFrame:
    provs = kemendagri[kemendagri["level"] == "province"]
    regs = kemendagri[kemendagri["level"] == "regency"]
    prov_by_key = {_norm(n): c for c, n in zip(provs["code"], provs["name"])}

    def reg_key(name: str) -> str:
        if name.startswith("Kota "):
            return "KOTA" + _norm(name[5:])
        return _norm(name.removeprefix("Kabupaten "))

    reg_by_key = {(c[:2], reg_key(n)): c for c, n in zip(regs["code"], regs["name"])}
    reg_name = dict(zip(regs["code"], regs["name"]))
    prov_name = dict(zip(provs["code"], provs["name"]))

    big = big[big["kdpkab"].astype(str).str.match(r"^\d\d\.\d\d$")].drop_duplicates("kdpkab")
    big_name = dict(zip(big["kdpkab"], big["wadmkk"]))

    pairs = source.groupby(["Provinsi", "Kabupaten Kota"]).size().reset_index(name="source_rows")
    out = []
    for p, k, n in pairs.itertuples(index=False):
        pcode = prov_by_key.get(_norm(p))
        method, rcode = "", None
        if (p, k) in MANUAL_ALIASES:
            rcode, method = MANUAL_ALIASES[(p, k)], "alias_manual"
        elif pcode:
            is_city = k.startswith("KOTA ") and (p, k) not in NOT_A_CITY
            key = "KOTA" + _norm(k[5:]) if is_city else _norm(k)
            rcode = reg_by_key.get((pcode, key))
            method = "nama_ternormalisasi" if rcode else ""
        if rcode and pcode is None:
            pcode = rcode[:2]
        big_status = "kode_tidak_ada"
        if rcode in big_name:
            same = reg_key(reg_name[rcode]) == reg_key(big_name[rcode])
            big_status = "nama_sama" if same else "kode_sama_nama_beda"
        out.append(
            {
                "source_province": p,
                "source_regency": k,
                "source_rows": n,
                "province_code": pcode,
                "regency_code": rcode,
                "official_province_name": prov_name.get(pcode),
                "official_regency_name": reg_name.get(rcode),
                "match_method": method,
                "crosscheck_big_2023": big_status,
                "verified_by_human": False,
                "verified_by": None,
                "verified_at": None,
            }
        )
    return pd.DataFrame(out)


def attach_regions(df: pd.DataFrame, crosswalk: pd.DataFrame, admin: pd.DataFrame) -> pd.DataFrame:
    cw = crosswalk[["source_province", "source_regency", "province_code", "regency_code"]]
    merged = df.merge(
        cw,
        left_on=["Provinsi", "Kabupaten Kota"],
        right_on=["source_province", "source_regency"],
        how="left",
        validate="m:1",
    )
    missing = merged[merged["regency_code"].isna()][["Provinsi", "Kabupaten Kota"]].drop_duplicates()
    if len(missing):
        raise ValueError(f"Wilayah belum ada di crosswalk: {missing.values.tolist()}")
    known = set(admin["code"])
    bad = sorted(set(merged["regency_code"]) - known)
    if bad:
        raise ValueError(f"Kode kabupaten/kota di crosswalk tidak ada di referensi resmi: {bad}")
    names = admin.set_index("code")
    merged["province_name"] = merged["province_code"].map(names["name"])
    merged["regency_name"] = merged["regency_code"].map(names["name"])
    merged["regency_type"] = merged["regency_code"].map(names["type"])
    if (merged["regency_code"].str[:2] != merged["province_code"]).any():
        raise ValueError("Kode kabupaten/kota tidak berada di provinsi yang tercatat")
    return merged.drop(columns=["source_province", "source_regency"])
