from __future__ import annotations

import csv
import json

import pytest

from pdpsi_pipeline import sk_links
from pdpsi_pipeline.config import PROJECT_ROOT

RELEASE = PROJECT_ROOT / "data" / "releases" / json.loads((PROJECT_ROOT / "data" / "releases" / "current.json").read_text())["version"]
DETAIL_1 = "https://gokups.hutsos.kehutanan.go.id/public/society/detail/a1grOFp5bVAzb0NmNGFDbURZTFllQT09"
PDF_1 = "https://gokups.hutsos.kehutanan.go.id/storage/surat-keputusan/8b136cae74240dc302eef88915b30492.pdf"
DETAIL_2 = "https://gokups.hutsos.kehutanan.go.id/public/society/detail/TENpbDBqbXAwbVEwU3piVUxyNm9Odz09"


def test_norm_date_and_area():
    assert sk_links.norm_date("Selasa, 21 April 2026") == "2026-04-21"
    assert sk_links.norm_date("2029-10-06") == "2029-10-06"
    assert sk_links.norm_area("732.00 Ha") == sk_links.norm_area(732) == "732.00"


def test_rejects_non_gokups_url():
    with pytest.raises(ValueError):
        sk_links.check_url("https://contoh.test/sk.pdf")
    with pytest.raises(ValueError):
        sk_links.check_url('https://gokups.hutsos.kehutanan.go.id/x"onmouseover=1')


def test_matches_by_content_not_order(tmp_path):
    src = tmp_path / "tautan.csv"
    with src.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(sk_links.COLUMNS)
        # Urutan sengaja dibalik dan format mengikuti tampilan GoKUPS.
        w.writerow(["SK.1689/MENLHK-PSKL/PKPS/PSL.0/3/2021", "Selasa, 21 April 2026", " KTH DAMAR KUBANG", "LAMPUNG", "PESAWARAN", "WAY KHILAU", "30.00 Ha", DETAIL_2, ""])
        w.writerow(["SK.10687/MENLHK-PSKL/PKPS/PSL.0/12/2023", "Sabtu, 06 Oktober 2029", "LD HUKUANAKOTA", "MALUKU", "SERAM BAGIAN BARAT", "INAMOSOL", "732.00 Ha", DETAIL_1, PDF_1])
        w.writerow(["SK.TIDAK.ADA", "2020-01-01", "X", "ACEH", "ACEH BESAR", "", "1", "", ""])
    out, summary = sk_links.write_links(RELEASE, src, tmp_path / "links", "uji", "2026-11-12")
    doc = json.loads(out.read_text())
    approvals = {a["source"]["No"]: a["id"] for a in json.loads((RELEASE / "approvals.json").read_text())}
    assert doc["links"][approvals[1]] == {"detail": DETAIL_1, "pdf": [PDF_1]}
    assert doc["links"][approvals[2]] == {"detail": DETAIL_2, "pdf": []}
    assert summary["matched"] == 2 and summary["unmatched_links"] == 1 and summary["with_pdf"] == 1
