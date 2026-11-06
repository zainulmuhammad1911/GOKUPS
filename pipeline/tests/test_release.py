"""Uji rilis lengkap yang dibangun ulang dari workbook sumber.

Angka acuan berasal dari audit independen (scripts/audit/audit_dataset.py,
docs/DATA_AUDIT.md), bukan dari kode pipeline.
"""
from __future__ import annotations

import hashlib
import io
import json
import zipfile
from collections import defaultdict

import pandas as pd
import pytest

from pdpsi_pipeline.build import record_ids
from pdpsi_pipeline.ingest import PRIVATE_COLUMNS, PUBLISHED_COLUMNS, sha256_of
from pdpsi_pipeline.normalize import norm_sk

from .conftest import CURRENT_RELEASE, SOURCE

AUDIT = {
    "rows": 10061,
    "area_total_source": 6892023,
    "male_plus_female": 1288942,
    "source_total_column": 1227046,
    "dup_groups": 136,
    "dup_records": 282,
    "dup_identical_records": 24,
    "members_total_mismatch": 1127,
    "members_negative": 1,
    "members_both_zero": 208,
    "area_zero": 64,
    "area_mismatch_gt5": 19,
    "date_after_extraction": 1,
    "district_null": 3278,
    "scheme_counts": {
        "HUTAN KEMASYARAKATAN": 3907, "HUTAN TANAMAN RAKYAT": 2736, "HUTAN DESA": 2464,
        "KEMITRAAN KEHUTANAN ~ KULIN KK": 641, "HUTAN ADAT": 173,
        "KEMITRAAN KEHUTANAN ~ KONSERVASI": 134, "KEMITRAAN KEHUTANAN ~ IPHPS": 6,
    },
}


def count_flag(approvals, flag):
    return sum(flag in a["quality"]["flags"] for a in approvals)


# --- Source fidelity ----------------------------------------------------------------

def test_every_source_row_kept(approvals, release_meta):
    assert len(approvals) == AUDIT["rows"]
    assert release_meta["source"]["records_total_reported_by_source"] == AUDIT["rows"]
    assert sorted(a["source"]["No"] for a in approvals) == list(range(1, AUDIT["rows"] + 1))


def test_published_values_equal_source_exactly(approvals, source_rows):
    """Semua kolom sumber yang dipublikasikan sama persis dengan workbook (termasuk spasi, ejaan, nol, kosong)."""
    raw = {r["id"]: r["raw_payload"] for r in source_rows}
    for a in approvals:
        assert set(a["source"]) == set(PUBLISHED_COLUMNS)
        for col in PUBLISHED_COLUMNS:
            assert a["source"][col] == raw[a["id"]][col], (a["id"], col)


def test_names_not_masked_or_altered(approvals, source_rows):
    raw = {r["id"]: r["raw_payload"]["Nama Lembaga"] for r in source_rows}
    assert all(a["source"]["Nama Lembaga"] == raw[a["id"]] for a in approvals)
    assert any(isinstance(n, str) and "  " in n for n in raw.values())  # spasi ganda sumber ikut dipertahankan


def test_empty_and_zero_are_distinct(approvals):
    assert sum(a["source"]["Kecamatan"] is None for a in approvals) == AUDIT["district_null"]
    assert sum(a["source"]["Luas Area Keseluruhan (Ha)"] == 0 for a in approvals) == AUDIT["area_zero"]


def test_source_file_unchanged(release_meta):
    assert sha256_of(SOURCE) == release_meta["source"]["sha256"]
    assert release_meta["source_fidelity"]["is_full_raw_copy"] is False
    assert release_meta["source_fidelity"]["excluded_columns"] == PRIVATE_COLUMNS


# --- Kategori skema tidak digabung --------------------------------------------------

def test_seven_scheme_categories_kept_separate(approvals, totals):
    counts = defaultdict(int)
    for a in approvals:
        counts[a["source"]["Skema"]] += 1
    assert dict(counts) == AUDIT["scheme_counts"]
    by_code = {r["scheme_code"]: r["records"] for r in totals["by_scheme"]}
    assert len(by_code) == 7
    assert "KK" not in by_code
    ha = [a for a in approvals if a["source"]["Skema"] == "HUTAN ADAT"]
    assert all(a["derived"]["record_kind"] == "penetapan" for a in ha)


# --- K1 anggota ----------------------------------------------------------------------

def test_members_rule(approvals, totals):
    zero_used = 0
    for a in approvals:
        m, f = a["source"]["Anggota Laki-Laki"], a["source"]["Anggota Perempuan"]
        d = a["derived"]
        if m is None or f is None:
            assert d["members_calc_status"] == "komponen_kosong" and d["members_male_plus_female"] is None
        elif m < 0 or f < 0:
            assert d["members_calc_status"] == "nilai_negatif" and d["members_male_plus_female"] is None
        else:
            assert d["members_calc_status"] == "dihitung" and d["members_male_plus_female"] == m + f
            zero_used += (m + f == 0)
    assert zero_used == AUDIT["members_both_zero"]  # 0 tetap dihitung
    nat = totals["national"]
    assert nat["members_records_used"] == AUDIT["rows"] - AUDIT["members_negative"]
    assert nat["members_records_not_used"] == {"nilai_negatif": AUDIT["members_negative"]}
    negatives = sum(a["source"]["Anggota Laki-Laki"] + a["source"]["Anggota Perempuan"]
                    for a in approvals if a["derived"]["members_calc_status"] == "nilai_negatif")
    assert nat["members_male_plus_female"] == AUDIT["male_plus_female"] - negatives
    assert nat["members_source_total_column"] == AUDIT["source_total_column"]  # kolom sumber tetap tersedia
    assert count_flag(approvals, "members_total_column_mismatch") == AUDIT["members_total_mismatch"]
    assert count_flag(approvals, "members_total_equals_female") == AUDIT["members_total_mismatch"]


def test_members_by_sex_same_records_as_total(approvals, totals):
    """Laki-laki dan perempuan dijumlahkan dari rekaman yang sama dengan anggota L+P (K2, 2026-11-06)."""
    used = [a for a in approvals if a["derived"]["members_calc_status"] == "dihitung"]
    nat = totals["national"]
    assert nat["members_male"] == sum(a["source"]["Anggota Laki-Laki"] for a in used)
    assert nat["members_female"] == sum(a["source"]["Anggota Perempuan"] for a in used)
    assert nat["members_female_zero_records"] == sum(a["source"]["Anggota Perempuan"] == 0 for a in used)
    for key, rows in totals.items():
        if key == "definitions":
            continue
        for row in rows if isinstance(rows, list) else [rows] if isinstance(rows, dict) else []:
            assert row["members_male"] + row["members_female"] == row["members_male_plus_female"], key
            assert row["members_female_zero_records"] <= row["members_records_used"], key
    assert "members_female_zero_records" in totals["definitions"]


# --- K5 luas -------------------------------------------------------------------------

def test_area_flags_do_not_exclude(approvals, totals):
    nat = totals["national"]
    assert nat["area_ha"] == AUDIT["area_total_source"]
    assert nat["area_records_used"] == AUDIT["rows"]
    assert count_flag(approvals, "area_component_mismatch") == AUDIT["area_mismatch_gt5"]
    assert count_flag(approvals, "area_zero") == AUDIT["area_zero"]


# --- K4 duplikat ---------------------------------------------------------------------

def test_duplicate_references_complete_and_symmetric(approvals):
    by_id = {a["id"]: a for a in approvals}
    groups = defaultdict(list)
    for a in approvals:
        groups[a["source"]["Nomor Surat Keputusan"]].append(a["id"])
    dup_groups = {k: v for k, v in groups.items() if len(v) > 1}
    assert len(dup_groups) == AUDIT["dup_groups"]
    assert sum(len(v) for v in dup_groups.values()) == AUDIT["dup_records"]
    for sk, ids in groups.items():
        for i in ids:
            d = by_id[i]["quality"]["duplicate"]
            if len(ids) == 1:
                assert d is None and "duplicate_sk" not in by_id[i]["quality"]["flags"]
                continue
            assert d["approval_number"] == sk
            assert d["record_count"] == len(ids)
            assert sorted(d["related_ids"]) == sorted(x for x in ids if x != i)  # semua referensi, termasuk >= 3
            assert all(r in by_id for r in d["related_ids"])  # tautan menuju rekaman yang ada
            assert "duplicate_sk" in by_id[i]["quality"]["flags"]


def test_duplicate_types(approvals):
    ident = [a for a in approvals if (a["quality"]["duplicate"] or {}).get("type") == "identik"]
    assert len(ident) == AUDIT["dup_identical_records"]
    for a in ident:
        mine = {k: v for k, v in a["source"].items() if k != "No"}
        twins = [b for b in approvals if b["id"] in a["quality"]["duplicate"]["related_ids"]
                 and {k: v for k, v in b["source"].items() if k != "No"} == mine]
        assert twins


def test_ids_stable_and_independent_of_row_order(build_result, approvals):
    df = build_result.records
    ids = [a["id"] for a in approvals]
    assert len(set(ids)) == len(ids)
    shuffled = df.sample(frac=1, random_state=7)
    shuffled = shuffled.assign(No=range(1, len(shuffled) + 1))  # urutan baris Excel berbeda
    new_ids = record_ids(shuffled, shuffled["Nomor Surat Keputusan"].map(norm_sk))
    new_ids = new_ids.reindex(df.index)
    unique_content = df["dup_type"] != "identik"
    mismatch = df.loc[unique_content & (new_ids != df["id"]), "id"]
    assert mismatch.empty, f"ID bergantung pada urutan baris: {list(mismatch)[:5]}"
    # Rekaman identik penuh tidak bisa dibedakan dari isinya; himpunan ID-nya tetap sama.
    assert set(new_ids[~unique_content]) == set(df.loc[~unique_content, "id"])
    current = CURRENT_RELEASE / "approvals.json"
    if current.exists():
        old = {a["source"]["No"]: a["id"] for a in json.loads(current.read_text())}
        assert all(old[a["source"]["No"]] == a["id"] for a in approvals), "ID berubah antar-build"


# --- Wilayah -------------------------------------------------------------------------

def test_every_record_has_official_codes(approvals, release_dir):
    admin = {a["code"]: a for a in json.loads((release_dir / "admin_areas.json").read_text())}
    assert sum(1 for a in admin.values() if a["level"] == "province") == 38
    assert sum(1 for a in admin.values() if a["level"] == "regency") == 514
    for a in approvals:
        d = a["derived"]
        assert d["regency_code"].startswith(d["province_code"] + ".")
        assert admin[d["regency_code"]]["name"] == d["regency_name_official"]


# --- Agregat dapat ditelusuri --------------------------------------------------------

def _recompute(approvals, key):
    acc = defaultdict(lambda: {"records": 0, "area_ha": 0.0, "members": 0})
    for a in approvals:
        k = key(a)
        acc[k]["records"] += 1
        if a["derived"]["area_calc_status"] == "dihitung":
            acc[k]["area_ha"] += a["source"]["Luas Area Keseluruhan (Ha)"]
        if a["derived"]["members_calc_status"] == "dihitung":
            acc[k]["members"] += a["derived"]["members_male_plus_female"]
    return acc


@pytest.mark.parametrize("block,key,fields", [
    ("by_province", lambda a: a["derived"]["province_code"], ["province_code"]),
    ("by_regency", lambda a: a["derived"]["regency_code"], ["regency_code"]),
    ("by_scheme", lambda a: a["derived"]["scheme_code"], ["scheme_code"]),
    ("by_year", lambda a: a["derived"]["approval_year"], ["approval_year"]),
    ("by_province_scheme", lambda a: (a["derived"]["province_code"], a["derived"]["scheme_code"]),
     ["province_code", "scheme_code"]),
])
def test_aggregates_traceable_to_records(approvals, totals, block, key, fields):
    expected = _recompute(approvals, key)
    got = {tuple(r[f] for f in fields) if len(fields) > 1 else r[fields[0]]: r for r in totals[block]}
    assert set(got) == set(expected)
    for k, e in expected.items():
        assert got[k]["records"] == e["records"]
        assert got[k]["members_male_plus_female"] == e["members"]
        assert got[k]["area_ha"] == pytest.approx(e["area_ha"], abs=0.01)


def test_aggregates_labeled_as_processed(totals):
    assert "Hasil pengolahan PDPSI" in totals["definitions"]["label"]
    assert "Bukan angka resmi nasional" in totals["definitions"]["label"]


# --- Kolom yang dikecualikan ---------------------------------------------------------

def _public_strings(release_dir) -> set[str]:
    values: set[str] = set()

    def walk(o):
        if isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
        elif isinstance(o, str):
            values.add(o.strip().upper())

    for p in release_dir.glob("*.json"):
        walk(json.loads(p.read_text(encoding="utf-8")))
    for z in (release_dir / "downloads").glob("*.zip"):
        with zipfile.ZipFile(z) as zf:
            for name in zf.namelist():
                if name.endswith(".csv"):
                    df = pd.read_csv(io.BytesIO(zf.read(name)), dtype=str, encoding="utf-8-sig")
                    for col in df.columns:
                        values.update(df[col].dropna().str.strip().str.upper())
    return values


def test_excluded_columns_not_published(release_dir, approvals, source_rows):
    """Isi kolom Ketua Lembaga/Pra-Pendamping tidak muncul di keluaran publik,
    kecuali nilai yang sama memang ada di kolom sumber yang dipublikasikan
    (beberapa sel Ketua berisi nomor SK, nama provinsi, atau nama lembaganya sendiri)."""
    assert not set(PRIVATE_COLUMNS) & set(approvals[0]["source"])
    legit = set()
    for row in source_rows:
        for col in PUBLISHED_COLUMNS:
            v = row["raw_payload"][col]
            if isinstance(v, str):
                legit.add(v.strip().upper())
    private = set()
    for row in source_rows:
        for col in PRIVATE_COLUMNS:
            v = row["raw_payload"][col]
            if isinstance(v, str):
                private.update(p.strip().upper() for p in v.split(";") if len(p.strip()) >= 4)
    assert len(private) > 1000
    leaked = (private & _public_strings(release_dir)) - legit
    assert not leaked, sorted(leaked)[:5]


def test_pendamping_status_only(approvals, source_rows, totals):
    """K11: kolom Pendamping dipublikasikan apa adanya, ditambah status tercatat/kosong untuk filter."""
    by_id = {a["id"]: a for a in approvals}
    for row in source_rows:
        v = row["raw_payload"]["Pendamping"]
        assert by_id[row["id"]]["source"]["Pendamping"] == v
        expected = "tercatat" if isinstance(v, str) and v.strip() else "kosong"
        assert by_id[row["id"]]["derived"]["pendamping_status"] == expected
    assert {a["derived"]["pendamping_status"] for a in approvals} == {"tercatat", "kosong"}
    assert totals["national"]["pendamping_recorded_records"] == sum(
        a["derived"]["pendamping_status"] == "tercatat" for a in approvals
    )


def test_internal_folder_not_in_manifest(release_meta):
    assert all(not f["path"].startswith("internal") for f in release_meta["files"])


# --- Unduhan -------------------------------------------------------------------------

def test_downloads(release_dir, release_meta):
    dl = release_dir / "downloads"
    with zipfile.ZipFile(next(dl.glob("*_rekaman_lengkap_csv.zip"))) as zf:
        csv_name = next(n for n in zf.namelist() if n.endswith(".csv"))
        raw = zf.read(csv_name)
        readme = zf.read("BACA_SAYA.txt").decode()
    assert raw.startswith(b"\xef\xbb\xbf")
    df = pd.read_csv(io.BytesIO(raw), encoding="utf-8-sig", dtype=str, keep_default_na=False)
    assert len(df) == AUDIT["rows"]
    assert all(c in df.columns for c in PUBLISHED_COLUMNS)  # nama kolom sumber asli
    assert release_meta["version"] in readme
    assert "bukan salinan mentah sepenuhnya" in readme
    assert "Belum ditetapkan" in readme
    sheets = pd.read_excel(next(dl.glob("*_rekaman_lengkap.xlsx")), sheet_name=None)
    assert {"Data", "Metadata", "Kamus Kolom"} <= set(sheets)
    assert len(sheets["Data"]) == AUDIT["rows"]
    assert release_meta["status"] == "draft"


def test_manifest_hashes(release_dir, release_meta):
    for f in release_meta["files"]:
        assert hashlib.sha256((release_dir / f["path"]).read_bytes()).hexdigest() == f["sha256"]


def test_no_formula_like_source_text(approvals):
    """Ekspor CSV di aplikasi web menetralkan teks berawalan = + - @ agar tidak dieksekusi spreadsheet.
    Uji ini memastikan rilis saat ini tidak punya nilai seperti itu, jadi penetralan tidak mengubah data apa pun.
    Bila uji ini gagal di rilis baru, catatan penetralan wajib disebut di metadata unduhan."""
    bad = [(a["id"], k) for a in approvals for k, v in a["source"].items()
           if isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r")]
    assert not bad, bad[:5]
