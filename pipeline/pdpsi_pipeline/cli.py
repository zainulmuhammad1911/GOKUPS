"""Perintah pipeline Data KUPS.

  uv run pdpsi crosswalk --source <workbook>          buat draf crosswalk wilayah (sekali)
  uv run pdpsi build --source <workbook> --version V  buat rilis data baru
  uv run pdpsi geo --source <geojson> --version V      buat batas wilayah untuk peta
  uv run pdpsi oms --source <workbook verifikasi> --version V --directory-date D --checked-date D
                                                      buat data Direktori OMS pendamping
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from . import PIPELINE_VERSION, aggregate, export, ingest, oms, regions, rekap, report
from .build import build, public_record
from .config import Paths, load_json

PENDING = [
    "K2: statistik gender belum disepakati; rilis tidak memuat statistik gender agregat.",
    "K7: verifikasi manusia atas crosswalk kode wilayah.",
    "K9: institusi pengelola, kontak, dan lisensi publikasi data. Rilis tetap draf sampai terisi.",
]


def cmd_crosswalk(args, paths: Paths) -> int:
    if paths.crosswalk.exists() and not args.force:
        print(f"{paths.crosswalk} sudah ada dan mungkin sudah diverifikasi manusia. Pakai --force untuk menimpa.")
        return 1
    src, _ = ingest.read_source(Path(args.source))
    cw = regions.generate_crosswalk(
        src, regions.load_kemendagri(paths.kemendagri), pd.read_csv(paths.big_attributes, dtype=str).fillna("")
    )
    unmatched = cw[cw["regency_code"].isna()]
    cw.to_csv(paths.crosswalk, index=False)
    print(f"Crosswalk ditulis: {len(cw)} pasangan, {len(unmatched)} belum terpetakan.")
    return 0 if unmatched.empty else 2


def release_status(site: dict) -> str:
    inst = site.get("institution", {})
    lic = site.get("data_license", {})
    return "published" if inst.get("name_id") and lic.get("name") else "draft"


def cmd_build(args, paths: Paths) -> int:
    version = args.version
    out = Path(args.out) if args.out else paths.releases_dir / version
    if out.exists():
        if not args.force:
            print(f"Rilis {out} sudah ada. Rilis tidak ditimpa; pakai versi baru atau --force untuk pengembangan.")
            return 1
        shutil.rmtree(out)

    result = build(Path(args.source), paths)
    df = result.records.sort_values("No")
    records = [public_record(r, version) for _, r in df.iterrows()]
    totals = aggregate.control_totals(df)
    # Rilis publik final butuh K9 (institusi, lisensi). Selama belum ada, status selalu draft.
    status = release_status(result.site)
    built_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    release = {
        "version": version,
        "status": status,
        "built_at": built_at,
        "pipeline_version": PIPELINE_VERSION,
        "source": {
            "name": "GoKUPS",
            "description": result.meta.source_description,
            "url": result.meta.source_url,
            "file_name": result.meta.file_name,
            "sha256": result.meta.sha256,
            "extracted_at": result.meta.extracted_at.isoformat(),
            "records_total_reported_by_source": result.meta.records_total_reported,
        },
        "unit_of_analysis": "rekaman persetujuan/penetapan",
        "source_fidelity": {
            "published_source_columns": ingest.PUBLISHED_COLUMNS,
            "excluded_columns": ingest.PRIVATE_COLUMNS,
            "exclusion_reason": ingest.EXCLUSION_REASON if ingest.PRIVATE_COLUMNS else ingest.ALL_PUBLISHED_NOTE,
            "is_full_raw_copy": False,
        },
        "rules": result.rules,
        "reference": {
            "region_codes": "Kepmendagri No. 300.2.2-2138 Tahun 2025 (transkripsi cahyadsn/wilayah, dicek silang dengan atribut BIG 2023)",
            "crosswalk_verified_by_human": bool(result.crosswalk["verified_by_human"].astype(str).str.lower().eq("true").all()),
        },
        "counts": {"rows": len(records)},
        "control_totals_national": totals["national"],
    }

    out.mkdir(parents=True)
    export.write_json(out / "approvals.json", records, compact=True)
    export.write_json(out / "control_totals.json", totals)
    export.write_json(out / "admin_areas.json", result.admin_areas.where(result.admin_areas.notna(), None).to_dict("records"))
    schemes = pd.read_csv(paths.scheme_map, dtype=str, keep_default_na=False)
    export.write_json(out / "schemes.json", schemes.to_dict("records"))

    dl = out / "downloads"
    dl.mkdir()
    table = export.records_table(records)
    meta_full = export.metadata_lines(release, result.site, "seluruh rekaman")
    dictionary = export.dictionary_table()
    base = f"datakups_{version}"
    export.write_csv_zip(table, meta_full, dl / f"{base}_rekaman_lengkap_csv.zip", f"{base}_rekaman_lengkap.csv", dictionary)
    export.write_xlsx(table, meta_full, dl / f"{base}_rekaman_lengkap.xlsx", dictionary)
    names = dict(zip(result.admin_areas["code"], result.admin_areas["name"]))
    for level, rows, label in (("province", totals["by_province"], "provinsi"), ("regency", totals["by_regency"], "kabkota")):
        st = export.summary_table(rows, names, level)
        meta = export.metadata_lines(release, result.site, f"ringkasan per {label} (hasil pengolahan Data KUPS)")
        export.write_csv_zip(st, meta, dl / f"{base}_ringkasan_{label}_csv.zip", f"{base}_ringkasan_{label}.csv", None)
        export.write_xlsx(st, meta, dl / f"{base}_ringkasan_{label}.xlsx", None)

    # Rekap utama: provinsi × kabupaten/kota × jenis PS (DECISIONS.md K8).
    long = rekap.long_table(df, result.admin_areas)
    rekap_meta = [
        ("Sumber", "Tabular Perhutanan Sosial GoKUPS (https://gokups.hutsos.kehutanan.go.id)"),
        ("Waktu pengambilan data sumber (UTC)", release["source"]["extracted_at"]),
        ("Versi rilis Data KUPS", f"{version} ({status})"),
    ]
    rekap.write_rekap_xlsx(df, result.admin_areas, dl / f"{base}_rekap_jenis_ps.xlsx", rekap_meta, long)
    meta_rekap = export.metadata_lines(release, result.site, "rekapitulasi per provinsi, kabupaten/kota, dan jenis PS")
    meta_rekap += [("Catatan rekap", "")] + [("  -", n) for n in rekap.NOTES]
    export.write_csv_zip(long, meta_rekap, dl / f"{base}_rekap_jenis_ps_csv.zip", f"{base}_rekap_jenis_ps.csv", None)

    q = report.quality_summary(df, result.crosswalk)
    export.write_json(out / "quality_report.json", q)
    (out / "quality_report.md").write_text(report.render_markdown(release, q, totals, PENDING), encoding="utf-8")

    export.write_internal(result, out, version)
    release["files"] = export.file_manifest(out)
    export.write_json(out / "release.json", release)
    if not args.no_current:
        export.write_json(paths.releases_dir / "current.json", {"version": version, "status": status})

    nat = totals["national"]
    print(f"Rilis {version} ({status}) ditulis ke {out}")
    print(f"  rekaman {nat['records']:,} | luas {nat['area_ha']:,.0f} ha ({nat['area_records_used']:,} rekaman) "
          f"| anggota L+P {nat['members_male_plus_female']:,} ({nat['members_records_used']:,} rekaman)")
    return 0


def cmd_geo(args, paths: Paths) -> int:
    from .geo import build_geo

    out = build_geo(Path(args.source), args.version)
    meta = json.loads((out / "boundary_release.json").read_text())
    print(f"Batas wilayah {args.version} ditulis ke {out}")
    print(f"  {meta['counts']['regencies']} kabupaten/kota, {meta['counts']['provinces']} provinsi, "
          f"alias {len(meta['matching']['matched_by_alias'])}, dikecualikan {len(meta['matching']['excluded'])}")
    for f in meta["files"][:3] + meta["files"][-2:]:
        print(f"  {f['path']}: {f['bytes'] / 1024:,.0f} KB")
    return 0


def cmd_oms(args, paths: Paths) -> int:
    oms_dir = paths.root / "data" / "oms"
    if (oms_dir / args.version).exists() and not args.force:
        print(f"Versi direktori OMS {args.version} sudah ada. Pakai versi baru atau --force.")
        return 1
    directory = oms.build_directory(
        Path(args.source), regions.load_kemendagri(paths.kemendagri), args.version, args.directory_date, args.checked_date
    )
    out = oms.write_directory(directory, oms_dir)
    c = directory["counts"]
    print(f"Direktori OMS {args.version} ditulis ke {out}: {c['published']} terbit, {c['withheld']} ditahan dari {c['rows']} entri.")
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="pdpsi")
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("crosswalk")
    c.add_argument("--source", required=True)
    c.add_argument("--force", action="store_true")
    b = sub.add_parser("build")
    b.add_argument("--source", required=True)
    b.add_argument("--version", required=True)
    b.add_argument("--out")
    b.add_argument("--force", action="store_true")
    b.add_argument("--no-current", action="store_true")
    g = sub.add_parser("geo")
    g.add_argument("--source", required=True)
    g.add_argument("--version", required=True)
    o = sub.add_parser("oms")
    o.add_argument("--source", required=True)
    o.add_argument("--version", required=True)
    o.add_argument("--directory-date", required=True)
    o.add_argument("--checked-date", required=True)
    o.add_argument("--force", action="store_true")
    args = p.parse_args(argv)
    paths = Paths()
    return {"crosswalk": cmd_crosswalk, "build": cmd_build, "geo": cmd_geo, "oms": cmd_oms}[args.cmd](args, paths)


if __name__ == "__main__":
    sys.exit(main())
