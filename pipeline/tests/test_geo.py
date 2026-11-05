"""Uji file batas wilayah di public/geo (DECISIONS.md K6)."""
from __future__ import annotations

import csv
import hashlib
import json

import pytest

from pdpsi_pipeline.config import PROJECT_ROOT

GEO = PROJECT_ROOT / "public" / "geo"


@pytest.fixture(scope="module")
def geo_dir():
    current = GEO / "current.json"
    if not current.exists():
        pytest.skip("Batas wilayah belum dibangun (uv run pdpsi geo ...)")
    return GEO / json.loads(current.read_text())["version"]


def _codes(level):
    with (PROJECT_ROOT / "data" / "reference" / "kemendagri_2025_prov_kabkota.csv").open() as f:
        return {r["code"] for r in csv.DictReader(f) if r["level"] == level}


def test_all_38_provinces_and_514_regencies(geo_dir):
    prov = json.loads((geo_dir / "provinces.geojson").read_text())
    assert {f["properties"]["code"] for f in prov["features"]} == _codes("province")
    regs = set()
    for p in (geo_dir / "regencies").glob("*.geojson"):
        for f in json.loads(p.read_text())["features"]:
            assert f["properties"]["parent_code"] == p.stem == f["properties"]["code"][:2]
            regs.add(f["properties"]["code"])
    assert regs == _codes("regency")


def test_no_point_geometry_only_polygons(geo_dir):
    """Peta tidak memuat titik lokasi (keputusan C2)."""
    for p in geo_dir.rglob("*.geojson"):
        types = {f["geometry"]["type"] for f in json.loads(p.read_text())["features"]}
        assert types <= {"Polygon", "MultiPolygon"}, (p.name, types)


def test_metadata_licence_and_checksums(geo_dir):
    meta = json.loads((geo_dir / "boundary_release.json").read_text())
    assert meta["source"]["license"] == "CC BY 3.0 IGO"
    assert "BIG" not in meta["source"]["provider"]
    assert meta["counts"] == {"source_features": 519, "regencies": 514, "provinces": 38}
    for f in meta["files"]:
        assert hashlib.sha256((geo_dir / f["path"]).read_bytes()).hexdigest() == f["sha256"]


def test_file_size_targets(geo_dir):
    """Target ukuran MAP_DATA_AUDIT §5 (gzip provinsi sekitar 150 KB, kabupaten per provinsi < 150 KB)."""
    import gzip

    assert len(gzip.compress((geo_dir / "provinces.geojson").read_bytes())) < 170 * 1024
    for p in (geo_dir / "regencies").glob("*.geojson"):
        assert p.stat().st_size < 150 * 1024, p.name
