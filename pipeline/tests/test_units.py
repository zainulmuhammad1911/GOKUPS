"""Uji aturan kecil dengan masukan buatan (bukan data publikasi)."""
from __future__ import annotations

import pandas as pd

from pdpsi_pipeline.build import source_value, stable_ids
from pdpsi_pipeline.normalize import norm_sk, sk_year, slugify


def test_source_value_keeps_text_exactly():
    assert source_value("KTH  MUARA KILIS") == "KTH  MUARA KILIS"  # spasi ganda dipertahankan
    assert source_value("BADAN USAHA MIILIK DESA") == "BADAN USAHA MIILIK DESA"  # ejaan tidak dikoreksi
    assert source_value(" SK.6827 /X") == " SK.6827 /X"


def test_source_value_zero_vs_empty():
    assert source_value(0) == 0
    assert source_value(0.0) == 0
    assert source_value(float("nan")) is None
    assert source_value(None) is None
    assert source_value(317.0) == 317
    assert source_value(12.5) == 12.5
    assert source_value(pd.Timestamp("2019-12-26")) == "2019-12-26"


def test_norm_sk_and_year():
    assert norm_sk("SK. 2545/MENLHK-PSKL/PKPS/PSL.0/4/2019") == norm_sk("SK.2545/MENLHK-PSKL/PKPS/PSL.0/4/2019")
    assert sk_year("2074 TAHUN 2026") == 2026
    assert sk_year("SK.1689/MENLHK-PSKL/PKPS/PSL.0/3/2021") == 2021
    assert sk_year("11956 TAHUN 202") is None


def test_slugify():
    assert slugify("Kabupaten Tojo Una Una") == "kabupaten-tojo-una-una"


def test_stable_ids_do_not_depend_on_order_for_unique_content():
    keys = pd.Series(["a", "b", "c"])
    first = stable_ids(keys, pd.Series([1, 2, 3]))
    shuffled = stable_ids(keys, pd.Series([3, 1, 2]))
    assert list(first) == list(shuffled)


def test_stable_ids_suffix_only_for_identical_content():
    keys = pd.Series(["a", "b", "a"])
    ids = stable_ids(keys, pd.Series([3, 1, 7]))
    assert ids[0] != ids[1]
    assert ids[2] == ids[0] + "-2"
