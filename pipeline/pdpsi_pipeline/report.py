"""Laporan pemeriksaan rilis untuk ditinjau pengelola sebelum publikasi."""
from __future__ import annotations

from collections import Counter

import pandas as pd

from .ingest import ALL_PUBLISHED_NOTE, PRIVATE_COLUMNS
from .quality import FLAG_DOCS


def quality_summary(records: pd.DataFrame, crosswalk: pd.DataFrame) -> dict:
    flag_counts = Counter(f for flags in records["flags"] for f in flags)
    dup = records[records["dup_count"] > 1]
    groups = dup.groupby("Nomor Surat Keputusan")
    return {
        "rows": int(len(records)),
        "flag_counts": {k: int(flag_counts.get(k, 0)) for k in FLAG_DOCS},
        "duplicates": {
            "sk_groups": int(groups.ngroups),
            "records_in_groups": int(len(dup)),
            "group_size_distribution": {str(k): int(v) for k, v in groups.size().value_counts().sort_index().items()},
            "records_by_type": {k: int(v) for k, v in dup["dup_type"].value_counts().items()},
        },
        "members_calc_status": {k: int(v) for k, v in records["members_calc_status"].value_counts().items()},
        "area_calc_status": {k: int(v) for k, v in records["area_calc_status"].value_counts().items()},
        "excluded_columns": PRIVATE_COLUMNS,
        "crosswalk": {
            "pairs": int(len(crosswalk)),
            "by_method": {k: int(v) for k, v in crosswalk["match_method"].value_counts().items()},
            "big_2023_crosscheck": {k: int(v) for k, v in crosswalk["crosscheck_big_2023"].value_counts().items()},
            "verified_by_human": int(crosswalk["verified_by_human"].astype(str).str.lower().eq("true").sum()),
        },
    }


def _fmt(n) -> str:
    if n is None:
        return "tidak tersedia"
    if isinstance(n, float) and not n.is_integer():
        return f"{n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{int(n):,}".replace(",", ".")


def _reasons(d: dict) -> str:
    return ", ".join(f"{k} {_fmt(v)}" for k, v in sorted(d.items())) or "tidak ada"


def render_markdown(release: dict, q: dict, totals: dict, pending: list[str]) -> str:
    nat = totals["national"]
    d = q["duplicates"]
    lines = [
        f"# Laporan Pemeriksaan Rilis {release['version']}",
        "",
        f"- Status: **{release['status']}** (bukan rilis publik final)",
        f"- Sumber: `{release['source']['file_name']}` (SHA-256 `{release['source']['sha256'][:16]}…`)",
        f"- Pengambilan data sumber: {release['source']['extracted_at']}",
        f"- Dibuat: {release['built_at']} dengan pipeline {release['pipeline_version']}",
        "",
        "## Angka nasional (hasil pengolahan Data KUPS dari data sumber)",
        "",
        "| Indikator | Nilai | Rekaman dipakai | Rekaman tidak dipakai (alasan) |",
        "|-----------|------:|----------------:|--------------------------------|",
        f"| Rekaman persetujuan/penetapan | {_fmt(nat['records'])} | {_fmt(nat['records'])} | tidak ada |",
        f"| Luas (ha), dari kolom Luas Area Keseluruhan | {_fmt(nat['area_ha'])} | {_fmt(nat['area_records_used'])} | {_reasons(nat['area_records_not_used'])} |",
        f"| Anggota laki-laki + perempuan | {_fmt(nat['members_male_plus_female'])} | {_fmt(nat['members_records_used'])} | {_reasons(nat['members_records_not_used'])} |",
        f"| … laki-laki | {_fmt(nat['members_male'])} | {_fmt(nat['members_records_used'])} | sama dengan baris di atas |",
        f"| … perempuan | {_fmt(nat['members_female'])} | {_fmt(nat['members_records_used'])} | sama; {_fmt(nat['members_female_zero_records'])} rekaman bernilai 0 di sumber |",
        f"| Pembanding: jumlah kolom sumber Anggota Keseluruhan | {_fmt(nat['members_source_total_column'])} | {_fmt(nat['members_source_total_column_records'])} | – |",
        "",
        f"Provinsi dengan rekaman: {totals['provinces_with_records']} dari 38. "
        f"Kabupaten/kota dengan rekaman: {totals['regencies_with_records']} dari 514.",
        "",
        "## Penanda pemeriksaan",
        "",
        "Penanda tidak mengubah nilai sumber dan tidak mengeluarkan rekaman dari perhitungan.",
        "",
        "| Kode | Rekaman | Arti |",
        "|------|--------:|------|",
    ]
    lines += [f"| `{k}` | {_fmt(q['flag_counts'][k])} | {v} |" for k, v in FLAG_DOCS.items()]
    lines += [
        "",
        "## Rekaman dengan nomor SK sama",
        "",
        f"{_fmt(d['sk_groups'])} nomor SK dipakai lebih dari satu rekaman ({_fmt(d['records_in_groups'])} rekaman). "
        "Ukuran kelompok: " + ", ".join(f"{k} rekaman × {v}" for k, v in d["group_size_distribution"].items()) + ". "
        "Tipe per rekaman: " + ", ".join(f"{k} {_fmt(v)}" for k, v in d["records_by_type"].items()) + ". "
        "Semua rekaman tetap dihitung.",
        "",
        "## Kolom yang tidak dipublikasikan",
        "",
        (f"{', '.join(q['excluded_columns'])}: berisi nama orang (PRD §6.5). Data publik karena itu bukan salinan mentah sepenuhnya. "
         "Salinan lengkap ada di `internal/` (tidak dipublikasikan).")
        if q["excluded_columns"] else ALL_PUBLISHED_NOTE,
        "",
        "## Kode wilayah",
        "",
        f"Pasangan provinsi + kabupaten/kota: {q['crosswalk']['pairs']}. Metode: "
        + ", ".join(f"{k} {v}" for k, v in q["crosswalk"]["by_method"].items())
        + ". Cek silang BIG 2023: "
        + ", ".join(f"{k} {v}" for k, v in q["crosswalk"]["big_2023_crosscheck"].items())
        + f". Diverifikasi manusia: {q['crosswalk']['verified_by_human']}.",
        "",
        "## Keputusan yang masih menunggu",
        "",
    ]
    lines += [f"- {p}" for p in pending]
    return "\n".join(lines) + "\n"
