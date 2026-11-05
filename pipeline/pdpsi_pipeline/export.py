"""Menulis folder rilis: data publik, unduhan, dan salinan internal."""
from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path

import pandas as pd

from .ingest import EXCLUSION_REASON, EXPECTED_COLUMNS, PRIVATE_COLUMNS, PUBLISHED_COLUMNS
from .quality import FLAG_DOCS

NOT_SET_ID = "Belum ditetapkan"
DERIVED = "[Olahan PDPSI]"
CHECK = "[Pemeriksaan PDPSI]"

SOURCE_COLUMN_NOTES = {
    "No": "Nomor urut baris di workbook ekstraksi. Bukan ID resmi dan tidak stabil antar-ekstraksi.",
    "Region": "Bukan field GoKUPS. Diturunkan penyusun workbook dari provinsi (kelompok pulau).",
    "Kesatuan Pengelola Hutan": "Disalin dari halaman detail SK. Ada isian 'KPHP BENGKULU UTARA' pada rekaman di luar Bengkulu; lihat penanda.",
    "Luas Area Keseluruhan (Ha)": "Dibulatkan ke hektare penuh oleh sumber.",
    "Anggota Keseluruhan": "Nilai sumber. Pada sebagian rekaman sama dengan anggota perempuan; lihat penanda. Tidak dipakai untuk perhitungan anggota.",
    "Anggota Perempuan": "Nilai sumber. Nilai 0 bisa berarti tidak dicatat.",
    "Kecamatan": "Teks sumber. Belum dicocokkan ke kode resmi.",
}

# (judul kolom, fungsi pengambil nilai, keterangan)
DERIVED_COLUMNS = [
    (f"{DERIVED} Kode Skema", lambda r: r["derived"]["scheme_code"], "Kode untuk 7 kategori skema sumber; kategori tidak digabung."),
    (f"{DERIVED} Jenis Rekaman", lambda r: r["derived"]["record_kind"], "persetujuan, atau penetapan untuk Hutan Adat."),
    (f"{DERIVED} Tahun SK", lambda r: r["derived"]["approval_year"], "Tahun dari kolom Tanggal Surat Keputusan."),
    (f"{DERIVED} Kode Provinsi", lambda r: r["derived"]["province_code"], "Kode Kepmendagri 300.2.2-2138/2025."),
    (f"{DERIVED} Provinsi (nama resmi)", lambda r: r["derived"]["province_name_official"], "Nama resmi untuk kode di atas."),
    (f"{DERIVED} Kode Kabupaten/Kota", lambda r: r["derived"]["regency_code"], "Kode Kepmendagri 300.2.2-2138/2025."),
    (f"{DERIVED} Kabupaten/Kota (nama resmi)", lambda r: r["derived"]["regency_name_official"], "Nama resmi untuk kode di atas."),
    (f"{DERIVED} Anggota Laki-Laki + Perempuan", lambda r: r["derived"]["members_male_plus_female"], "Hasil penjumlahan; kosong bila tidak dapat dihitung."),
    (f"{DERIVED} Status Perhitungan Anggota", lambda r: r["derived"]["members_calc_status"], "dihitung, nilai_negatif, atau komponen_kosong."),
    (f"{DERIVED} Status Perhitungan Luas", lambda r: r["derived"]["area_calc_status"], "dihitung, nilai_negatif, atau kosong."),
    (f"{CHECK} Jumlah Rekaman dengan Nomor SK Sama", lambda r: (r["quality"]["duplicate"] or {}).get("record_count", 1), "1 berarti nomor SK tidak dipakai rekaman lain."),
    (f"{CHECK} Tipe Duplikat", lambda r: (r["quality"]["duplicate"] or {}).get("type"), "identik atau atribut_berbeda; kosong bila bukan duplikat."),
    (f"{CHECK} ID Rekaman dengan Nomor SK Sama", lambda r: ";".join((r["quality"]["duplicate"] or {}).get("related_ids", [])), "Semua ID rekaman lain dengan nomor SK sama."),
    (f"{CHECK} ID Rekaman dengan Nomor SK Beda Penulisan", lambda r: ";".join(r["quality"]["sk_spacing_variant_ids"]), "Nomor SK hanya berbeda spasi atau huruf besar/kecil."),
    (f"{CHECK} Penanda", lambda r: ";".join(r["quality"]["flags"]), "Kode penanda, dipisah titik koma. Arti tiap kode ada di metadata."),
    (f"{DERIVED} Versi Rilis", lambda r: r["release_version"], "Versi rilis data PDPSI."),
]
ID_COLUMN = f"{DERIVED} ID Rekaman"


def records_table(records: list[dict]) -> pd.DataFrame:
    rows = []
    for r in records:
        row = {ID_COLUMN: r["id"]}
        row.update({c: r["source"][c] for c in PUBLISHED_COLUMNS})
        row.update({title: get(r) for title, get, _ in DERIVED_COLUMNS})
        rows.append(row)
    return pd.DataFrame(rows)


def dictionary_table() -> pd.DataFrame:
    rows = [(ID_COLUMN, "Olahan PDPSI", "ID internal PDPSI dari isi rekaman; tidak bergantung pada urutan baris.")]
    rows += [(c, "Sumber (apa adanya)", SOURCE_COLUMN_NOTES.get(c, "Nilai kolom sumber apa adanya.")) for c in PUBLISHED_COLUMNS]
    rows += [(t, "Olahan PDPSI" if t.startswith(DERIVED) else "Pemeriksaan PDPSI", d) for t, _, d in DERIVED_COLUMNS]
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
        ("Unit analisis", "Satu baris = satu rekaman persetujuan/penetapan Perhutanan Sosial pada tabular GoKUPS. Bukan jumlah kelompok atau lembaga."),
        ("Kesetiaan pada sumber", "Kolom sumber disajikan apa adanya dengan nama kolom asli. Kolom berawalan [Olahan PDPSI] dan [Pemeriksaan PDPSI] adalah hasil pengolahan dan pemeriksaan PDPSI, bukan bagian dari sumber."),
        ("Kolom yang tidak dipublikasikan", f"{', '.join(PRIVATE_COLUMNS)}. {EXCLUSION_REASON} Karena itu file ini bukan salinan mentah sepenuhnya."),
        ("Angka agregat", "Hasil pengolahan PDPSI dari data sumber, bukan angka resmi nasional."),
        ("Institusi pengelola", _site_value(inst.get("name_id"))),
        ("Kontak", _site_value(inst.get("contact_email"))),
        ("Lisensi data", _site_value(lic.get("name"))),
        ("Arti kode penanda", ""),
    ]
    lines += [(f"  {k}", v) for k, v in FLAG_DOCS.items()]
    return lines


def write_csv_zip(table: pd.DataFrame, meta: list[tuple[str, str]], path: Path, csv_name: str,
                  dictionary: pd.DataFrame | None) -> None:
    csv_bytes = table.to_csv(index=False).encode("utf-8-sig")
    readme = "\n".join(f"{k}: {v}" if v else k for k, v in meta)
    if dictionary is not None:
        readme += "\n\nKamus kolom:\n" + "\n".join(f"- {c} [{j}]: {d}" for c, j, d in dictionary.itertuples(index=False))
    readme += "\n\nFormat CSV: UTF-8 dengan BOM, pemisah koma, desimal titik. Pengguna Excel berlokal Indonesia sebaiknya memakai file XLSX.\n"
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
        "Rekaman yang Dipakai untuk Anggota": r["members_records_used"],
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
