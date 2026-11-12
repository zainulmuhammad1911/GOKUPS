"""Tautan dokumen SK di GoKUPS (halaman detail dan PDF SK), dicocokkan ke rekaman rilis.

Masukan: CSV tautan hasil pengambilan dari GoKUPS (lihat COLUMNS). Situs Data KUPS hanya
menautkan ke GoKUPS; dokumen SK tidak diunduh atau disimpan.

Pencocokan memakai isi rekaman (lihat match()); nomor urut hanya dipakai untuk sisa yang isinya
sedikit berubah di GoKUPS. Spasi dan huruf besar/kecil diabaikan hanya untuk mencocokkan; nilai
sumber tidak diubah. Rekaman kembar persis dipasangkan berurutan.

Keluaran: data/links/<versi>/sk_links.json dan data/links/current.json, terpisah dari rilis,
sehingga tautan bisa diperbarui tanpa membangun ulang rilis.
"""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

GOKUPS_PREFIX = "https://gokups.hutsos.kehutanan.go.id/"
COLUMNS = [
    "Nomor Surat Keputusan",
    "Tanggal Surat Keputusan",
    "Nama Lembaga",
    "Provinsi",
    "Kabupaten Kota",
    "Kecamatan",
    "Luas Area Keseluruhan (Ha)",
    "Tautan Detail GoKUPS",
    "Tautan PDF SK",
]
BULAN = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,
    "juli": 7, "agustus": 8, "september": 9, "oktober": 10, "november": 11, "desember": 12,
}


def _text(v) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip().upper()


def norm_date(v) -> str:
    """Tanggal ISO (2026-04-21) atau format GoKUPS ("Selasa, 21 April 2026") menjadi ISO."""
    s = str(v or "").strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}.*", s):
        return s[:10]
    m = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", s)
    if m and m.group(2).lower() in BULAN:
        return f"{int(m.group(3)):04d}-{BULAN[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"
    return s


def norm_area(v) -> str:
    """Luas ("732", 732.0, "732.00 Ha") menjadi teks dua desimal untuk pencocokan."""
    s = re.sub(r"[^\d.,-]", "", str(v if v is not None else ""))
    if "," in s and "." not in s:
        s = s.replace(",", ".")
    try:
        return f"{float(s):.2f}"
    except ValueError:
        return s


def record_key(sk, date, name, prov, kab, kec, area) -> tuple:
    return (_text(sk), norm_date(date), _text(name), _text(prov), _text(kab), _text(kec), norm_area(area))


def link_name(v) -> str:
    """Nama di daftar Tabular GoKUPS kadang diawali angka (lencana jumlah); angka itu diabaikan.
    Tidak ada nama lembaga di data sumber yang diawali angka."""
    return re.sub(r"^\d+", "", _text(v)).strip()


def compatible(full: str, shown: str) -> bool:
    """Teks yang dipotong GoKUPS ("... ") cocok bila menjadi awalan teks lengkap."""
    if shown.endswith("..."):
        return full.startswith(shown[:-3].rstrip())
    return full == shown


def check_url(url: str) -> str:
    if not url.startswith(GOKUPS_PREFIX) or any(c in url for c in " \"'<>"):
        raise ValueError(f"Tautan bukan alamat GoKUPS yang sah: {url!r}")
    return url


def read_links(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        missing = [c for c in COLUMNS if c not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"Kolom tidak ada di file tautan: {missing}")
        rows = []
        for row in reader:
            detail = (row["Tautan Detail GoKUPS"] or "").strip()
            pdfs = [p.strip() for p in (row["Tautan PDF SK"] or "").split("|") if p.strip()]
            no = (row.get("No") or "").strip()
            rows.append({
                "no": int(no) if no.isdigit() else None,
                "sk": _text(row["Nomor Surat Keputusan"]),
                "date": norm_date(row["Tanggal Surat Keputusan"]),
                "name": link_name(row["Nama Lembaga"]),
                "place": (_text(row["Provinsi"]), _text(row["Kabupaten Kota"]), _text(row["Kecamatan"])),
                "area": norm_area(row["Luas Area Keseluruhan (Ha)"]),
                "detail": check_url(detail) if detail else None,
                "pdf": [check_url(p) for p in pdfs],
            })
        return rows


def match(approvals: list[dict], links: list[dict]) -> tuple[dict, dict]:
    """Pasangkan tautan ke ID rekaman. Mengembalikan (tautan per ID, ringkasan).

    Tahap 1: tanggal, provinsi, kabupaten/kota, kecamatan, dan luas sama; nomor SK dan nama
    lembaga sama atau cocok sebagai awalan bila dipotong GoKUPS. Rekaman kembar dipasangkan urut.
    Tahap 2 (sisa): nomor urut sama dengan nomor rekaman, dengan nomor SK, tanggal, dan provinsi
    tetap harus cocok. Ini menangkap rekaman yang kecamatan atau luasnya berubah di GoKUPS
    setelah data sumber diambil.
    """
    records = sorted(approvals, key=lambda r: r["source"]["No"])
    info = {}
    by_place: dict[tuple, list[str]] = defaultdict(list)
    for a in records:
        s = a["source"]
        rec = {
            "no": s["No"], "sk": _text(s["Nomor Surat Keputusan"]), "date": norm_date(s["Tanggal Surat Keputusan"]),
            "name": _text(s["Nama Lembaga"]), "prov": _text(s["Provinsi"]),
        }
        info[a["id"]] = rec
        by_place[(rec["date"], rec["prov"], _text(s["Kabupaten Kota"]), _text(s["Kecamatan"]),
                  norm_area(s["Luas Area Keseluruhan (Ha)"]))].append(a["id"])
    by_no = {rec["no"]: rid for rid, rec in info.items()}
    used: set[str] = set()
    out: dict[str, dict] = {}
    pending = []
    for link in links:
        cands = by_place.get((link["date"], link["place"][0], link["place"][1], link["place"][2], link["area"]), [])
        rid = next((r for r in cands if r not in used and compatible(info[r]["sk"], link["sk"])
                    and compatible(info[r]["name"], link["name"])), None)
        if rid:
            used.add(rid)
            out[rid] = {"detail": link["detail"], "pdf": link["pdf"]}
        else:
            pending.append(link)
    by_order = 0
    unmatched = []
    for link in pending:
        rid = by_no.get(link["no"]) if link["no"] is not None else None
        rec = info.get(rid) if rid else None
        if rec and rid not in used and compatible(rec["sk"], link["sk"]) and rec["date"] == link["date"] and rec["prov"] == link["place"][0]:
            used.add(rid)
            out[rid] = {"detail": link["detail"], "pdf": link["pdf"]}
            by_order += 1
        else:
            unmatched.append([link["no"], link["sk"], link["date"], link["name"], *link["place"], link["area"]])
    summary = {
        "records": len(approvals),
        "links_in_file": len(links),
        "matched": len(out),
        "matched_by_order": by_order,
        "with_pdf": sum(1 for v in out.values() if v["pdf"]),
        "unmatched_links": len(unmatched),
        "records_without_link": len(approvals) - len(out),
        "unmatched_examples": unmatched[:10],
    }
    return out, summary


def write_links(release_dir: Path, links_csv: Path, out_dir: Path, version: str, collected_at: str) -> tuple[Path, dict]:
    approvals = json.loads((release_dir / "approvals.json").read_text(encoding="utf-8"))
    release_version = json.loads((release_dir / "release.json").read_text(encoding="utf-8"))["version"]
    links, summary = match(approvals, read_links(links_csv))
    doc = {
        "version": version,
        "release_version": release_version,
        "collected_at": collected_at,
        "built_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": GOKUPS_PREFIX,
        "summary": summary,
        "links": links,
    }
    target = out_dir / version
    target.mkdir(parents=True, exist_ok=True)
    (target / "sk_links.json").write_text(json.dumps(doc, ensure_ascii=False) + "\n", encoding="utf-8")
    (out_dir / "current.json").write_text(json.dumps({"version": version}, indent=2) + "\n", encoding="utf-8")
    return target / "sk_links.json", summary
