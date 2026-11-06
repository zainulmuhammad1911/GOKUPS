from __future__ import annotations

import json
from pathlib import Path

import pytest

from pdpsi_pipeline import cli
from pdpsi_pipeline.build import build
from pdpsi_pipeline.config import PROJECT_ROOT, Paths

SOURCE = PROJECT_ROOT / "data" / "source" / "gokups_2026-11-02" / "Data_SK_Perhutanan_Sosial_GoKUPS.xlsx"
CURRENT_RELEASE = PROJECT_ROOT / "data" / "releases" / "2026-11-02.r7"


def _require_source() -> None:
    if not SOURCE.exists():
        pytest.skip(f"Workbook sumber tidak ada di {SOURCE} (sengaja tidak di-commit)")


@pytest.fixture(scope="session")
def release_dir(tmp_path_factory) -> Path:
    """Rilis baru yang dibangun ulang dari sumber ke folder sementara."""
    _require_source()
    out = tmp_path_factory.mktemp("release") / "test-build"
    code = cli.main(["build", "--source", str(SOURCE), "--version", "test-build", "--out", str(out), "--no-current"])
    assert code == 0
    return out


@pytest.fixture(scope="session")
def build_result():
    _require_source()
    return build(SOURCE, Paths())


@pytest.fixture(scope="session")
def approvals(release_dir) -> list[dict]:
    return json.loads((release_dir / "approvals.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def totals(release_dir) -> dict:
    return json.loads((release_dir / "control_totals.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def release_meta(release_dir) -> dict:
    return json.loads((release_dir / "release.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def source_rows(release_dir) -> list[dict]:
    lines = (release_dir / "internal" / "source_records.jsonl").read_text(encoding="utf-8").splitlines()
    return [json.loads(line) for line in lines]
