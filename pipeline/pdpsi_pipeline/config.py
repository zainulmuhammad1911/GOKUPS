"""Lokasi file proyek dan pemuatan konfigurasi."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Paths:
    root: Path = PROJECT_ROOT

    @property
    def config_dir(self) -> Path:
        return self.root / "data" / "config"

    @property
    def reference_dir(self) -> Path:
        return self.root / "data" / "reference"

    @property
    def releases_dir(self) -> Path:
        return self.root / "data" / "releases"

    @property
    def scheme_map(self) -> Path:
        return self.config_dir / "scheme_map.csv"

    @property
    def quality_rules(self) -> Path:
        return self.config_dir / "quality_rules.json"

    @property
    def site_config(self) -> Path:
        return self.root / "config" / "site.json"

    @property
    def crosswalk(self) -> Path:
        return self.reference_dir / "region_crosswalk.csv"

    @property
    def kemendagri(self) -> Path:
        return self.reference_dir / "kemendagri_2025_prov_kabkota.csv"

    @property
    def big_attributes(self) -> Path:
        return self.reference_dir / "big_kabkota_2023_attributes.csv"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_scheme_map(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, keep_default_na=False).replace({"": None})
