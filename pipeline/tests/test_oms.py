from __future__ import annotations

import pytest

from pdpsi_pipeline import oms, regions
from pdpsi_pipeline.config import PROJECT_ROOT, Paths

SOURCE = PROJECT_ROOT / "data" / "source" / "oms" / "Database_Pendamping_OMS_verifikasi_2026-11-10.xlsx"


@pytest.fixture(scope="module")
def kemendagri():
    return regions.load_kemendagri(Paths().kemendagri)


def test_scheme_codes():
    assert oms.scheme_codes("HD; HKm; HA") == ["HD", "HKM", "HA"]
    assert oms.scheme_codes("IPHPS") == ["KK"]
    assert oms.scheme_codes("HD/Hutan kampung") == ["HD"]
    assert oms.scheme_codes("Beragam") == []


def test_province_codes(kemendagri):
    assert oms.province_codes("Kalimantan Barat; Nasional", kemendagri) == (["61"], True)
    assert oms.province_codes("Papua; Papua Barat", kemendagri) == (["91", "92"], False)
    with pytest.raises(ValueError):
        oms.province_codes("Kalbar", kemendagri)


def test_evidence_pairs_titles_with_links():
    row = {
        "Tautan Bukti 1": "https://a.example/1",
        "Tautan Bukti 2": "https://a.example/2",
        "Tautan Bukti 3": None,
        "Judul Bukti": "Judul satu (2015); Judul dua (tidak tertera); Judul tiga (2020)",
    }
    assert oms.evidence(row) == [
        {"url": "https://a.example/1", "title": "Judul satu", "year": "2015"},
        {"url": "https://a.example/2", "title": "Judul dua", "year": None},
    ]
    with pytest.raises(ValueError):
        oms.evidence({"Tautan Bukti 1": "javascript:alert(1)"})


def test_directory_from_workbook(kemendagri):
    if not SOURCE.exists():
        pytest.skip(f"Workbook verifikasi OMS tidak ada di {SOURCE} (sengaja tidak di-commit)")
    entries, counts = oms.read_directory(SOURCE, kemendagri)
    assert counts["published"] == len(entries)
    assert counts["published"] + counts["withheld"] == counts["rows"]
    assert {e["verification"]["status"] for e in entries} <= {"verified", "partial"}
    # Entri yang ditahan tidak muncul sama sekali, termasuk namanya.
    assert all(e["id"] not in (10, 12, 43, 45, 46, 51, 53, 58) for e in entries)
