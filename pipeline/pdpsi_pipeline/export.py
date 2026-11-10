"""Menulis folder rilis: data publik, unduhan, dan salinan internal."""
from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path

import pandas as pd

from .config import PROJECT_ROOT
from .ingest import ALL_PUBLISHED_NOTE, EXCLUSION_REASON, EXPECTED_COLUMNS, PRIVATE_COLUMNS, PUBLISHED_COLUMNS
from .quality import FLAG_DOCS

NOT_SET_ID = "Belum ditetapkan"
DERIVED = "[Olahan Data KUPS]"
CHECK = "[Pemeriksaan Data KUPS]"

# Definisi kolom unduhan dibaca dari config bersama (juga dipakai aplikasi web untuk unduhan sesuai filter).
SCHEMA: dict = json.loads((PROJECT_ROOT / "data" / "config" / "export_schema.json").read_text(encoding="utf-8"))
ID_COLUMN: str = SCHEMA["id_column"]["title"]
SOURCE_COLUMN_NOTES: dict[str, str] = SCHEMA["source_column_notes"]


def get_path(record: dict, path: str, transform: str | None = None):
    """Ambil nilai dari rekaman publik menurut jalur 'a.b.c'. Transformasi sama dengan aplikasi web."""
    cur = record
    for part in path.split("."):
        cur = cur.get(part) if isinstance(cur, dict) else None
    if transform == "join":
        return ";".join(cur or [])
    if transform == "default_1":
        return 1 if cur is None else cur
    return cur


def records_table(records: list[dict]) -> pd.DataFrame:
    rows = []
    for r in records:
        row = {ID_COLUMN: r["id"]}
        row.update({c: r["source"][c] for c in PUBLISHED_COLUMNS})
        row.update({c["title"]: get_path(r, c["path"], c["transform"]) for c in SCHEMA["derived_columns"]})
        rows.append(row)
    return pd.DataFrame(rows)


def dictionary_table() -> pd.DataFrame:
    rows = [(ID_COLUMN, SCHEMA["id_column"]["kind"], SCHEMA["id_column"]["description"])]
    rows += [(c, "Sumber (apa adanya)", SOURCE_COLUMN_NOTES.get(c, SCHEMA["default_source_note"])) for c in PUBLISHED_COLUMNS]
    rows += [(c["title"], c["kind"], c["description"]) for c in SCHEMA["derived_columns"]]
    rows += [(c, "Tidak dipublikasikan", EXCLUSION_REASON) for c in PRIVATE_COLUMNS]
    return pd.DataFrame(rows, columns=["Kolom", "Jenis", "Keterangan"])


def _site_value(value) -> str:
    return value if value else NOT_SET_ID


def metadata_lines(release: dict, site: dict, title: str) -> list[tuple[str, str]]:
    inst = site.get("institution", {})
    lic = site.get("data_license", {})
    src = release["source"]
    lines = [
        ("Dataset", f"{site['product']['name_id']} ({site['product']['short_name']}): {title}"),
        ("Versi rilis", release["version"]),
        ("Status rilis", f"{release['status']} (bukan rilis publik final)" if release["status"] == "draft" else release["status"]),
        ("Sumber data", src.get("description") or NOT_SET_ID),
        ("Waktu pengambilan data sumber (UTC)", src["extracted_at"]),
        ("Waktu pembuatan rilis (UTC)", release["built_at"]),
        ("Unit analisis", SCHEMA["texts"]["unit"]),
        ("Kesetiaan pada sumber", SCHEMA["texts"]["fidelity"]),
        ("Kolom yang tidak dipublikasikan",
         f"{', '.join(PRIVATE_COLUMNS)}. {EXCLUSION_REASON} Karena itu file ini bukan salinan mentah sepenuhnya."
         if PRIVATE_COLUMNS else ALL_PUBLISHED_NOTE),
        ("Angka agregat", SCHEMA["texts"]["aggregates"]),
        ("Institusi pengelola", _site_value(inst.get("name_id"))),
        ("Kontak", _site_value(inst.get("contact_email"))),
        ("Lisensi data", _site_value(lic.get("name"))),
        ("Arti kode penanda", ""),
    ]
    lines += [(f"  {k}", v) for k, v in FLAG_DOCS.items()]
    return lines


FORMULA_START = ("=", "+", "-", "@", "\t", "\r")


def neutralize_formulas(table: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Sel teks berawalan = + - @ diberi awalan ' di CSV agar tidak dijalankan sebagai rumus oleh
    aplikasi spreadsheet (sama dengan unduhan web). Nilai asli tetap utuh di XLSX dan approvals.json."""
    count = 0

    def fix(v):
        nonlocal count
        if isinstance(v, str) and v.startswith(FORMULA_START):
            count += 1
            return "'" + v
        return v

    return table.apply(lambda col: col.map(fix) if col.dtype == object else col), count


def write_csv_zip(table: pd.DataFrame, meta: list[tuple[str, str]], path: Path, csv_name: str,
                  dictionary: pd.DataFrame | None) -> None:
    table, neutralized = neutralize_formulas(table)
    csv_bytes = table.to_csv(index=False).encode("utf-8-sig")
    if neutralized:
        meta = [*meta, ("Penetralan rumus (CSV)",
                        f"{neutralized} sel teks diawali = + - @ diberi awalan ' agar tidak dijalankan sebagai rumus "
                        "oleh aplikasi spreadsheet. Nilai aslinya ada di file XLSX.")]
    readme = "\n".join(f"{k}: {v}" if v else k for k, v in meta)
    if dictionary is not None:
        readme += "\n\nKamus kolom:\n" + "\n".join(f"- {c} [{j}]: {d}" for c, j, d in dictionary.itertuples(index=False))
    readme += "\n\n" + SCHEMA["texts"]["csv_format"] + "\n"
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr(csv_name, csv_bytes)
        z.writestr("BACA_SAYA.txt", readme.encode("utf-8"))


def write_xlsx(table: pd.DataFrame, meta: list[tuple[str, str]], path: Path, dictionary: pd.DataFrame | None) -> None:
    with pd.ExcelWriter(path, engine="openpyxl") as xw:
        table.to_excel(xw, sheet_name="Data", index=False)
        pd.DataFrame(meta, columns=["Keterangan", "Nilai"]).to_excel(xw, sheet_name="Metadata", index=False)
        if dictionary is not None:
            dictionary.to_excel(xw, sheet_name="Kamus Kolom", index=False)
        for ws in xw.book.worksheets:
            ws.freeze_panes = "A2"
            for col in ws.columns:
                width = max(len(str(c.value)) if c.value is not None else 0 for c in col[:200])
                ws.column_dimensions[col[0].column_letter].width = min(max(10, width + 2), 60)


def _reasons(d: dict) -> str:
    return "; ".join(f"{k}: {v}" for k, v in sorted(d.items())) or "-"


def summary_table(rows: list[dict], names: dict[str, str], level: str) -> pd.DataFrame:
    code_key = "province_code" if level == "province" else "regency_code"
    return pd.DataFrame([{
        "Kode": r[code_key],
        "Wilayah (nama resmi)": names.get(r[code_key]),
        "Jumlah Rekaman": r["records"],
        f"{DERIVED} Luas (ha)": r["area_ha"],
        "Rekaman yang Dipakai untuk Luas": r["area_records_used"],
        "Rekaman Tidak Dipakai untuk Luas (alasan: jumlah)": _reasons(r["area_records_not_used"]),
        f"{DERIVED} Anggota Laki-Laki + Perempuan": r["members_male_plus_female"],
        f"{DERIVED} Anggota Laki-Laki": r["members_male"],
        f"{DERIVED} Anggota Perempuan": r["members_female"],
        "Rekaman yang Dipakai untuk Anggota": r["members_records_used"],
        "Rekaman dengan Anggota Perempuan = 0": r["members_female_zero_records"],
        "Rekaman dengan Pendamping Tercatat": r["pendamping_recorded_records"],
        "Rekaman Tidak Dipakai untuk Anggota (alasan: jumlah)": _reasons(r["members_records_not_used"]),
        "Jumlah Kolom Sumber 'Anggota Keseluruhan' (pembanding)": r["members_source_total_column"],
    } for r in rows])


def write_json(path: Path, data, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    kwargs = {"separators": (",", ":")} if compact else {"indent": 2}
    path.write_text(json.dumps(data, ensure_ascii=False, **kwargs) + "\n", encoding="utf-8")


def write_internal(result, out_dir: Path, version: str) -> None:
    """Salinan baris sumber lengkap, termasuk kolom yang tidak dipublikasikan. Tidak dipublikasikan."""
    from .build import source_value

    internal = out_dir / "internal"
    internal.mkdir(parents=True, exist_ok=True)
    with (internal / "source_records.jsonl").open("w", encoding="utf-8") as f:
        for (_, row), rid in zip(result.source.iterrows(), result.records["id"]):
            payload = {c: source_value(row[c]) for c in EXPECTED_COLUMNS}
            f.write(json.dumps({
                "id": rid, "source_name": "GoKUPS", "source_file": result.meta.file_name,
                "extracted_at": result.meta.extracted_at.isoformat(), "dataset_version": version,
                "raw_payload": payload,
            }, ensure_ascii=False) + "\n")


def file_manifest(out_dir: Path) -> list[dict]:
    files = []
    for p in sorted(out_dir.rglob("*")):
        if p.is_file() and "internal" not in p.relative_to(out_dir).parts and p.name != "release.json":
            files.append({"path": str(p.relative_to(out_dir)), "bytes": p.stat().st_size,
                          "sha256": hashlib.sha256(p.read_bytes()).hexdigest()})
    return files
