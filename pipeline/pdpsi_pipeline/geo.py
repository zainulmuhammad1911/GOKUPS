"""Batas wilayah untuk peta Data KUPS (DECISIONS.md K6).

Sumber: batas kabupaten/kota BPS lewat OCHA/HDX, versi geoBoundaries gbOpen IDN ADM2
(CC BY 3.0 IGO). Geometri BIG tidak dipakai karena lisensinya belum terkonfirmasi.

Langkah:
1. Beri setiap fitur kode Kepmendagri 2025 (nama ternormalisasi + alias terdokumentasi).
2. Sederhanakan geometri dengan mapshaper (menjaga topologi antar-tetangga).
3. Bentuk 38 provinsi dengan menggabungkan kabupaten/kota menurut 2 digit awal kode.
4. Tulis file per provinsi untuk drill-down dan file ringan untuk peta mini Beranda.

Peta hanya menampilkan agregat wilayah administratif. Tidak ada koordinat kelompok.
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from .config import PROJECT_ROOT
from .regions import load_kemendagri

SOURCE = {
    "name": "Batas administrasi kabupaten/kota Indonesia (BPS, melalui OCHA ROAP/HDX), versi geoBoundaries gbOpen",
    "provider": "Badan Pusat Statistik (BPS); OCHA ROAP; World Food Programme; geoBoundaries (William & Mary geoLab)",
    "license": "CC BY 3.0 IGO",
    "license_url": "https://creativecommons.org/licenses/by/3.0/igo/",
    "url": "https://www.geoboundaries.org/ (IDN ADM2, gbOpen, commit 9469f09)",
    "hdx_url": "https://data.humdata.org/dataset/cod-ab-idn",
    "year_represented": "2020 (34 provinsi); dibentuk ulang menjadi 38 provinsi dengan kode Kepmendagri 300.2.2-2138/2025",
    "attribution_id": "Batas wilayah: BPS, OCHA ROAP, geoBoundaries (CC BY 3.0 IGO). Diolah Data KUPS; batas bersifat indikatif.",
    "attribution_en": "Boundaries: BPS, OCHA ROAP, geoBoundaries (CC BY 3.0 IGO). Processed by Data KUPS; boundaries are indicative.",
}

# Parameter penyederhanaan (persen titik yang dipertahankan, metode weighted Visvalingam).
SIMPLIFY = {"regency": "3%", "province": "1%", "province_mini": "0.12%"}
PRECISION = "0.0001"


def _norm(name: str) -> str:
    s = name.upper().replace("KABUPATEN ", "").replace("KAB. ", "").replace("KEP.", "KEPULAUAN")
    return re.sub(r"[^A-Z]", "", s)


def _mapshaper() -> str:
    exe = PROJECT_ROOT / "node_modules" / ".bin" / "mapshaper"
    if not exe.exists():
        raise RuntimeError("mapshaper belum terpasang. Jalankan `npm install` di root proyek.")
    return str(exe)


def assign_codes(features: list[dict], kemendagri, aliases: dict[str, str | None]) -> tuple[list[dict], dict]:
    regs = kemendagri[kemendagri["level"] == "regency"]
    provs = dict(zip(kemendagri.loc[kemendagri["level"] == "province", "code"], kemendagri.loc[kemendagri["level"] == "province", "name"]))
    by_key: dict[str, list[tuple[str, str]]] = {}
    for code, name in zip(regs["code"], regs["name"]):
        by_key.setdefault(_norm(name), []).append((code, name))
    names = dict(zip(regs["code"], regs["name"]))

    out, report = [], {"matched_by_name": 0, "matched_by_alias": [], "excluded": [], "unmatched": []}
    for f in features:
        shape = f["properties"]["shapeName"]
        if shape in aliases:
            code = aliases[shape]
            if not code:
                report["excluded"].append(shape)
                continue
            report["matched_by_alias"].append({"shape_name": shape, "code": code})
        else:
            hits = by_key.get(_norm(shape), [])
            if len(hits) != 1:
                report["unmatched"].append(shape)
                continue
            code = hits[0][0]
            report["matched_by_name"] += 1
        out.append({
            "type": "Feature",
            "properties": {"code": code, "name": names[code], "parent_code": code[:2], "parent_name": provs[code[:2]]},
            "geometry": f["geometry"],
        })
    codes = [f["properties"]["code"] for f in out]
    missing = sorted(set(regs["code"]) - set(codes))
    dup = sorted({c for c in codes if codes.count(c) > 1})
    if report["unmatched"] or missing or dup:
        raise ValueError(f"Batas wilayah tidak lengkap. Tidak cocok: {report['unmatched']}; kode tanpa geometri: {missing}; kode ganda: {dup}")
    return out, report


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_geo(source: Path, version: str, out_root: Path | None = None) -> Path:
    out = (out_root or PROJECT_ROOT / "public" / "geo") / version
    if out.exists():
        shutil.rmtree(out)
    (out / "regencies").mkdir(parents=True)

    aliases = {}
    with (PROJECT_ROOT / "data" / "config" / "geo_aliases.csv").open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            aliases[row["shape_name"]] = row["regency_code"] or None

    raw = json.loads(source.read_text(encoding="utf-8"))
    features, report = assign_codes(raw["features"], load_kemendagri(PROJECT_ROOT / "data" / "reference" / "kemendagri_2025_prov_kabkota.csv"), aliases)
    ms = _mapshaper()
    with tempfile.TemporaryDirectory() as tmp:
        coded = Path(tmp) / "coded.geojson"
        coded.write_text(json.dumps({"type": "FeatureCollection", "features": features}), encoding="utf-8")
        simp = Path(tmp) / "simplified.json"
        # Satu lapisan, disederhanakan sekali, sehingga batas bersama tetap berimpit.
        subprocess.run([ms, str(coded), "-simplify", SIMPLIFY["regency"], "weighted", "keep-shapes",
                        "-clean", "-o", str(simp), "format=geojson", f"precision={PRECISION}"], check=True,
                       capture_output=True)
        # Provinsi: gabungkan dulu, lalu sederhanakan lebih kuat agar file awal peta kecil.
        subprocess.run([ms, str(coded), "-dissolve", "parent_code", "copy-fields=parent_name",
                        "-rename-fields", "code=parent_code,name=parent_name",
                        "-simplify", SIMPLIFY["province"], "weighted", "keep-shapes", "-clean",
                        "-o", str(out / "provinces.geojson"), "format=geojson", f"precision={PRECISION}"], check=True,
                       capture_output=True)
        subprocess.run([ms, str(simp), "-split", "parent_code", "-o", str(out / "regencies") + "/",
                        "format=geojson", f"precision={PRECISION}"], check=True, capture_output=True)
        subprocess.run([ms, str(coded), "-dissolve", "parent_code", "copy-fields=parent_name",
                        "-rename-fields", "code=parent_code,name=parent_name",
                        "-simplify", SIMPLIFY["province_mini"], "weighted", "keep-shapes", "-clean",
                        "-filter-islands", "min-area=150km2",
                        "-o", str(out / "provinces-mini.geojson"), "format=geojson", "precision=0.01"], check=True,
                       capture_output=True)

    # mapshaper -split menamai file "simplified-<kode>.json"; seragamkan menjadi "<kode>.geojson".
    for p in (out / "regencies").iterdir():
        m = re.search(r"(\d{2})\.json$", p.name)
        if m:
            p.rename(p.with_name(f"{m.group(1)}.geojson"))

    prov = json.loads((out / "provinces.geojson").read_text())
    files = sorted(p.relative_to(out).as_posix() for p in out.rglob("*.geojson"))
    meta = {
        "version": version,
        "built_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": SOURCE,
        "source_file": source.name,
        "source_sha256": _sha(source),
        "simplify": SIMPLIFY,
        "precision": PRECISION,
        "counts": {
            "source_features": len(raw["features"]),
            "regencies": len(features),
            "provinces": len(prov["features"]),
        },
        "matching": report,
        "files": [{"path": f, "bytes": (out / f).stat().st_size, "sha256": _sha(out / f)} for f in files],
        "note": "Batas bersifat indikatif untuk visualisasi statistik, bukan rujukan batas hukum. Tidak ada koordinat lokasi kelompok.",
    }
    (out / "boundary_release.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out.parent / "current.json").write_text(json.dumps({"version": version}) + "\n", encoding="utf-8")
    return out
