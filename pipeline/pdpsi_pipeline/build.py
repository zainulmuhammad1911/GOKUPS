"""Menyusun rekaman publik dari workbook sumber.

Setiap rekaman publik terdiri dari tiga bagian yang tidak dicampur:
  source  : nilai kolom sumber apa adanya, dengan nama kolom asli (kecuali kolom yang dikecualikan)
  derived : hasil pengolahan PDPSI (kode wilayah resmi, kode skema, L+P, tahun, dan seterusnya)
  quality : hasil pemeriksaan sistem (penanda, referensi duplikat, status dapat-dihitung)
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass

import pandas as pd

from . import ingest, normalize, quality, regions
from .config import Paths, load_json, load_scheme_map


@dataclass
class BuildResult:
    records: pd.DataFrame
    source: pd.DataFrame
    meta: ingest.SourceMeta
    rules: dict
    site: dict
    admin_areas: pd.DataFrame
    crosswalk: pd.DataFrame


def source_value(v: object):
    """Nilai sumber untuk JSON tanpa mengubah isinya.

    Kosong -> None. Bilangan bulat yang disimpan Excel sebagai float (317.0) ditulis 317.
    Tanggal -> ISO 8601. Teks dikembalikan persis (spasi ganda dipertahankan).
    """
    if v is None:
        return None
    if isinstance(v, pd.Timestamp):
        if pd.isna(v):
            return None
        return v.strftime("%Y-%m-%d") if v == v.normalize() else v.isoformat()
    if isinstance(v, float) and pd.isna(v):
        return None
    if hasattr(v, "item"):
        v = v.item()
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v


def stable_ids(keys: pd.Series, order: pd.Series) -> pd.Series:
    """ID 12 heksadesimal dari isi rekaman.

    Kunci yang kembar hanya terjadi pada rekaman yang isinya identik; rekaman itu
    diberi akhiran -2, -3 menurut urutan kemunculan. Urutan baris tidak memengaruhi
    ID rekaman yang isinya unik.
    """
    base = keys.map(lambda k: hashlib.sha1(k.encode("utf-8")).hexdigest()[:12])
    rank = order.groupby(base).rank(method="first").astype(int)
    return base.where(rank == 1, base + "-" + rank.astype(str))


def record_ids(df: pd.DataFrame, sk_norm: pd.Series) -> pd.Series:
    """Kunci identitas: nomor SK, kab/kota, tanggal, nama lembaga, kecamatan.

    Bila beberapa rekaman berbagi kunci identitas tetapi isinya berbeda (mis. luas
    berbeda), kunci ditambah tanda tangan seluruh isi rekaman (tanpa No), sehingga
    ID tidak bergantung pada urutan baris. Hanya rekaman yang isinya identik penuh
    yang memakai urutan kemunculan.
    """
    key = (
        sk_norm.fillna("")
        + "|" + df["regency_code"]
        + "|" + df["Tanggal Surat Keputusan"].dt.strftime("%Y-%m-%d").fillna("")
        + "|" + df["Nama Lembaga"].map(normalize.norm_key).fillna("")
        + "|" + df["Kecamatan"].map(normalize.norm_key).fillna("")
    )
    shared = key.duplicated(keep=False)
    if shared.any():
        content = [c for c in ingest.EXPECTED_COLUMNS if c != "No"]
        signature = df.loc[shared, content].map(lambda v: repr(source_value(v))).agg("\x1f".join, axis=1)
        key = key.copy()
        key[shared] = key[shared] + "|" + signature
    return stable_ids(key, df["No"])


def build(source_path, paths: Paths = Paths()) -> BuildResult:
    rules = load_json(paths.quality_rules)
    site = load_json(paths.site_config)
    scheme_map = load_scheme_map(paths.scheme_map)
    admin = regions.build_admin_areas(regions.load_kemendagri(paths.kemendagri))
    crosswalk = pd.read_csv(paths.crosswalk, dtype={"province_code": str, "regency_code": str})

    src, meta = ingest.read_source(source_path)
    df = normalize.map_schemes(src.copy(), scheme_map)
    df = regions.attach_regions(df, crosswalk, admin)
    df.index = src.index
    if len(df) != len(src):
        raise AssertionError("Jumlah baris berubah setelah penggabungan referensi")

    sk_norm = df["Nomor Surat Keputusan"].map(normalize.norm_sk)
    sk_year = df["Nomor Surat Keputusan"].map(normalize.sk_year).astype("Int64")
    df["sk_normalized"] = sk_norm
    df["id"] = record_ids(df, sk_norm)
    if df["id"].duplicated().any():
        raise AssertionError("ID rekaman tidak unik")

    compare_cols = [c for c in ingest.EXPECTED_COLUMNS if c != "No"]
    df = df.join(quality.duplicate_info(df, compare_cols, df["id"], sk_norm))
    df = df.join(quality.compute_flags(df, rules, meta.extracted_at, sk_year))
    df["approval_year"] = df["Tanggal Surat Keputusan"].dt.year.astype("Int64")
    return BuildResult(df, src, meta, rules, site, admin, crosswalk)


def public_record(r: pd.Series, version: str) -> dict:
    year = r["approval_year"]
    return {
        "id": r["id"],
        "source": {c: source_value(r[c]) for c in ingest.PUBLISHED_COLUMNS},
        "derived": {
            "sk_normalized": r["sk_normalized"],
            "approval_year": None if pd.isna(year) else int(year),
            "scheme_code": r["scheme_code"],
            "scheme_label_id": r["scheme_label_id"],
            "scheme_parent": r["scheme_parent"],
            "jenis_ps_code": r["jenis_ps_code"],
            "jenis_ps_label_id": r["jenis_ps_label_id"],
            "record_kind": r["record_kind"],
            "province_code": r["province_code"],
            "province_name_official": r["province_name"],
            "regency_code": r["regency_code"],
            "regency_name_official": r["regency_name"],
            "regency_type": r["regency_type"],
            "members_male_plus_female": source_value(r["members_male_plus_female"]),
            "members_calc_status": r["members_calc_status"],
            "area_calc_status": r["area_calc_status"],
        },
        "quality": {
            "flags": list(r["flags"]),
            "duplicate": None if r["dup_count"] < 2 else {
                "approval_number": r["Nomor Surat Keputusan"],
                "record_count": int(r["dup_count"]),
                "type": r["dup_type"],
                "related_ids": list(r["dup_related_ids"]),
            },
            "sk_spacing_variant_ids": list(r["spacing_related_ids"]),
        },
        "release_version": version,
    }
