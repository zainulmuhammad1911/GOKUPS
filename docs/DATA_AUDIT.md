# Audit Dataset PDPSI

**File sumber:** `Data_SK_Perhutanan_Sosial_GoKUPS.xlsx` (tidak diubah; SHA-256 `99c05e22…597bd5` sama sebelum dan sesudah audit)
**Waktu ekstraksi menurut sheet Catatan:** daftar SK 2026-11-02T04:52Z, pendamping 2026-11-02T04:51Z
**Tanggal audit:** 2026-11-04
**Cara mengulang:** `python3 scripts/audit/audit_dataset.py` (hanya membaca workbook). Angka di dokumen ini berasal dari `docs/audit/audit_summary.json`. Daftar baris bermasalah ada di `docs/audit/*.csv`. File CSV tersebut sengaja tidak memuat nama lembaga, ketua, atau pendamping.

> **Catatan 2026-11-04:** Temuan dan angka audit di dokumen ini tetap berlaku. **Usulan perlakuan** di dalamnya (mengeluarkan baris dari indikator, menyamarkan nama, menggabungkan subskema KK, tidak menampilkan KPH) sudah digantikan prinsip Source Fidelity dan keputusan K1 sampai K8 di `docs/DECISIONS.md`. Bila ada perbedaan, `DECISIONS.md` yang berlaku.

---

## 1. Ringkasan temuan

| # | Temuan | Dampak ke portal | Tingkat |
|---|--------|------------------|---------|
| 1 | Kolom `Anggota Keseluruhan` berisi angka anggota **perempuan** pada 1.127 baris (bukan L + P). Polanya 100% konsisten dan terkonsentrasi pada SK 2023 sampai 2025. | Total anggota 1.227.046 tidak bisa dipakai apa adanya. | Tinggi |
| 2 | Anggota perempuan = 0 pada 5.371 baris (53%). Untuk SK sebelum 2017 nilainya hampir selalu 0 (96 sampai 100%). Ini lebih mungkin berarti "tidak dicatat" daripada "nol". | Statistik gender tidak layak dipublikasikan sebagai fakta tanpa catatan kuat. | Tinggi |
| 3 | 2.238 dari 2.736 baris HTR mewakili izin perorangan (anggota ≤ 1). 2.000 di antaranya memakai pola nama `NAMA ORANG (NAMA KELOMPOK)` di kolom `Nama Lembaga`. | Kolom nama lembaga memuat data pribadi; satu baris tidak sama dengan satu kelompok. | Tinggi |
| 4 | Satu kabupaten (Tojo Una-Una) menyumbang 1.069 baris (10,6% dari seluruh data), 1.047 di antaranya izin HTR perorangan berukuran median 3 ha. | Peringkat dan peta "jumlah rekaman" akan didominasi satu wilayah. | Tinggi |
| 5 | 146 baris berlebih dalam 136 kelompok nomor SK duplikat. Hanya 12 yang identik penuh. Sisanya SK yang sah mencakup beberapa lembaga, atau entri yang berbeda isinya. | Nomor SK tidak bisa dipakai sebagai kunci unik. | Sedang |
| 6 | Luas total konsisten dengan komponennya pada 10.016 baris (99,6%). Luas total selalu bilangan bulat. 435 baris bernilai tepat 1 ha. | Luas layak dipakai dengan catatan pembulatan. | Rendah |
| 7 | Nama provinsi (37) dan kabupaten/kota (407) sudah seragam. 407 dari 407 pasangan provinsi + kabupaten/kota cocok dengan kode Kemendagri di data BIG (406 otomatis, 1 alias manual). | Standardisasi wilayah relatif mudah, tetapi tetap perlu verifikasi manusia. | Rendah |
| 8 | GoKUPS beranda menampilkan 11.352 capaian, sedangkan tabular berisi 10.061 SK. Selisih per provinsi tidak seragam, dan ada provinsi yang luas capaiannya jauh berbeda (Bali 252.050 ha vs 29.805 ha di sheet). | Angka PDPSI akan berbeda dari angka beranda GoKUPS dan harus dijelaskan. | Sedang |

## 2. Struktur workbook

| Sheet | Baris data | Kolom | Isi |
|-------|-----------:|------:|-----|
| `SK Perhutanan Sosial` | 10.061 | 26 | Satu baris per entri tabular GoKUPS. Kolom `No` berurutan 1 sampai 10.061 tanpa celah. |
| `Pendamping` | 2.138 | 4 | Daftar pendamping: `No`, `Nama Lengkap`, `SK Pendamping`, `SK Perhutanan Sosial` (93 kosong; beberapa SK dipisah `~`). 1.878 nama unik. |
| `Catatan` | 58 | 8 | Metadata ekstraksi, catatan per kolom, dan tabel rekonsiliasi capaian beranda vs sheet 1 per provinsi. |

### 2.1 Kolom sheet `SK Perhutanan Sosial`

| Kolom | Tipe | Kosong | Catatan |
|-------|------|-------:|---------|
| No | int | 0 | Nomor urut ekstraksi, bukan ID sumber. Tidak stabil antar-ekstraksi. |
| Nomor Surat Keputusan | teks | 0 | 9.915 nilai unik; 314 pola format (lihat 3.1). |
| Tanggal Surat Keputusan | tanggal | 0 | 2007-12-03 sampai 2029-10-06. |
| Nama Lembaga | teks | 138 | Kosong terutama pada HTR (121). Memuat nama orang pada izin HTR perorangan. 128 nilai memiliki spasi ganda. |
| Skema | teks | 0 | 7 kategori (lihat 5). |
| Bentuk Lembaga | teks | 1.886 | 11 kategori + kosong. Ejaan sumber `BADAN USAHA MIILIK DESA` (typo). 2.479 baris HTR berlabel `LEMBAGA PENGELOLA HUTAN DESA`, tidak sesuai skema. |
| Balai | teks | 0 | 13 BPS (Balai Perhutanan Sosial). Satu provinsi selalu satu balai. |
| Seksi Wilayah | teks | 0 | 29 nilai. |
| Region | teks | 0 | **Bukan dari GoKUPS.** Diturunkan oleh penyusun file dari provinsi (7 kelompok pulau). |
| Provinsi | teks | 0 | 37 nama, seragam (lihat 6). |
| Kabupaten Kota | teks | 0 | 407 nama, unik per provinsi. |
| Kecamatan | teks | 3.278 | 2.122 nama. Kosong terutama pada HTR (2.459). |
| Luas Area Hutan Lindung / Produksi / Produksi Konversi / Produksi Terbatas / Konservasi / Penggunaan Lain (Ha) | angka | 0 | Hanya 12 baris yang memiliki desimal. |
| Luas Area Keseluruhan (Ha) | int | 0 | Selalu bilangan bulat. |
| Anggota Laki-Laki / Perempuan / Keseluruhan | int | 0 | Lihat 4. |
| Ketua Lembaga | teks | 8.066 | Data pribadi. |
| Pra-Pendamping | teks | 9.911 | Data pribadi. 84 berisi literal `0`. |
| Pendamping | teks | 7.828 | Data pribadi. Menurut Catatan, kolom ini bisa kurang lengkap. |
| Kesatuan Pengelola Hutan | teks | 4.351 | `KPHP BENGKULU UTARA` muncul pada 452 baris di luar Provinsi Bengkulu. Catatan menyebut ini isian sumber GoKUPS. Tidak layak ditampilkan sebelum dikonfirmasi. |

Nilai `-` pada sumber sudah dikosongkan oleh penyusun file. Nilai `0` pada kolom angka **tidak bisa dibedakan** dari "tidak diisi". Ini penting untuk kolom anggota (lihat 4).

## 3. Nomor SK dan duplikasi

| Indikator | Nilai |
|-----------|------:|
| Baris | 10.061 |
| Nomor SK unik (teks mentah) | 9.915 |
| Nomor SK unik setelah huruf besar + hapus spasi | 9.903 |
| Kelompok nomor SK duplikat | 136 |
| Baris dalam kelompok duplikat | 282 |
| Baris berlebih | 146 |
| Ukuran kelompok | 132 × 2 baris, 2 × 3, 1 × 5, 1 × 7 |

Normalisasi spasi menambah 12 tabrakan baru (misalnya `SK. 2545/...` dan `SK.2545/...`). Beberapa pasangan ini jelas entitas yang sama dengan penulisan nama berbeda, sebagian lain jelas lembaga berbeda di provinsi berbeda. Artinya nomor SK ternormalisasi pun tidak bisa langsung dijadikan kunci penggabungan.

### 3.1 Klasifikasi 136 kelompok duplikat

| Kelas | Kelompok | Arti | Usulan perlakuan |
|-------|---------:|------|------------------|
| Identik penuh | 12 | Semua kolom selain `No` sama persis (12 baris berlebih, total 38.987 ha dan 1.417 anggota). Seluruhnya di Papua (Papua Tengah, Papua Selatan, Papua Barat Daya) dan Sulawesi Tenggara. | Simpan semua baris. Tandai baris kedua `duplicate_exact`. Keluarkan dari agregasi, dengan catatan metodologi. |
| Beda lembaga | 49 | Satu SK mencakup beberapa lembaga berbeda (contoh: satu SK Bali 2015 untuk 7 desa). | Bukan duplikat. Tetap dihitung. |
| Campuran | 75 | Nama lembaga mirip atau sama tetapi wilayah, tanggal, luas, atau anggota berbeda. Contoh: SK yang sama dengan luas 1.611 ha dan 1 ha. | Simpan, tandai `duplicate_review`. Butuh pemeriksaan manual per kasus. Sementara tetap dihitung, dengan catatan. |

Dalam kelompok duplikat: tanggal berbeda pada 14 kelompok, skema 13, provinsi 21, kabupaten 51, luas 42, anggota 54.

### 3.2 Format nomor SK

Ada 314 pola format setelah angka diganti simbol. Yang terbanyak:

| Pola | Baris |
|------|------:|
| `SK.n/MENLHK-PSKL/PKPS/PSL.n/n/n` | 3.873 |
| `n TAHUN n` | 1.792 |
| `SK. n/MENLHK-PSKL/PKPS/PSL.n/n/n` | 1.396 |
| `n.n/n/DISHUT` | 1.023 |
| `n.n TAHUN n` | 170 |

Pola lain banyak berasal dari izin yang diterbitkan pemerintah daerah sebelum 2016 (dinas kehutanan, BPMPT). 4 nomor SK berakhir `TAHUN 202` (tahun terpotong).

## 4. Anggota

| Indikator | Nilai |
|-----------|------:|
| Jumlah laki-laki | 1.211.968 |
| Jumlah perempuan | 76.974 |
| Jumlah kolom total | 1.227.046 |
| Laki-laki + perempuan | 1.288.942 |
| Baris konsisten (L + P = total) | 8.934 |
| Baris tidak konsisten | 1.127 |
| … di mana total = jumlah perempuan | **1.127 (semuanya)** |
| … di mana total > L + P | 0 |
| Baris anggota semua nol | 208 |
| Baris perempuan = 0 | 5.371 |
| Baris perempuan negatif | 1 (−3) |
| Baris total anggota ≤ 1 | 2.624 |

**Pola ketidaksesuaian.** Seluruh 1.127 baris yang tidak konsisten memiliki `Anggota Keseluruhan = Anggota Perempuan`. Sebarannya: SK 2023 (337), 2024 (616), 2025 (141), sisanya ≤ 13 per tahun. Skema: HKm 596, HD 515, KULIN KK 9, HTR 7. Ini pola sistematis, bukan salah ketik acak. Dugaan kuat: kolom total pada sumber terisi nilai perempuan untuk entri periode tertentu. Dugaan ini belum dibuktikan. Perlu dicek ke halaman detail GoKUPS untuk sampel SK di `docs/audit/members_mismatch.csv`.

**Perempuan = 0 menurut tahun SK.** 2007 sampai 2016: 96 sampai 100% baris. 2017 sampai 2021: 40 sampai 57%. 2022 sampai 2025: 10 sampai 16%. Data gender praktis tidak dicatat untuk SK lama.

**Usulan:**
- Indikator "jumlah anggota" hanya dihitung dari baris yang lolos aturan `L + P = total` dan tidak negatif, **atau** memakai `L + P` sebagai total untuk 1.127 baris tersebut. Keduanya keputusan metodologi yang perlu disetujui (lihat Pertanyaan Terbuka).
- Rincian laki-laki/perempuan tidak ditampilkan sebagai statistik nasional di MVP. Di halaman detail, rincian hanya ditampilkan bila konsisten, dengan catatan bahwa nol dapat berarti tidak tercatat.
- Label angka harus berbunyi "anggota tercatat", bukan "penerima manfaat".

## 5. Skema Perhutanan Sosial

| Nilai sumber | Baris | Usulan `scheme_normalized` | Catatan |
|--------------|------:|----------------------------|---------|
| HUTAN KEMASYARAKATAN | 3.907 | HKm | |
| HUTAN TANAMAN RAKYAT | 2.736 | HTR | 2.238 baris izin perorangan |
| HUTAN DESA | 2.464 | HD | |
| KEMITRAAN KEHUTANAN ~ KULIN KK | 641 | KK (subskema: Kulin KK) | |
| HUTAN ADAT | 173 | HA | Berupa penetapan status hutan adat, bukan persetujuan pengelolaan. Label "persetujuan" perlu dipertimbangkan untuk skema ini. |
| KEMITRAAN KEHUTANAN ~ KONSERVASI | 134 | KK (subskema: Kemitraan Konservasi) | Berada di kawasan konservasi |
| KEMITRAAN KEHUTANAN ~ IPHPS | 6 | KK (subskema: IPHPS) | Penempatan IPHPS di bawah KK mengikuti sumber; dasar hukumnya perlu dikonfirmasi |

Usulan: simpan `scheme_original` apa adanya, `scheme_normalized` lima skema (HD, HKm, HTR, HA, KK), dan `scheme_subtype` untuk tiga subskema KK. Aturan pemetaan dicatat di file konfigurasi pipeline dan di halaman Metodologi.

Median luas per skema berbeda jauh: HD 814,5 ha; HA 591; HKm 188; KULIN KK 142; Konservasi 81; IPHPS 74; HTR **4 ha**. Jumlah rekaman per skema tidak mencerminkan porsi luas.

## 6. Wilayah administratif

| Indikator | Nilai |
|-----------|------:|
| Nama provinsi berbeda | 37 (semua provinsi kecuali DKI Jakarta) |
| Nama kabupaten/kota berbeda | 407 |
| Pasangan provinsi + kabupaten/kota | 407 (tidak ada nama kabupaten yang sama di dua provinsi) |
| Nama kecamatan | 2.122 (3.278 baris kosong) |
| Cocok ke kode BIG/Kemendagri lewat normalisasi nama | 406 |
| Cocok lewat alias manual | 1 (`PANGKAJENE KEPULAUAN` → 73.10 Pangkajene dan Kepulauan) |
| Tidak cocok | 0 |
| Kode kabupaten/kota resmi tanpa rekaman | 107 dari 514 |

Konvensi sumber: nama tanpa awalan = kabupaten, `KOTA …` = kota. Pengecualian: `KOTA BARU` di Kalimantan Selatan adalah **Kabupaten Kotabaru** (kode 63.02), bukan kota. Variasi penulisan seperti `KEP. SIAU TAGULANDANG BIARO`, `PALANGKARAYA`, `BAU BAU`, `BANJAR BARU` tertangani normalisasi.

Usulan tabel pemetaan ada di `docs/audit/region_crosswalk_draft.csv`, dengan kolom `verified = false` untuk semua baris. Tabel ini perlu diperiksa manusia sebelum dipakai. Kode kecamatan belum dicocokkan. Ini tidak dibutuhkan MVP, karena peta berhenti di tingkat kabupaten/kota.

Rincian sumber batas wilayah dan kode resmi ada di `docs/MAP_DATA_AUDIT.md`.

## 7. Luas areal

| Indikator | Nilai |
|-----------|------:|
| Jumlah luas total | 6.892.023 ha |
| Jumlah komponen | 6.886.515,81 ha |
| Hutan Lindung | 2.856.009,22 ha |
| Hutan Produksi | 1.976.635,45 ha |
| Hutan Produksi Terbatas | 1.177.975 ha |
| Hutan Produksi Konversi | 596.870,99 ha |
| Hutan Konservasi | 253.991 ha |
| Areal Penggunaan Lain | 25.034,15 ha |
| Baris total = jumlah komponen (selisih < 1 ha) | 10.016 |
| Baris selisih ≥ 1 ha | 45 (26 di antaranya selisih 1 sampai 5 ha) |
| … total > komponen | 39 |
| … total < komponen | 6 |
| Luas total 0 | 64 (4 di antaranya komponennya > 0) |
| Luas total tepat 1 ha | 435 |
| Nilai negatif | 0 |

Luas total dibulatkan ke hektare penuh. Untuk HTR yang median luasnya 4 ha, pembulatan ini cukup berpengaruh pada tingkat baris, tetapi kecil pada agregat provinsi.

Usulan: luas valid jika `total > 0` dan `|total − komponen| ≤ 5 ha` (ambang perlu disetujui). Baris lain ditandai `area_review` dan dikeluarkan dari indikator luas, dengan catatan. Rincian per fungsi kawasan ditampilkan di halaman detail hanya jika konsisten.

## 8. Tanggal SK

| Indikator | Nilai |
|-----------|------:|
| Rentang | 2007-12-03 sampai 2029-10-06 |
| Setelah tanggal ekstraksi (2026-11-02) | 1 (`SK.10687/.../12/2023` bertanggal 2029-10-06) |
| Nomor SK dengan tahun terbaca | 8.813 |
| Tahun di nomor SK ≠ tahun tanggal SK | 325 |

Distribusi per tahun: puncak 2012 (1.508), 2018 (1.140), 2024 (1.112), 2019 (1.071). Tahun 2026 hanya 8 baris dan 2025 hanya 175. Cakupan tahun terakhir kemungkinan belum lengkap di sumber.

Selisih tahun pada 325 baris sebagian bisa wajar, misalnya SK perubahan atau penerbitan ulang dengan nomor baru dan tanggal lama. Sebagian lain jelas salah, misalnya SK bernomor tahun 2021 bertanggal April 2026. Usulan: tanggal tetap ditampilkan apa adanya, baris yang tahunnya berselisih diberi tanda `date_review`, dan tanggal di masa depan dikeluarkan dari filter tahun.

## 9. Data pribadi dan kelayakan publikasi

| Kolom | Isi | Usulan MVP |
|-------|-----|-----------|
| Ketua Lembaga | Nama orang (1.995 terisi) | Tidak dipublikasikan |
| Pra-Pendamping, Pendamping | Nama orang | Tidak dipublikasikan |
| Sheet `Pendamping` | Nama, SK pendamping; 1 baris berisi angka mirip nomor telepon di kolom nama | Tidak dipublikasikan, tidak diimpor ke basis data publik |
| Nama Lembaga (HTR perorangan) | Nama orang + nama kelompok | Disamarkan, misalnya hanya nama kelompok di dalam kurung, atau "Izin perorangan". Perlu keputusan. |
| Nama Lembaga (lainnya) | Nama kelompok/lembaga/desa | Dapat ditampilkan |
| Kesatuan Pengelola Hutan | Isian sumber diragukan | Tidak ditampilkan sampai dikonfirmasi |
| Region | Turunan penyusun file | Tidak dipakai; region dihitung ulang dari kode provinsi bila diperlukan |

## 10. Unit analisis

Dataset ini tidak menghitung "kelompok". Satu baris adalah satu entri persetujuan pada tabular GoKUPS. Entri itu bisa berupa satu lembaga, satu desa, atau satu individu pemegang izin HTR. Satu nomor SK bisa mencakup beberapa entri.

Usulan label publik:
- **Rekaman persetujuan**: jumlah baris yang lolos pemeriksaan (unit utama).
- **Nomor SK unik**: ditampilkan di halaman Metodologi saja, sebagai pembanding.
- Istilah "kelompok" tidak dipakai di kartu statistik.

## 11. Rekonsiliasi dengan angka GoKUPS

Menurut sheet Catatan, tabel Capaian Perhutanan Sosial di beranda GoKUPS (diambil 2026-11-04) mencatat 11.352 lembaga, 8.466.568 ha, dan 1.438.244 anggota. Sheet 1 berisi 10.061 SK, 6.892.023 ha, dan 1.227.046 anggota. Selisih per provinsi tidak seragam:

- Lebih banyak di beranda: Jawa Tengah (+323), Jawa Barat (+105), Sulawesi Utara (+102), Lampung (+98).
- Lebih banyak di sheet: Papua Tengah (−15), Papua Selatan (−13), Papua Pegunungan (−7), Bangka Belitung (−6), Bali (−5).
- Luas sangat berbeda: Bali 252.050 ha vs 29.805 ha; Kalimantan Utara 603.648 vs 127.617; Sulawesi Selatan 462.332 vs 233.503.
- DKI Jakarta: 2 lembaga di beranda, 0 di sheet.

GoKUPS tidak menjelaskan penyebab selisih ini. PDPSI sebaiknya tidak mengklaim angkanya sama dengan beranda GoKUPS. Halaman Metodologi perlu menyebut bahwa angka berasal dari tabular, menyertakan tanggal ekstraksi, dan menjelaskan selisih ini secara terbuka.

## 12. Usulan aturan kualitas per baris

Setiap baris di `approvals` mendapat bendera berikut. Indikator hanya memakai baris yang lolos bendera terkait.

| Bendera | Kondisi | Indikator terdampak |
|---------|---------|---------------------|
| `duplicate_exact` | Baris kedua dan seterusnya dalam kelompok identik penuh | Semua (dikeluarkan) |
| `duplicate_review` | Kelompok SK duplikat kelas campuran | Tidak ada (tetap dihitung, diberi catatan) |
| `area_review` | Luas total 0, atau selisih dengan komponen > ambang | Luas |
| `members_review` | L + P ≠ total, atau ada nilai negatif | Anggota |
| `date_review` | Tanggal setelah tanggal ekstraksi, atau tahun nomor SK ≠ tahun tanggal | Filter tahun (hanya tanggal masa depan yang dikeluarkan) |
| `person_name` | Nama lembaga memuat nama perorangan | Tampilan nama |
| `region_unverified` | Kode wilayah belum diverifikasi | Peta (ditampilkan dengan catatan sampai crosswalk diverifikasi) |

Semua bendera dan alasan pengecualian dihitung ulang setiap impor, sehingga tidak ada perubahan manual pada data sumber.
