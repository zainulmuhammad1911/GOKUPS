# Pipeline data PDPSI

Mengubah workbook ekstraksi GoKUPS menjadi rilis data publik berversi di `data/releases/<versi>/`. Workbook sumber tidak pernah diubah.

## Persiapan (sekali)

Butuh [uv](https://docs.astral.sh/uv/). uv memasang Python 3.12 dan dependensi sendiri, tanpa memakai Python bawaan macOS.

```bash
cd pipeline
uv sync
```

## Membuat rilis baru

1. Simpan workbook baru di `data/source/<nama-ekstraksi>/` (folder ini tidak masuk git karena memuat nama orang).
2. Jika workbook memuat provinsi atau kabupaten/kota yang belum ada di `data/reference/region_crosswalk.csv`, tambahkan barisnya secara manual dan periksa kodenya terhadap Kepmendagri. Pipeline berhenti bila ada wilayah yang belum terpetakan.
3. Jalankan:

```bash
uv run pdpsi build --source ../data/source/<nama-ekstraksi>/<file>.xlsx --version <YYYY-MM-DD>
```

4. Baca `data/releases/<versi>/quality_report.md`.
5. Jalankan uji: `uv run pytest`.

Rilis lama tidak pernah ditimpa. `--force` hanya untuk pengembangan.

## Batas wilayah untuk peta

Sumber: geoBoundaries gbOpen IDN ADM2 (BPS 2020 via OCHA ROAP/HDX, CC BY 3.0 IGO), disimpan di `data/source/geo/` (tidak masuk git). Perintah ini mencocokkan fitur ke kode Kepmendagri 2025 (alias di `data/config/geo_aliases.csv`), membentuk 38 provinsi, menyederhanakan dengan mapshaper, dan menulis `public/geo/<versi>/` beserta `public/geo/current.json`. Butuh Node dan `npm install` di akar proyek (mapshaper).

```bash
uv run pdpsi geo --source ../data/source/geo/geoBoundaries-IDN-ADM2.geojson --version <versi-batas>
```

Wilayah baru di Kepmendagri yang tidak punya padanan nama di sumber harus ditambahkan ke `geo_aliases.csv`; perintah berhenti bila ada kabupaten/kota tanpa geometri.

## Direktori OMS pendamping

Sumber kedua yang terpisah dari data SK (DECISIONS.md K12). Masukannya workbook verifikasi di `data/source/oms/` (tidak masuk git). Hanya entri berstatus Terverifikasi atau Sebagian yang ditulis; entri lain ditahan, dan perintah berhenti bila masih ada entri yang belum diperiksa daring.

```bash
uv run pdpsi oms --source ../data/source/oms/<workbook-verifikasi>.xlsx --version <YYYY-MM-DD> --directory-date <tanggal direktori> --checked-date <tanggal pemeriksaan>
```

Keluaran: `data/oms/<versi>/directory.json` dan `data/oms/current.json`.

## Tautan dokumen SK di GoKUPS

Situs menautkan ke halaman detail dan PDF SK di GoKUPS; dokumen tidak diunduh atau disimpan. Masukannya CSV (UTF-8) dengan kolom:

| Kolom | Isi |
|-------|-----|
| `Nomor Surat Keputusan`, `Nama Lembaga`, `Provinsi`, `Kabupaten Kota`, `Kecamatan` | Seperti tampil di GoKUPS |
| `Tanggal Surat Keputusan` | ISO (`2026-04-21`) atau format GoKUPS (`Selasa, 21 April 2026`) |
| `Luas Area Keseluruhan (Ha)` | Angka, boleh dengan "Ha" (`732.00 Ha`) |
| `Tautan Detail GoKUPS` | `https://gokups.hutsos.kehutanan.go.id/public/society/detail/<kode>` |
| `Tautan PDF SK` | `https://gokups.hutsos.kehutanan.go.id/storage/surat-keputusan/<kode>.pdf`; lebih dari satu dipisah `|`; kosong bila tidak ada |

Kode halaman detail ada di daftar Tabular (`detail('<kode>')`); alamat PDF ada di pratinjau dokumen kategori "Surat Keputusan" di halaman detail. Baris dicocokkan ke rekaman rilis aktif berdasarkan isi, bukan urutan. Hanya alamat `https://gokups.hutsos.kehutanan.go.id/` yang diterima.

```bash
uv run pdpsi links --source ../data/source/gokups_links/<file>.csv --version <YYYY-MM-DD> --collected-at <YYYY-MM-DD>
```

Keluaran: `data/links/<versi>/sk_links.json` dan `data/links/current.json`. Kolom "Dokumen SK" di halaman Data dan tombol PDF di halaman rekaman baru muncul bila file ini ada.

## Isi folder rilis

| File | Publik | Isi |
|------|--------|-----|
| `approvals.json` | Ya | Satu objek per baris sumber: `source` (nilai apa adanya), `derived` (olahan PDPSI), `quality` (penanda, referensi duplikat) |
| `control_totals.json` | Ya | Agregat hasil pengolahan + definisinya, per skema, provinsi, kabupaten/kota, tahun |
| `admin_areas.json` | Ya | 38 provinsi dan 514 kabupaten/kota (Kepmendagri 2025) |
| `schemes.json` | Ya | Pemetaan skema |
| `downloads/` | Ya | CSV (ZIP + BACA_SAYA.txt) dan XLSX, lengkap dan ringkasan |
| `quality_report.md/.json` | Ya | Ringkasan kualitas, tanpa nama |
| `release.json` | Ya | Metadata rilis, aturan yang dipakai, checksum file |
| `internal/` | **Tidak** | Salinan baris sumber lengkap, untuk audit (sejak r7 semua kolom tabular juga dipublikasikan, K11) |

Prinsip yang dijaga pipeline: nilai sumber tidak diubah, rekaman tidak dihapus, kategori tidak digabung, dan penanda tidak mengeluarkan rekaman dari perhitungan. Lihat `docs/DECISIONS.md` bagian 1.

## Mengubah aturan

Aturan kualitas ada di `data/config/quality_rules.json`, pemetaan skema di `data/config/scheme_map.csv`, dan identitas institusi di `config/site.json`. Setiap aturan merujuk ke `docs/DECISIONS.md`.
