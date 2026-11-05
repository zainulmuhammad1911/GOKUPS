# Audit Kebutuhan Peta Interaktif PDPSI

**Tanggal:** 2026-11-04
**Dasar:** PRD §6.2, §12, §15; hasil `docs/DATA_AUDIT.md`; pemeriksaan langsung layanan BIG, HDX, geoBoundaries, dan repositori kode wilayah.

> **Pembaruan 2026-11-05 (K6 ditetapkan):** sumber yang dipakai adalah opsi cadangan pada §4, yaitu batas kabupaten/kota BPS 2020 melalui OCHA ROAP/HDX dalam versi geoBoundaries gbOpen IDN ADM2 (commit 9469f09, CC BY 3.0 IGO). Data BIG tidak dipakai karena ketentuan penggunaannya belum jelas. Penerapan dan hasilnya ada di §10. Bagian 1 sampai 9 di bawah adalah audit awal dan tidak diubah.

---

## 1. Kesimpulan singkat

1. Dataset tidak memiliki koordinat lembaga atau poligon areal persetujuan. Peta MVP hanya bisa berupa **choropleth agregat** provinsi dan kabupaten/kota. Tidak ada marker, titik sintetis, atau titik di pusat wilayah.
2. Data wilayah di workbook cukup bersih: 37 provinsi, 407 kabupaten/kota, dan seluruhnya bisa dipetakan ke kode Kemendagri (406 otomatis, 1 alias manual).
3. Kandidat terkuat untuk batas wilayah adalah **layanan BIG "Wilayah Administrasi Kabupaten/Kota" edisi September 2023**. Layanan ini sudah memuat 38 provinsi dan 514 kabupaten/kota (416 kabupaten, 98 kota) beserta kode Kemendagri. **Lisensi atau ketentuan penggunaannya belum ditemukan** dan harus dikonfirmasi sebelum geometri dipublikasikan.
4. Sumber internasional berlisensi jelas (HDX COD-AB dari BPS, geoBoundaries) masih memakai **34 provinsi**. Jika dipakai, empat provinsi baru Papua harus dibentuk ulang dengan menggabungkan poligon kabupaten.
5. Format yang disarankan: **GeoJSON statis yang sudah disederhanakan**. File provinsi dimuat di awal, file kabupaten dimuat per provinsi saat drill-down. Tidak perlu PostGIS, tile server, atau basemap pihak ketiga.

## 2. Ketersediaan data wilayah di dataset

| Tingkat | Tersedia | Kualitas | Dipakai di peta MVP |
|---------|----------|----------|---------------------|
| Provinsi | 37 nama, 0 kosong | Seragam, cocok 37/37 ke kode resmi | Ya |
| Kabupaten/kota | 407 nama, 0 kosong | Seragam, unik per provinsi, cocok 407/407 | Ya |
| Kecamatan | 2.122 nama, 3.278 kosong (33%) | Belum dicocokkan | Tidak (hanya teks di halaman detail) |
| Desa | Tidak ada kolom desa | – | Tidak |
| Koordinat / poligon | Tidak ada | – | Tidak |

Kode wilayah **tidak ada** di workbook. Satu-satunya kunci adalah nama teks. Karena itu crosswalk nama → kode wajib dibuat, sesuai PRD §6.2.

## 3. Kode wilayah resmi

**Rujukan hukum:** Kepmendagri No. 300.2.2-2138 Tahun 2025 tentang Pemberian dan Pemutakhiran Kode, Data Wilayah Administrasi Pemerintahan, dan Pulau. Keputusan ini mencabut Kepmendagri 100.1.1-6117/2022 dan sudah diubah oleh Kepmendagri 300.2.2-2430 Tahun 2025. Menurut sumber sekunder, totalnya 38 provinsi, 416 kabupaten, dan 98 kota. Angka ini sama dengan jumlah kode di data BIG.

**Format kode:** provinsi 2 digit (`72`), kabupaten/kota `PP.KK` (`72.09`). Kota memakai `KK` ≥ 71. Empat provinsi baru Papua memakai kode 93 sampai 96, dan kabupaten yang pindah ke provinsi tersebut mendapat kode baru (misalnya Merauke di 93.xx).

**Sumber kode yang dapat dibaca mesin:**

| Sumber | Status | Catatan |
|--------|--------|---------|
| Lampiran PDF Kepmendagri 2025 | Rujukan resmi | Perlu diekstrak; dipakai untuk verifikasi akhir |
| Atribut layanan BIG (`kdppum`, `kdpkab`) | Sudah diambil ke `data/reference/big_kabkota_2023_attributes.csv` | 38 provinsi, 514 kode kab/kota; edisi 2023 |
| `cahyadsn/wilayah` (GitHub) | Transkripsi komunitas Kepmendagri 300.2.2-2430/2025, lisensi MIT | Bagus untuk cek silang; bukan sumber resmi |

**Hasil pencocokan awal** (`docs/audit/region_crosswalk_draft.csv`):

| Metode | Pasangan provinsi + kab/kota | Baris data |
|--------|-----------------------------:|-----------:|
| Nama ternormalisasi | 406 | 10.043 |
| Alias manual (`PANGKAJENE KEPULAUAN` → 73.10) | 1 | 18 |
| Tidak cocok | 0 | 0 |

Kasus yang perlu diperhatikan saat verifikasi:
- `KOTA BARU` (Kalimantan Selatan) = **Kabupaten Kotabaru** (63.02), bukan kota.
- Pasangan kabupaten/kota bernama sama: `BANDUNG` (kabupaten) vs `KOTA BANDUNG`, `GORONTALO` vs `KOTA GORONTALO`, `KUPANG` vs `KOTA KUPANG`, `SORONG` vs `KOTA SORONG`, dan seterusnya. Sumber konsisten memakai awalan `KOTA` untuk kota.
- Kabupaten di empat provinsi baru Papua harus memakai kode baru, bukan kode lama 91.xx/92.xx.

Langkah verifikasi: cocokkan 407 kode hasil crosswalk dengan lampiran Kepmendagri 2025. Setelah diperiksa, ubah `verified` menjadi `true` dan catat pemeriksa serta tanggalnya.

## 4. Sumber batas administratif

| Sumber | Tingkat | Provinsi | Versi | Lisensi | Kode Kemendagri | Penilaian |
|--------|---------|---------:|-------|---------|-----------------|-----------|
| **BIG** geoservices `Wilayah_Administrasi_Kabupaten__Kota` | Kab/kota (provinsi lewat dissolve) | 38 | Edisi Sep 2023 | **Tidak tercantum** | Ya (`kdppum`, `kdpkab`) | Paling sesuai dengan data; lisensi harus dikonfirmasi |
| **HDX COD-AB Indonesia** (BPS, OCHA) | Adm 1 sampai 4 | 34 | Batas dibuat 2020, ditinjau ulang Okt 2025 | CC BY-IGO | Kode BPS/P-code | Lisensi jelas, tetapi 34 provinsi dan 522 unit adm-2 |
| **geoBoundaries** IDN | ADM1 / ADM2 | 34 | ADM1: OSM 2017 (ODbL); ADM2: BPS 2020 (CC BY 3.0 IGO), 519 unit | ODbL / CC BY 3.0 IGO | Tidak | Turunan sumber di atas; tidak menambah nilai |
| **GADM** | – | – | – | Penggunaan terbatas, redistribusi tidak diizinkan tanpa izin | Tidak | Hindari |
| `cahyadsn/wilayah_boundaries` | Prov sampai desa | 38 | Mengikuti Kepmendagri 2025 | MIT (repositori) | Ya | Asal geometri tidak didokumentasikan; tidak layak sebagai sumber resmi |

**Catatan penting tentang BIG:**
- Deskripsi layanan menyebut pemutakhiran segmen batas hasil Permendagri dan penyesuaian alokasi wilayah Papua. Deskripsi itu juga menyebut masih ada kesalahan topologi pada fitur garis batas.
- Rilis BIG menyatakan batas pada Peta RBI **bukan referensi resmi batas wilayah**. Batas yang sah mengacu ke Permendagri tentang segmen batas. Untuk choropleth statistik, ini cukup, asalkan catatan peta menyebut batas bersifat indikatif.
- Layanan berisi 548 fitur: 425 kabupaten, 98 kota, dan sisanya wilayah khusus (`tipadm` 6 dan 999, misalnya wilayah terapung, "Pulau Bermasalah", "Danau Moat, area bermasalah"). Fitur khusus perlu diputuskan: dibuang atau digambar netral.
- Ukuran geometri penuh sangat besar: satu kabupaten (Tojo Una-Una) berukuran **3,3 MB** GeoJSON. Generalisasi di server (`maxAllowableOffset=0.005`) membuatnya 71 KB. Namun generalisasi per fitur di server bisa menimbulkan celah antar-tetangga. Penyederhanaan sebaiknya dilakukan lokal dengan alat yang menjaga topologi.
- Layanan mendukung keluaran GeoJSON dan PBF, SRS WGS84 (EPSG:4326), batas 2.000 fitur per query.

**Rekomendasi:**
1. **Utama:** BIG edisi 2023, **setelah** ketentuan penggunaan dikonfirmasi tertulis. Tindakannya: cek halaman ketentuan Ina-Geoportal/BIG atau minta izin resmi. Keunggulannya: 38 provinsi, kode Kemendagri, dan sumber pemerintah.
2. **Cadangan:** HDX COD-AB adm-2 (BPS 2020, CC BY-IGO). Kabupaten dipetakan ulang ke kode 2025 lewat tabel padanan, lalu di-dissolve menjadi 38 provinsi. Daftar kabupaten/kota tidak berubah sejak 2013; yang berubah hanya induk provinsi di Papua. Atribusi BPS dan OCHA wajib ditampilkan.
3. Apa pun pilihannya, versi, tanggal, lisensi, dan atribusi batas ditampilkan di legenda peta dan halaman Metodologi (PRD §6.2).

## 5. Format dan ukuran data geografis

| Opsi | Kelebihan | Kekurangan | Keputusan |
|------|-----------|------------|-----------|
| **GeoJSON statis yang disederhanakan** | Langsung dibaca MapLibre; mudah diperiksa; hosting statis | Perlu disederhanakan agar kecil | **Dipakai** |
| TopoJSON | 40 sampai 60% lebih kecil, berbagi tepi | Perlu konversi di klien (`topojson-client`) | Opsional jika ukuran GeoJSON masih besar |
| Vector tiles (PMTiles/MBTiles) | Cocok untuk data sangat besar | Butuh tippecanoe dan alur build tambahan | Tidak perlu untuk 514 poligon |
| PostGIS | Query spasial | Infrastruktur tambahan tanpa kebutuhan spasial nyata | Tidak perlu |

Rencana file (ukuran adalah target, diukur saat spike peta):

```text
public/geo/<boundary-version>/
  provinces.geojson            38 fitur, target < 400 KB (gzip < 150 KB)
  regencies/<kode-prov>.geojson  satu file per provinsi, target < 150 KB per file
  regencies-all.geojson        hanya untuk peta mini beranda bila diperlukan
```

Pipeline geometri, dijalankan sekali per versi batas, bukan setiap impor data:
1. Unduh geometri BIG lewat query GeoJSON bertahap (per provinsi), dengan generalisasi ringan (`maxAllowableOffset` sekitar 0,0005°) agar ukuran unduhan wajar.
2. Gabungkan, buang atau tandai fitur khusus, lalu sederhanakan dengan **mapshaper** (`npx mapshaper`, topology-aware, tanpa GDAL). Satu tingkat untuk provinsi dan satu tingkat untuk kabupaten.
3. Dissolve kabupaten → provinsi berdasarkan kode.
4. Properti per fitur hanya `code`, `name`, `parent_code`. Angka indikator **tidak** disimpan di GeoJSON. Angka digabung di klien dari data agregat, sehingga satu file geometri bisa dipakai untuk semua filter.
5. Simpan checksum dan metadata versi (`boundary_release.json`).

## 6. Strategi choropleth

**Indikator** (PRD §6.2), dengan status data:

| Indikator | Status | Catatan |
|-----------|--------|---------|
| Jumlah rekaman persetujuan | Siap | Sangat condong: Tojo Una-Una 1.069 rekaman, sebagian besar izin HTR perorangan |
| Jumlah kelompok | **Tidak tersedia** | Unit kelompok tidak bisa dibedakan dari rekaman (DATA_AUDIT §10). Tidak ditampilkan. |
| Luas persetujuan (ha) | Siap dengan aturan validasi | 99,6% baris konsisten |
| Jumlah anggota | Menunggu keputusan metodologi | 1.127 baris bermasalah (DATA_AUDIT §4) |
| Distribusi menurut skema | Siap | Ditampilkan lewat filter skema dan komposisi di panel, bukan peta kategori "skema dominan" |

**Aturan visual:**
- Skala **sekuensial satu hue hijau**, 5 kelas. Batas kelas dihitung dengan metode kuantil atau natural breaks dari nilai wilayah yang tampil, lalu dibulatkan agar mudah dibaca. Untuk data yang sangat condong, kuantil lebih aman daripada interval sama.
- Legenda menampilkan rentang angka dan satuan ("rekaman", "ha"). Legenda ikut berubah bila filter atau tingkat wilayah berubah.
- Tiga keadaan wilayah harus berbeda secara visual dan tertulis di legenda: **ada nilai** (kelas warna), **tidak ada rekaman** untuk filter ini (abu-abu netral, bukan warna kelas terendah), dan **data tidak valid / tidak tersedia** (arsiran atau pola). Nol tidak boleh tampil sebagai kelas terendah.
- Warna tidak menjadi satu-satunya pembeda. Panel informasi menampilkan angka saat wilayah dipilih atau difokus, dan tersedia tabel alternatif berisi semua wilayah (PRD §12).
- Garis batas berwarna kontras terhadap isian. Wilayah terpilih ditandai dengan garis tebal, tidak hanya perubahan warna.
- Tidak ada basemap jalan atau citra. Latar laut polos cukup dan menghindari ketergantungan pada penyedia tile. Jika nanti dibutuhkan basemap, pilih penyedia dengan lisensi dan kuota yang jelas.

**Risiko interpretasi:**
- Choropleth jumlah absolut cenderung menonjolkan wilayah luas, seperti Papua dan Kalimantan, sementara Jawa tampak kecil. Panel dan halaman Statistik perlu didampingi grafik batang terurut. PRD tidak meminta indikator yang dinormalisasi, misalnya persentase luas wilayah. Kemungkinan ini dicatat sebagai pertanyaan terbuka dan tidak dibangun.
- Hitungan rekaman sangat dipengaruhi izin HTR perorangan. Keterangan indikator perlu menyebut ini.

## 7. Drill-down provinsi → kabupaten/kota

Alur yang diusulkan:

1. **Nasional:** `provinces.geojson`, choropleth 38 provinsi. DKI Jakarta tampil sebagai "tidak ada rekaman".
2. **Klik atau Enter pada provinsi:** peta melakukan `fitBounds` ke provinsi dan memuat `regencies/<kode>.geojson`. Kelas warna dihitung ulang **di dalam provinsi tersebut**. Panel menampilkan ringkasan provinsi dan tautan ke `/data?province=<kode>`.
3. **Klik kabupaten/kota:** panel menampilkan ringkasan kabupaten/kota (jumlah rekaman, luas, anggota jika valid, komposisi skema) dan tautan ke data yang sudah difilter.
4. **Kembali ke nasional:** tombol yang selalu terlihat dan breadcrumb `Indonesia › Provinsi`.

State disimpan di URL agar bisa dibagikan dan tombol kembali browser berfungsi, misalnya `/map?indicator=area&scheme=HKM&province=72&regency=72.09`.

Kecamatan tidak dibuat drill-down: 33% kosong, belum dicocokkan, dan PRD tidak memintanya.

## 8. Keadaan khusus

| Keadaan | Penanganan |
|---------|-----------|
| Wilayah tanpa rekaman (107 kab/kota, DKI Jakarta) | Abu-abu netral + label "Tidak ada rekaman pada data ini" |
| Filter skema tanpa hasil di wilayah | Pesan kosong di panel, peta tetap tampil |
| Indikator tidak valid untuk wilayah | Arsiran + keterangan "Data belum dapat ditampilkan", bukan nol |
| Geometri gagal dimuat | Peta diganti pesan + tabel wilayah; halaman lain tidak terpengaruh (PRD §12) |
| WebGL tidak tersedia | Sama seperti di atas |
| Layar ponsel | Panel informasi menjadi bottom sheet yang bisa diciutkan; filter dalam satu tombol; peta minimal 60% tinggi layar |

## 9. Keputusan yang dibutuhkan sebelum implementasi peta

1. Konfirmasi lisensi/ketentuan penggunaan data batas BIG, atau persetujuan memakai HDX COD-AB sebagai cadangan.
2. Penanganan fitur khusus BIG (wilayah terapung, area bermasalah).
3. Indikator bawaan saat peta dibuka. Usulan: luas (ha), karena tidak terlalu terdistorsi oleh izin HTR perorangan.
4. Penanggung jawab verifikasi crosswalk kode wilayah.

## 10. Penerapan (2026-11-05)

| Butir | Keputusan dan hasil |
|-------|---------------------|
| Sumber | geoBoundaries gbOpen IDN ADM2 (BPS 2020 via OCHA ROAP/HDX), CC BY 3.0 IGO, commit 9469f09. SHA-256 file sumber dicatat di `boundary_release.json` |
| Kode wilayah | 519 fitur sumber: 503 cocok lewat nama ke kode Kepmendagri 300.2.2-2138/2025, 11 lewat alias tertulis (`data/config/geo_aliases.csv`), 5 fitur danau/kawasan hutan dikeluarkan. Hasil: 514 kabupaten/kota |
| Provinsi | 38, dibentuk dengan menggabungkan kabupaten/kota menurut kode 2025 (termasuk empat provinsi baru Papua) |
| Penyederhanaan | mapshaper: kabupaten/kota 3%, provinsi 1%, peta mini 0,12% (pulau < 150 km² dibuang hanya di peta mini) |
| Ukuran | provinsi 464 KB (153 KB gzip), kabupaten/kota per provinsi terbesar 129 KB, peta mini 56 KB |
| Versi batas | `bps-2020-gb9469f09-kemendagri2025`, di `public/geo/<versi>/` dengan `current.json` |
| Indikator bawaan | jumlah rekaman (sama dengan unit hitung utama di halaman lain); luas dan anggota L+P bisa dipilih |
| Atribusi | tampil di legenda peta, peta mini, dan halaman Tentang; batas dinyatakan indikatif |
| Fitur khusus BIG | tidak relevan karena BIG tidak dipakai |
| Verifikasi crosswalk (K7) | cek silang otomatis lolos; pemeriksaan manusia masih menunggu |

Perintah: `uv run --project pipeline pdpsi geo` (lihat `README.md`). Uji: `pipeline/tests/test_geo.py`.
