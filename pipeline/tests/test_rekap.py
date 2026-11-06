"""Uji rekap provinsi × kabupaten/kota × jenis PS (DECISIONS.md K8).

Setiap angka rekap dihitung ulang dari approvals.json (rekaman sumber), jadi rekap
bisa ditelusuri ke rekaman pembentuknya.
"""
from __future__ import annotations

import io
import zipfile
from collections import defaultdict

import pandas as pd
import pytest
from openpyxl import load_workbook

JENIS = ["Hutan Desa", "Hutan Kemasyarakatan", "Hutan Tanaman Rakyat", "Hutan Adat", "Kemitraan Kehutanan"]
KK_SUB = {"KK_KULIN": "KK ~ Kulin KK", "KK_KONSERVASI": "KK ~ Konservasi", "KK_IPHPS": "KK ~ IPHPS"}
JENIS_LABEL = {"HD": "Hutan Desa", "HKM": "Hutan Kemasyarakatan", "HTR": "Hutan Tanaman Rakyat",
               "HA": "Hutan Adat", "KK": "Kemitraan Kehutanan"}


@pytest.fixture(scope="module")
def long(release_dir) -> pd.DataFrame:
    z = next((release_dir / "downloads").glob("*_rekap_jenis_ps_csv.zip"))
    with zipfile.ZipFile(z) as zf:
        name = next(n for n in zf.namelist() if n.endswith(".csv"))
        assert "BACA_SAYA.txt" in zf.namelist()
        return pd.read_csv(io.BytesIO(zf.read(name)), encoding="utf-8-sig", dtype={"kode_provinsi": str, "kode_kabupaten_kota": str})


@pytest.fixture(scope="module")
def workbook(release_dir):
    return load_workbook(next((release_dir / "downloads").glob("*_rekap_jenis_ps.xlsx")), data_only=True)


def _expected(approvals):
    """Hitung ulang dari rekaman: (tingkat, kode) -> label kolom -> [rekaman, luas]."""
    acc = defaultdict(lambda: defaultdict(lambda: [0, 0.0]))
    for a in approvals:
        d = a["derived"]
        area = a["source"]["Luas Area Keseluruhan (Ha)"] if d["area_calc_status"] == "dihitung" else 0
        labels = [JENIS_LABEL[d["jenis_ps_code"]], "Total"] + ([KK_SUB[d["scheme_code"]]] if d["scheme_code"] in KK_SUB else [])
        for key in (("nasional", None), ("provinsi", d["province_code"]), ("kabupaten_kota", d["regency_code"])):
            for lab in labels:
                acc[key][lab][0] += 1
                acc[key][lab][1] += area
    return acc


def test_long_table_traceable_to_records(long, approvals):
    expected = _expected(approvals)
    for row in long.itertuples():
        code = None if row.tingkat == "nasional" else (row.kode_provinsi if row.tingkat == "provinsi" else row.kode_kabupaten_kota)
        label = row.subskema if isinstance(row.subskema, str) else row.jenis_ps
        rec, area = expected[(row.tingkat, code)][label]
        assert row.rekaman == rec, (row.tingkat, code, label)
        assert row.luas_ha == pytest.approx(area, abs=0.01)


def test_kk_equals_sum_of_subtypes_and_total_equals_five_types(long):
    for _, g in long.groupby(["tingkat", "kode_provinsi", "kode_kabupaten_kota"], dropna=False):
        main = g[g["subskema"].isna()].set_index("jenis_ps")
        subs = g[g["subskema"].notna()]
        assert main.loc["Kemitraan Kehutanan", "rekaman"] == subs["rekaman"].sum()
        assert main.loc["Kemitraan Kehutanan", "luas_ha"] == pytest.approx(subs["luas_ha"].sum(), abs=0.01)
        assert main.loc["Total", "rekaman"] == main.loc[JENIS, "rekaman"].sum()
        assert main.loc["Total", "luas_ha"] == pytest.approx(main.loc[JENIS, "luas_ha"].sum(), abs=0.01)


def test_national_matches_control_totals(long, totals):
    nat = long[(long["tingkat"] == "nasional") & long["subskema"].isna()].set_index("jenis_ps")
    assert nat.loc["Total", "rekaman"] == totals["national"]["records"]
    assert nat.loc["Total", "luas_ha"] == pytest.approx(totals["national"]["area_ha"])
    by = {r["jenis_ps_code"]: r for r in totals["by_jenis_ps"]}
    for code, label in JENIS_LABEL.items():
        assert nat.loc[label, "rekaman"] == by[code]["records"]


def test_coverage(long):
    assert long.loc[long["tingkat"] == "provinsi", "kode_provinsi"].nunique() == 37
    assert long.loc[long["tingkat"] == "kabupaten_kota", "kode_kabupaten_kota"].nunique() == 407


# Kolom: Kode, nama, 8 kelompok × (rekaman, luas), Total (rekaman, luas), lalu 4 kolom anggota.
TOTAL_RECORDS = 2 + 8 * 2


def test_workbook_sheets_and_totals(workbook, totals):
    assert workbook.sheetnames == ["Rekap Nasional", "Rekap Provinsi", "Rekap Kabupaten-Kota", "Data Panjang", "Catatan"]
    ws = workbook["Rekap Provinsi"]
    rows = [r for r in ws.iter_rows(values_only=True) if r[0] and str(r[0]).isdigit() and len(str(r[0])) == 2]
    assert len(rows) == 38  # semua provinsi, termasuk yang tanpa rekaman (nilai 0)
    total_row = next(r for r in ws.iter_rows(values_only=True) if r[1] == "Total")
    assert total_row[TOTAL_RECORDS] == totals["national"]["records"]
    assert sum(r[TOTAL_RECORDS] for r in rows) == totals["national"]["records"]
    assert total_row[TOTAL_RECORDS + 2] == totals["national"]["members_male_plus_female"]
    kk = total_row[2 + 4 * 2]
    assert kk == sum(total_row[2 + i * 2] for i in (5, 6, 7))
    notes = " ".join(str(c.value) for row in workbook["Catatan"].iter_rows() for c in row if c.value)
    assert "Bukan angka resmi nasional" in notes and "bukan jumlah kelompok" in notes


def test_regency_sheet_subtotals(workbook):
    ws = workbook["Rekap Kabupaten-Kota"]
    current, acc, checked = None, 0, 0
    for r in ws.iter_rows(values_only=True):
        code = str(r[0]) if r[0] is not None else ""
        if len(code) == 2 and code.isdigit():
            if current is not None:
                assert acc == current
                checked += 1
            current, acc = r[TOTAL_RECORDS], 0
        elif len(code) == 5 and "." in code:
            acc += r[TOTAL_RECORDS]
    assert acc == current
    assert checked == 36  # 37 provinsi, subtotal terakhir diperiksa setelah loop


def test_rekap_members_by_sex(long, workbook):
    """Rekap anggota: laki-laki + perempuan = anggota L+P di setiap baris."""
    assert (long["anggota_laki_laki"] + long["anggota_perempuan"] == long["anggota_laki_plus_perempuan"]).all()
    assert (long["rekaman_perempuan_0"] <= long["rekaman_dihitung_anggota"]).all()
    ws = workbook["Rekap Nasional"]
    rows = [[c.value for c in r] for r in ws.iter_rows()]
    head = next(r for r in rows if r[0] == "Jenis PS")
    i_lp, i_l, i_p = head.index("Anggota L+P"), head.index("Laki-laki"), head.index("Perempuan")
    total = next(r for r in rows if r[0] == "Total")
    nat = long[(long["tingkat"] == "nasional") & (long["jenis_ps"] == "Total")].iloc[0]
    assert total[i_lp] == nat["anggota_laki_plus_perempuan"] == total[i_l] + total[i_p]
    for name in ("Rekap Provinsi", "Rekap Kabupaten-Kota"):
        sheet = [[c.value for c in r] for r in workbook[name].iter_rows()]
        sub = next(r for r in sheet if "Laki-laki" in r)
        last = next(r for r in sheet if len(r) > 1 and r[1] == "Total")
        j = sub.index("Laki-laki")
        assert last[j - 1] == nat["anggota_laki_plus_perempuan"] == last[j] + last[j + 1], name

