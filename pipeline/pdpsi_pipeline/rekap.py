"""Rekapitulasi penerima persetujuan/penetapan PS per provinsi, kabupaten/kota, dan jenis PS.

Instruksi rekap: provinsi, kabupaten/kota, jenis PS (Hutan Desa, Hutan Kemasyarakatan,
Hutan Tanaman Rakyat, Hutan Adat, Kemitraan Kehutanan). Kemitraan Kehutanan = tiga subskema
sumber berlabel "KEMITRAAN KEHUTANAN ~", rinciannya selalu ikut (DECISIONS.md K8).

Semua angka adalah hasil pengolahan dari approvals (rekaman sumber), dengan aturan yang sama
dengan control_totals.json. Unit: rekaman SK, bukan jumlah kelompok.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from .quality import AREA_TOTAL

JENIS = [("HD", "Hutan Desa"), ("HKM", "Hutan Kemasyarakatan"), ("HTR", "Hutan Tanaman Rakyat"),
         ("HA", "Hutan Adat"), ("KK", "Kemitraan Kehutanan")]
KK_SUB = [("KK_KULIN", "KK ~ Kulin KK"), ("KK_KONSERVASI", "KK ~ Konservasi"), ("KK_IPHPS", "KK ~ IPHPS")]
# Urutan kolom rekap: 5 jenis PS, rincian Kemitraan Kehutanan, lalu total.
COLUMN_GROUPS = [(c, n, "jenis_ps_code") for c, n in JENIS] + [(c, n, "scheme_code") for c, n in KK_SUB]

NOTES = [
    "Hasil pengolahan PDPSI dari data sumber GoKUPS. Bukan angka resmi nasional.",
    "Unit: rekaman SK penerima persetujuan/penetapan Perhutanan Sosial (satu baris di tabular GoKUPS), bukan jumlah kelompok. "
    "Sebagian rekaman Hutan Tanaman Rakyat adalah izin perorangan, dan sebagian lembaga tercatat pada lebih dari satu nomor SK.",
    "Kemitraan Kehutanan = jumlah tiga subskema yang di sumber berlabel 'KEMITRAAN KEHUTANAN ~' (Kulin KK, Konservasi, IPHPS). "
    "Rinciannya ditampilkan di kolom tersendiri.",
    "Hutan Adat adalah penetapan, bukan persetujuan.",
    "Luas = jumlah kolom sumber 'Luas Area Keseluruhan (Ha)', tanpa koreksi. Rekaman dengan catatan selisih luas tetap dihitung.",
    "Anggota (lembar Data Panjang) = laki-laki + perempuan pada rekaman yang kedua nilainya tersedia dan tidak negatif, termasuk 0.",
    "Rekaman bernomor SK sama tidak dihapus dan tetap dihitung.",
]

BOLD = Font(bold=True)
HEAD_FILL = PatternFill("solid", fgColor="F1EEE6")
SUB_FILL = PatternFill("solid", fgColor="F7F5EF")
THIN = Side(style="thin", color="DAD5CA")
INT = "#,##0"
AREA = "#,##0.00"


def _stats(g: pd.DataFrame) -> dict:
    area_ok = g["area_calc_status"] == "dihitung"
    mem_ok = g["members_calc_status"] == "dihitung"
    return {
        "rekaman": int(len(g)),
        "luas_ha": round(float(g.loc[area_ok, AREA_TOTAL].sum()), 2),
        "anggota_laki_plus_perempuan": int(g.loc[mem_ok, "members_male_plus_female"].sum()),
        "rekaman_dihitung_anggota": int(mem_ok.sum()),
    }


def long_table(df: pd.DataFrame, admin: pd.DataFrame) -> pd.DataFrame:
    """Format panjang untuk penelitian: satu baris per wilayah × jenis PS (dan subskema KK)."""
    names = dict(zip(admin["code"], admin["name"]))
    rows = []

    def emit(level, pcode, rcode, part):
        base = {"tingkat": level, "kode_provinsi": pcode, "provinsi": names.get(pcode),
                "kode_kabupaten_kota": rcode, "kabupaten_kota": names.get(rcode)}
        for code, label, field in COLUMN_GROUPS:
            g = part[part[field] == code]
            rows.append({**base, "jenis_ps": label if field == "jenis_ps_code" else "Kemitraan Kehutanan",
                         "subskema": None if field == "jenis_ps_code" else label, **_stats(g)})
        rows.append({**base, "jenis_ps": "Total", "subskema": None, **_stats(part)})

    emit("nasional", None, None, df)
    for pcode, p in df.groupby("province_code", sort=True):
        emit("provinsi", pcode, None, p)
    for (pcode, rcode), r in df.groupby(["province_code", "regency_code"], sort=True):
        emit("kabupaten_kota", pcode, rcode, r)
    return pd.DataFrame(rows)


def _header(ws, row: int, first_cols: list[str]) -> int:
    """Dua baris header: kelompok jenis PS, lalu Rekaman / Luas (ha)."""
    col = 1
    for name in first_cols:
        ws.cell(row, col, name)
        ws.merge_cells(start_row=row, start_column=col, end_row=row + 1, end_column=col)
        col += 1
    for _, label, _ in COLUMN_GROUPS + [("TOTAL", "Total", None)]:
        ws.cell(row, col, label)
        ws.merge_cells(start_row=row, start_column=col, end_row=row, end_column=col + 1)
        ws.cell(row + 1, col, "Rekaman")
        ws.cell(row + 1, col + 1, "Luas (ha)")
        col += 2
    for r in (row, row + 1):
        for c in range(1, col):
            cell = ws.cell(r, c)
            cell.font = BOLD
            cell.fill = HEAD_FILL
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = Border(bottom=THIN, top=THIN, left=THIN, right=THIN)
    return col - 1


def _values(part: pd.DataFrame) -> list:
    out = []
    for code, _, field in COLUMN_GROUPS:
        s = _stats(part[part[field] == code])
        out += [s["rekaman"], s["luas_ha"]]
    s = _stats(part)
    return out + [s["rekaman"], s["luas_ha"]]


def _write_row(ws, row: int, lead: list, values: list, bold=False, fill=None, indent=0):
    for i, v in enumerate(lead + values, start=1):
        cell = ws.cell(row, i, v)
        if i > len(lead):
            cell.number_format = INT if (i - len(lead)) % 2 == 1 else AREA
        if bold:
            cell.font = BOLD
        if fill:
            cell.fill = fill
    if indent:
        ws.cell(row, len(lead)).alignment = Alignment(indent=indent)


def _title(ws, title: str, meta: list[tuple[str, str]]) -> int:
    ws.cell(1, 1, title).font = Font(bold=True, size=14)
    r = 2
    for k, v in meta:
        ws.cell(r, 1, f"{k}: {v}")
        r += 1
    ws.cell(r, 1, NOTES[0]).font = Font(italic=True)
    return r + 2


def write_rekap_xlsx(df: pd.DataFrame, admin: pd.DataFrame, path: Path, meta: list[tuple[str, str]],
                     long: pd.DataFrame) -> None:
    names = dict(zip(admin["code"], admin["name"]))
    provinces = admin[admin["level"] == "province"].sort_values("code")
    wb = Workbook()

    # 1. Rekap nasional per jenis PS
    ws = wb.active
    ws.title = "Rekap Nasional"
    r = _title(ws, "Rekapitulasi penerima persetujuan/penetapan Perhutanan Sosial per jenis PS", meta)
    for c, h in enumerate(["Jenis PS", "Jenis rekaman", "Rekaman", "Luas (ha)", "Anggota laki-laki + perempuan"], 1):
        cell = ws.cell(r, c, h)
        cell.font, cell.fill = BOLD, HEAD_FILL
    r += 1
    for code, label in JENIS:
        g = df[df["jenis_ps_code"] == code]
        s = _stats(g)
        kind = "penetapan" if code == "HA" else "persetujuan"
        _write_row(ws, r, [label, kind], [s["rekaman"], s["luas_ha"], s["anggota_laki_plus_perempuan"]])
        for i, fmt in ((3, INT), (4, AREA), (5, INT)):
            ws.cell(r, i).number_format = fmt
        r += 1
        if code == "KK":
            for scode, slabel in KK_SUB:
                s = _stats(df[df["scheme_code"] == scode])
                _write_row(ws, r, [f"   rincian: {slabel}", kind], [s["rekaman"], s["luas_ha"], s["anggota_laki_plus_perempuan"]],
                           fill=SUB_FILL)
                for i, fmt in ((3, INT), (4, AREA), (5, INT)):
                    ws.cell(r, i).number_format = fmt
                r += 1
    s = _stats(df)
    _write_row(ws, r, ["Total", ""], [s["rekaman"], s["luas_ha"], s["anggota_laki_plus_perempuan"]], bold=True)
    for i, fmt in ((3, INT), (4, AREA), (5, INT)):
        ws.cell(r, i).number_format = fmt
    for col, w in zip("ABCDE", (40, 16, 12, 16, 30)):
        ws.column_dimensions[col].width = w

    # 2. Rekap per provinsi × jenis PS (semua 38 provinsi, termasuk yang tanpa rekaman)
    ws = wb.create_sheet("Rekap Provinsi")
    r = _title(ws, "Rekapitulasi per provinsi dan jenis PS", meta)
    last = _header(ws, r, ["Kode", "Provinsi"])
    ws.freeze_panes = ws.cell(r + 2, 3)
    r += 2
    for p in provinces.itertuples():
        _write_row(ws, r, [p.code, p.name], _values(df[df["province_code"] == p.code]))
        r += 1
    _write_row(ws, r, ["", "Total"], _values(df), bold=True, fill=HEAD_FILL)
    ws.column_dimensions["A"].width, ws.column_dimensions["B"].width = 8, 34
    for c in range(3, last + 1):
        ws.column_dimensions[get_column_letter(c)].width = 11 if (c - 3) % 2 == 0 else 15

    # 3. Rekap per kabupaten/kota × jenis PS, subtotal per provinsi
    ws = wb.create_sheet("Rekap Kabupaten-Kota")
    r = _title(ws, "Rekapitulasi per kabupaten/kota dan jenis PS (kabupaten/kota yang memiliki rekaman)", meta)
    last = _header(ws, r, ["Kode", "Provinsi / Kabupaten/Kota"])
    ws.freeze_panes = ws.cell(r + 2, 3)
    r += 2
    for pcode, p in df.groupby("province_code", sort=True):
        _write_row(ws, r, [pcode, names[pcode]], _values(p), bold=True, fill=SUB_FILL)
        r += 1
        for rcode, g in p.groupby("regency_code", sort=True):
            _write_row(ws, r, [rcode, names[rcode]], _values(g), indent=2)
            r += 1
    _write_row(ws, r, ["", "Total"], _values(df), bold=True, fill=HEAD_FILL)
    ws.column_dimensions["A"].width, ws.column_dimensions["B"].width = 9, 40
    for c in range(3, last + 1):
        ws.column_dimensions[get_column_letter(c)].width = 11 if (c - 3) % 2 == 0 else 15

    # 4. Data panjang untuk penelitian (pivot/filter)
    ws = wb.create_sheet("Data Panjang")
    ws.append(list(long.columns))
    for row in long.itertuples(index=False):
        ws.append([None if (isinstance(v, float) and pd.isna(v)) else v for v in row])
    for c in ws[1]:
        c.font, c.fill = BOLD, HEAD_FILL
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    for i, w in enumerate((16, 13, 30, 19, 36, 22, 18, 10, 14, 26, 24), 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # 5. Catatan
    ws = wb.create_sheet("Catatan")
    ws.column_dimensions["A"].width = 34
    ws.column_dimensions["B"].width = 110
    ws.append(["Catatan", ""])
    ws["A1"].font = BOLD
    for n in NOTES:
        ws.append(["", n])
    ws.append(["", ""])
    for k, v in meta:
        ws.append([k, v])
    for row in ws.iter_rows():
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    wb.save(path)
