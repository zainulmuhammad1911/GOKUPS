# Rencana Teknis PDPSI

**Status:** usulan Tahap 0, menunggu persetujuan
**Dasar:** `PRD_PDPSI.md`, `docs/DATA_AUDIT.md`, `docs/MAP_DATA_AUDIT.md`, pemeriksaan environment 2026-11-04

---

## 1. Prinsip keputusan

1. Data kecil dan jarang berubah: 10.061 baris, diperbarui lewat impor terkontrol, dibaca publik tanpa login. Arsitektur tidak perlu mengantisipasi beban tulis.
2. Satu sumber angka: peta, statistik, beranda, tabel, dan unduhan membaca rilis data yang sama dan memakai fungsi agregasi yang sama (PRD §2.2, §13).
3. Setiap komponen harus bisa dijelaskan dalam satu kalimat ke pengelola yang bukan pengembang.
4. Teknologi dari PRD §9 dipakai jika ada kebutuhan nyata. Yang tidak dibutuhkan MVP ditunda, dengan alasan tertulis.

## 2. Ringkasan arsitektur

```text
 Workbook GoKUPS (read-only)
        │
        ▼
 Pipeline Python  ──►  laporan kualitas (HTML/MD) untuk ditinjau pengelola
 (impor, normalisasi,
  crosswalk wilayah,
  bendera kualitas,
  ekspor)
        │
        ▼
 data/releases/<versi>/          ← satu folder per rilis, tidak pernah ditimpa
   approvals.json                  rekaman publik (field aman saja)
   release.json                    metadata rilis + total kontrol
   quality_report.json
   downloads/ (CSV, XLSX, ringkasan provinsi & kab/kota)
        │
        ▼
 Next.js (App Router, TypeScript)
   server: memuat rilis aktif ke memori, filter/agregasi/ekspor
   klien : MapLibre (peta), ECharts (grafik), tabel HTML
        │
        ▼
 Hosting Node (Vercel atau server institusi)
```

Tidak ada basis data server, layanan terpisah, antrean, atau tile server di MVP.

## 3. Keputusan teknologi

| Komponen | Keputusan | Alasan |
|----------|-----------|--------|
| Framework | **Next.js App Router** | Sesuai PRD; server components cukup untuk filter server-side tanpa backend terpisah |
| Bahasa | **TypeScript** (strict) | Tipe rekaman dan filter dibagi antara server dan klien |
| UI | **React + Tailwind CSS** | Sesuai PRD; token desain sebagai CSS variables |
| Peta | **MapLibre GL JS**, dimuat lazy hanya di `/map` | Zoom/pan sentuh yang baik di ponsel; tanpa API key; tanpa basemap |
| Peta mini beranda | **SVG statis** dirender di server dari GeoJSON provinsi (d3-geo) | Beranda tidak perlu memuat WebGL dan library peta |
| Grafik | **Apache ECharts**, impor modular (`echarts/core`), renderer SVG | Sesuai PRD; impor modular menekan ukuran bundle |
| Penyimpanan data | **File rilis berversi (JSON) yang dihasilkan pipeline** | Lihat §4 |
| ORM | Tidak dipakai | Tidak ada basis data relasional di MVP |
| Pengolahan data | **Python 3.12 + pandas + openpyxl**, dikelola dengan `uv` | Sesuai PRD; Python sistem 3.9.6 sudah tidak didukung |
| Geometri | **GeoJSON statis**, disederhanakan dengan **mapshaper** (npm) | Tidak perlu GDAL/PostGIS; lihat MAP_DATA_AUDIT §5 |
| i18n | **next-intl**, Indonesia di `/` dan Inggris di `/en/...` | URL Indonesia tetap seperti PRD §5.1 |
| Ekspor Excel | **exceljs** di server | Lisensi MIT; mendukung sheet metadata |
| Validasi input | **zod** untuk query string filter | PRD §12 keamanan |
| Uji | **pytest** (pipeline), **Vitest** (logika), **Playwright + axe-core** (E2E, aksesibilitas) | Lihat §10 |

### 3.1 Yang sengaja tidak dipakai di MVP

| Teknologi | Alasan ditunda |
|-----------|----------------|
| PostgreSQL + Prisma/Drizzle | 10 ribu baris read-only muat di memori (`approvals.json` rilis 2026-11-02: 11,3 MB, 0,7 MB gzip; hanya dibaca di server). Filter dan agregasi di memori butuh beberapa milidetik. Basis data menambah hosting, migrasi, backup, dan kredensial tanpa manfaat bagi pengguna. Lihat jalur peningkatan di §4.3. |
| PostGIS | Tidak ada operasi spasial; choropleth digabung lewat kode wilayah |
| Vector tiles, tippecanoe, tile server | 514 poligon yang disederhanakan cukup sebagai GeoJSON |
| Basemap pihak ketiga | Choropleth administratif tidak membutuhkan jalan atau citra; menghindari kuota dan lisensi tile |
| GSAP / library animasi | PRD §10 meminta tanpa animasi berlebihan |
| CMS, akun, admin UI, API publik | Di luar ruang lingkup PRD §4.2 |
| TanStack Table | Tabel dengan paginasi server cukup dengan HTML dan parameter URL |

## 4. Data dan penyimpanan

### 4.1 Mengapa file rilis, bukan PostgreSQL

PRD §8 menyebut entitas `source_records`, `approvals`, `administrative_areas`, dan `data_releases`. Keempatnya tetap ada, tetapi sebagai file dalam folder rilis:

| Entitas PRD | Bentuk di MVP | Publik? |
|-------------|---------------|---------|
| `source_records` | `data/releases/<v>/internal/source_records.jsonl`: salinan baris mentah lengkap + `source_row_no` + `extracted_at` | **Tidak.** Memuat nama orang; tidak disalin ke `public/` dan tidak diimpor oleh kode klien. |
| `approvals` | `data/releases/<v>/approvals.json`: field ternormalisasi + bendera kualitas | Ya (field aman saja) |
| `administrative_areas` | `data/reference/admin_areas_<versi>.json` + `public/geo/<versi-batas>/` | Ya |
| `data_releases` | `data/releases/<v>/release.json` + `data/releases/current.json` (penunjuk rilis aktif) | Ya (metadata) |

Keuntungan:
- Data mentah tidak pernah ditimpa. Setiap rilis adalah folder baru, dan rollback cukup dengan mengubah penunjuk `current.json`.
- Perbedaan antar-rilis bisa ditinjau sebagai diff file sebelum dipublikasikan.
- Hosting cukup satu aplikasi Node tanpa basis data.

### 4.2 Struktur rekaman `approvals.json` (sesuai prinsip Source Fidelity, DECISIONS.md bagian 1)

```text
id          ID internal stabil (4.4)
source      semua kolom sumber yang dipublikasikan, nama kolom asli, nilai apa adanya
            (spasi ganda, ejaan, 0, dan kosong/null dipertahankan).
            Tidak memuat Ketua Lembaga, Pra-Pendamping, Pendamping.
derived     hasil pengolahan PDPSI:
            sk_normalized, approval_year, scheme_code (7 kode), scheme_label_id, scheme_parent,
            record_kind (persetujuan|penetapan), province_code, province_name_official,
            regency_code, regency_name_official, regency_type,
            members_male_plus_female (null bila tidak dapat dihitung),
            members_calc_status (dihitung|nilai_negatif|komponen_kosong),
            area_calc_status (dihitung|nilai_negatif|kosong)
quality     hasil pemeriksaan sistem:
            flags[], duplicate {approval_number, record_count, type (identik|atribut_berbeda),
            related_ids[]}, sk_spacing_variant_ids[]
release_version
```

Nilai kosong disimpan sebagai `null`, tidak pernah `0`. UI harus memakai `source` untuk menampilkan nilai sumber dan memberi label "olahan PDPSI" untuk `derived`.

### 4.3 Jalur peningkatan ke PostgreSQL

Pindah ke PostgreSQL bila salah satu kondisi berikut terjadi: data melebihi sekitar 200 ribu baris, ada admin UI untuk impor, atau ada integrasi otomatis dengan GoKUPS. Karena semua akses data lewat satu modul (`src/lib/data/`), penggantian sumber data tidak menyentuh halaman.

### 4.4 ID rekaman yang stabil

`No` tidak stabil antar-ekstraksi. Yang diterapkan:
- `id` = 12 karakter pertama hash SHA-1 dari kunci identitas `nomor SK ternormalisasi | kode kab/kota | tanggal SK | nama lembaga ternormalisasi | kecamatan ternormalisasi`.
- Bila beberapa rekaman berbagi kunci identitas tetapi isinya berbeda, kunci ditambah tanda tangan seluruh isi rekaman (tanpa `No`). ID tidak bergantung pada urutan baris; ini diuji dengan mengacak urutan baris.
- Hanya rekaman yang isinya identik penuh (12 di rilis r2) diberi akhiran `-2` menurut urutan kemunculan, karena tidak bisa dibedakan dari isinya.
- Bila sebuah ID dari rilis lama tidak muncul lagi, halaman detail menampilkan "Rekaman ini tidak ada di rilis <versi>" dengan tautan pencarian, bukan 404 kosong (dibangun di Tahap 4).

### 4.5 Pipeline Python

```text
pipeline/
  pyproject.toml
  pdpsi_pipeline/
    ingest.py        baca workbook, simpan source_records, catat checksum file
    normalize.py     skema (dari data/config/scheme_map.csv), teks, tanggal
    regions.py       crosswalk nama → kode (dari crosswalk terverifikasi)
    quality.py       penanda per rekaman dan referensi duplikat (tanpa mengubah nilai)
    build.py         susun rekaman source / derived / quality; kolom pribadi tidak ikut
    aggregate.py     agregat hasil pengolahan + definisinya (control_totals.json)
    export.py        CSV, XLSX, ringkasan provinsi & kab/kota
    report.py        laporan kualitas untuk ditinjau sebelum publikasi
  tests/
```

Perintah: `uv run pdpsi build --source data/source/<file>.xlsx --version 2026-11-02`. Pipeline gagal (exit ≠ 0) bila ada wilayah yang tidak terpetakan, kolom sumber berubah, atau total kontrol tidak cocok.

## 5. Struktur aplikasi

### 5.1 Rute

| Rute | Isi | Render |
|------|-----|--------|
| `/` | Beranda: 4 kartu ringkasan, peta mini SVG, komposisi skema, wilayah teratas, sumber & tanggal | Statis per rilis |
| `/map` | Peta choropleth + panel + tabel alternatif | Halaman statis, peta dimuat di klien |
| `/statistics` | Grafik dengan filter global | Server (filter dari URL) |
| `/data` | Tabel, pencarian, filter, paginasi, unduh hasil | Server (filter dari URL) |
| `/data/[id]` | Detail rekaman | Server, cache per rilis |
| `/download` | Unduhan lengkap & ringkasan | Statis per rilis |
| `/unduh-hasil` | Route handler ekspor sesuai filter (CSV dalam ZIP / XLSX), parameter sama dengan `/data` | Server |
| `/unduh-berkas/[file]` | File unduhan rilis dari manifes `release.json` | Server |
| `/about` | Tentang data & metodologi | Statis |
| `/en/...` | Versi Inggris dari semua rute di atas | |

Halaman `/region/...` (opsional di PRD §5.1) **tidak dibangun di MVP**. Kebutuhannya sudah tertutup oleh panel peta dan `/data?province=…`. Bisa ditambahkan kemudian tanpa mengubah data.

Semua state filter disimpan di URL (`?q=…&province=72&regency=72.09&type=HTR&year_from=2017&year_to=2024&flag=duplicate_sk&sort=area&dir=desc&page=2`). `type` menerima 5 kode jenis PS (HD, HKM, HTR, HA, KK) atau 3 kode subskema KK. Parameter tidak valid diabaikan dan disebutkan di halaman. Akibatnya tautan dapat dibagikan, tombol kembali berfungsi, dan peta, statistik, serta data bisa saling menaut dengan filter yang sama.

### 5.2 Satu modul agregasi

`src/lib/data/aggregate.ts` adalah satu-satunya tempat yang menghitung jumlah rekaman, luas, anggota, dan komposisi skema per wilayah. Aturannya (DECISIONS.md K1, K4, K5):
- Rekaman: semua rekaman dihitung, termasuk rekaman bernomor SK sama.
- Luas: jumlah kolom sumber `Luas Area Keseluruhan (Ha)` pada rekaman dengan `area_calc_status = dihitung`. Penanda selisih luas tidak mengeluarkan rekaman.
- Anggota: jumlah `members_male_plus_female` pada rekaman dengan `members_calc_status = dihitung` (termasuk 0). Kolom sumber `Anggota Keseluruhan` dijumlahkan terpisah sebagai pembanding.
- Setiap hasil membawa jumlah rekaman yang dipakai dan yang tidak dipakai beserta alasannya, serta label "hasil pengolahan PDPSI".
- Tujuh kategori skema dihitung terpisah; tidak ada agregat gabungan.

Uji otomatis membandingkan total nasional modul ini dengan total kontrol `release.json` dari pipeline Python. Dua implementasi independen yang sepakat adalah bukti angka konsisten.

### 5.3 Unduhan

| File | Format | Metadata |
|------|--------|----------|
| Seluruh dataset | ZIP berisi `data.csv` + `BACA_SAYA.txt` (sumber, tanggal ekstraksi, versi, unit analisis, kamus kolom, keterbatasan) | Di file teks pendamping |
| Seluruh dataset | XLSX dengan sheet `Data`, `Metadata`, `Kamus Kolom` | Di sheet |
| Sesuai filter | CSV atau XLSX lewat `/download/export`; metadata ditambah deskripsi filter aktif | Sama |
| Ringkasan provinsi / kab/kota | CSV + XLSX | Sama |

CSV memakai UTF-8 dengan BOM, pemisah koma, dan desimal titik. Catatan di halaman Unduh perlu menjelaskan bahwa Excel berlokal Indonesia mengharapkan titik koma; pengguna Excel disarankan memakai file XLSX. File lengkap dibuat sekali oleh pipeline. Ekspor terfilter dibuat di server per permintaan dari data di memori.

### 5.4 Pencarian

Pencarian teks berjalan di server atas kolom sumber `Nomor Surat Keputusan`, `Nama Lembaga`, `Kabupaten Kota`, dan `Provinsi`. Pencocokan memakai bentuk ternormalisasi (huruf besar, tanpa tanda baca, spasi tunggal), tetapi hasil selalu menampilkan nilai sumber apa adanya. Untuk 10 ribu baris, pemindaian linear cukup; indeks khusus tidak diperlukan.

## 6. Arah desain (masukan dari `/ui-ux-pro-max`)

Skill `/ui-ux-pro-max` dijalankan dengan kueri "government open data portal forestry statistics map". Hasilnya disaring terhadap PRD:

| Usulan skill | Diterima? | Alasan |
|--------------|-----------|--------|
| Gaya "Minimalism & Swiss Style": grid, kontras tinggi, ruang kosong | Ya | Cocok dengan PRD §10 (bersih, tenang, informatif) |
| Tipografi Atkinson Hyperlegible (kategori pemerintah/aksesibilitas) | Ya, sementara | Keterbacaan tinggi untuk publik luas. Dukungan angka tabular untuk tabel perlu dicek; jika tidak ada, angka tabel memakai font kedua. |
| Palet biru "Government Portal" (#1E40AF) | Tidak | PRD meminta hijau kehutanan. Basis data skill tidak punya palet kehutanan, jadi token hijau dirancang di Tahap 2 dan diuji kontrasnya. |
| Pola "Enterprise Gateway" (Contact Sales, logo klien) | Tidak | Tidak relevan untuk portal data publik |
| Motion "scroll reveal" GSAP | Tidak | PRD menghindari animasi |
| Pedoman choropleth: skala satu warna, legenda dengan batas kelas, label wilayah, alternatif tabel, kontrol keyboard (+/−, Enter untuk drill-down, Back) | Ya | Selaras dengan PRD §12; dirinci di MAP_DATA_AUDIT §6 |
| Peringatan: choropleth menyesatkan bila ukuran wilayah sangat berbeda | Ya | Peta selalu didampingi grafik batang terurut |

Usulan dial antislop (perlu dikonfirmasi): **ENERGY 1 / RHYTHM 2 / MOTION 1**. Artinya tenang seperti portal layanan publik, dengan variasi komposisi antar-halaman (peta, grafik, tabel) dan hanya transisi hover/fokus.

Sebelum UI dibangun, `/antislop` mensyaratkan arah desain dari pemilik produk (R-37), misalnya `DESIGN.md` atau jawaban singkat soal identitas, palet, dan tipografi, serta pilihan mode antislop (*during* atau *after*). Keduanya masuk daftar keputusan di IMPLEMENTATION_PLAN.

Mode terang saja untuk MVP: palet peta dan grafik cukup diuji untuk satu tema, dan PRD meminta "hijau, putih, netral". Mode gelap bisa dipertimbangkan setelah MVP.

## 7. Peta (ringkas)

Rincian ada di `docs/MAP_DATA_AUDIT.md`. Ringkasnya:
- `provinces.geojson` dimuat saat `/map` dibuka. File kabupaten per provinsi dimuat saat drill-down.
- Angka indikator digabung di klien berdasarkan `code` dari endpoint agregat yang sama dengan halaman Statistik.
- Komponen peta dibungkus error boundary. Jika WebGL atau geometri gagal dimuat, yang tampil adalah tabel wilayah.

## 8. Kinerja (target)

| Halaman | Target JS awal (gzip) | Catatan |
|---------|----------------------:|---------|
| Beranda | < 120 KB | Tanpa MapLibre/ECharts; peta mini berupa SVG |
| `/data` | < 100 KB | Tabel dirender di server |
| `/statistics` | < 250 KB | ECharts modular |
| `/map` | < 350 KB + GeoJSON provinsi < 150 KB | MapLibre dimuat lazy |

LCP < 2,5 detik pada profil "Fast 4G" Lighthouse untuk beranda dan `/data`.

## 9. Keamanan dan privasi

- Kolom `Ketua Lembaga`, `Pra-Pendamping`, `Pendamping`, dan sheet `Pendamping` tidak pernah masuk `approvals.json`, bundle klien, atau unduhan (PRD §6.5; alasan dan cakupan di DECISIONS.md bagian 1). Nama lembaga, termasuk nama pemegang izin HTR, ditampilkan apa adanya (K3).
- Ekspor CSV/XLSX dari aplikasi harus menetralkan sel yang diawali `=`, `+`, `-`, atau `@` agar tidak dieksekusi sebagai rumus spreadsheet. Rilis r2 tidak memuat sel seperti itu (sudah diperiksa); pemeriksaan ini tetap wajib di ekspor terfilter Tahap 4.
- Workbook sumber dan `internal/` masuk `.gitignore`. Workbook memuat nama orang, sehingga repositori publik tidak boleh berisi file tersebut.
- Semua parameter filter divalidasi dengan zod (daftar kode wilayah dan skema yang diizinkan, panjang teks pencarian dibatasi).
- Tanpa cookie pelacak dan tanpa analitik pihak ketiga di MVP. Jika analitik dibutuhkan, pilih yang tidak mengumpulkan data pribadi.
- Header keamanan dasar: CSP, `X-Content-Type-Options`, `Referrer-Policy`.
- Tidak ada endpoint admin atau impor di aplikasi web.

## 10. Pengujian dan validasi angka

| Lapisan | Alat | Yang diuji |
|---------|------|-----------|
| Pipeline | pytest | Jumlah baris masuk = keluar; semua baris punya kode wilayah; bendera sesuai aturan; total kontrol; kolom pribadi tidak bocor ke `approvals.json` |
| Logika web | Vitest | Parsing filter, agregasi, format angka per bahasa |
| Konsistensi angka | Vitest | Total nasional di agregasi TS = total kontrol Python; jumlah per provinsi = total nasional |
| E2E | Playwright | Alur utama di 375, 768, dan 1280 px: filter → tabel → detail → unduh; peta drill-down; ganti bahasa |
| Aksesibilitas | axe-core (Playwright) + pemeriksaan keyboard manual | Kontras, label, fokus, navigasi peta dengan keyboard |
| Kinerja | Lighthouse CI | Anggaran di §8 |

## 11. Hosting dan rilis data

- Aplikasi: Vercel, atau server institusi dengan Node (`next build` mode `standalone`, bisa dikemas Docker). Pilihan bergantung pada kebijakan institusi.
- Rilis data: pengelola menjalankan pipeline, meninjau laporan kualitas, lalu commit folder rilis baru dan memperbarui `current.json`. Deploy ulang membuat rilis baru tampil. Inilah alur "hybrid" pada PRD §4.2.
- Setiap halaman data menampilkan versi rilis, tanggal ekstraksi sumber, dan tanggal publikasi.

## 12. Kondisi environment (diperiksa 2026-11-04)

| Alat | Status | Tindakan |
|------|--------|----------|
| Node.js | v26.7.0 | Cukup. Pin versi di `.nvmrc` dan pastikan hosting mendukung versi yang sama. |
| npm | 11.19.0 | Dipakai (pnpm/bun tidak terpasang; tidak diperlukan) |
| Python | 3.9.6 (bawaan Command Line Tools) | Sudah melewati masa dukungan. Pasang Python 3.12+ lewat `uv` untuk pipeline. |
| pandas / openpyxl | 2.3.3 / 3.1.5 | Cukup untuk audit; pipeline memakai venv sendiri |
| geopandas, GDAL, ogr2ogr, tippecanoe | Tidak ada | Tidak diperlukan; geometri diproses dengan mapshaper via `npx` |
| PostgreSQL / psql | Tidak ada | Tidak diperlukan di MVP |
| Docker | 29.6.2 | Tersedia untuk uji image produksi bila hosting institusi |
| Git | 2.50.1; **folder proyek belum menjadi repositori git** | Usul `git init` + `.gitignore` sebelum Tahap 1 (perlu persetujuan) |
| Disk | APFS, 926 GB bebas | Cukup |
