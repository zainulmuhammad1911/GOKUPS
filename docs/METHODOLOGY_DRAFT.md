# Draf Metodologi PDPSI (bahan halaman Tentang Data)

**Catatan 2026-11-05:** teks final untuk publik kini ada di halaman Tentang (`src/app/[locale]/about/page.tsx`, teks di `src/messages/*.json`), dengan angka yang dihitung langsung dari rilis aktif. Dokumen ini tetap menjadi catatan teknis.

**Status:** draf isi teknis untuk rilis `2026-11-02.r5` (draf, bukan rilis publik final). Ini bahan, bukan teks final. Teks antarmuka disusun di Tahap 6 dengan `/antislop` dan disunting dengan `/humanizer` tanpa mengubah angka atau definisi. Bagian bertanda **[Belum ditetapkan]** menunggu keputusan di `docs/DECISIONS.md`.

## Prinsip: kesetiaan pada sumber
PDPSI menyajikan data sebagaimana tercatat di sumber. Nilai sumber tidak diperbaiki, direkonstruksi, diestimasi, atau diubah. Nama, angka, tanggal, dan luas ditampilkan apa adanya, termasuk ejaan dan spasi. Kosong ditampilkan sebagai "tidak tersedia", tidak diganti 0. Ketidaksesuaian data ditandai dan diberi catatan, tidak dihapus atau disembunyikan.

Setiap rekaman di PDPSI terdiri dari tiga bagian yang dipisahkan dengan jelas:
- **Data sumber**: kolom workbook dengan nama kolom asli dan nilai apa adanya.
- **Hasil pengolahan PDPSI**: kode wilayah resmi, kode skema, tahun SK, dan hasil penjumlahan anggota laki-laki + perempuan.
- **Hasil pemeriksaan PDPSI**: penanda ketidaksesuaian dan referensi rekaman bernomor SK sama.

## Sumber data
- Tabular Perhutanan Sosial dan halaman detail tiap SK di GoKUPS (https://gokups.hutsos.kehutanan.go.id), diambil 2 November 2026 pukul 04.52 UTC.
- Jumlah SK yang dilaporkan GoKUPS saat pengambilan: 10.061. Jumlah baris yang diambil: 10.061.
- PDPSI tidak terhubung langsung ke GoKUPS. Data diperbarui dengan impor terkontrol oleh pengelola.

## Data yang tidak dipublikasikan
Data publik PDPSI **bukan salinan mentah sepenuhnya**. Semua kolom tabular GoKUPS ditampilkan apa adanya, termasuk nama di kolom Ketua Lembaga, Pra-Pendamping, Pendamping, dan Nama Lembaga, atas keputusan pemilik produk karena nama-nama ini juga disajikan publik di situs GoKUPS (K11, rilis 2026-11-02.r7). Sheet daftar pendamping di workbook tidak dipakai.

Nama Lembaga pada sekitar 2.000 rekaman Hutan Tanaman Rakyat berisi nama orang pemegang izin, ditampilkan sesuai sumber (keputusan K3). **[Belum ditetapkan: dasar hukum publikasi dan kontak pengelola untuk permintaan koreksi, K9]**

## Unit analisis
Satu rekaman adalah satu baris pada tabular GoKUPS: satu persetujuan Perhutanan Sosial atau satu penetapan Hutan Adat. Satu rekaman bisa berupa satu lembaga, satu desa, atau satu pemegang izin perorangan. PDPSI menghitung **rekaman persetujuan/penetapan**, bukan jumlah kelompok atau lembaga.

## Kategori skema
Tujuh kategori di sumber ditampilkan dan dihitung terpisah, tanpa digabung:

| Kategori sumber | Rekaman |
|-----------------|--------:|
| HUTAN KEMASYARAKATAN | 3.907 |
| HUTAN TANAMAN RAKYAT | 2.736 |
| HUTAN DESA | 2.464 |
| KEMITRAAN KEHUTANAN ~ KULIN KK | 641 |
| HUTAN ADAT (penetapan) | 173 |
| KEMITRAAN KEHUTANAN ~ KONSERVASI | 134 |
| KEMITRAAN KEHUTANAN ~ IPHPS | 6 |

## Rekapitulasi per provinsi, kabupaten/kota, dan jenis PS
Rekap utama PDPSI adalah jumlah rekaman SK penerima persetujuan/penetapan dan luasnya, per provinsi, per kabupaten/kota, dan per jenis PS. Jenis PS yang dipakai adalah Hutan Desa, Hutan Kemasyarakatan, Hutan Tanaman Rakyat, Hutan Adat, dan Kemitraan Kehutanan.

Angka Kemitraan Kehutanan adalah jumlah tiga subskema yang di sumber berlabel "KEMITRAAN KEHUTANAN ~" (Kulin KK, Konservasi, IPHPS). Rincian ketiganya selalu ditampilkan.

| Jenis PS | Rekaman | Luas (ha) |
|----------|--------:|----------:|
| Hutan Desa | 2.464 | 4.253.888 |
| Hutan Kemasyarakatan | 3.907 | 1.479.288 |
| Hutan Tanaman Rakyat | 2.736 | 345.874 |
| Hutan Adat (penetapan) | 173 | 363.127 |
| Kemitraan Kehutanan | 781 | 449.846 |
| rincian: Kulin KK | 641 | 229.592 |
| rincian: Konservasi | 134 | 218.274 |
| rincian: IPHPS | 6 | 1.980 |
| **Total** | **10.061** | **6.892.023** |

Unit rekap adalah rekaman SK, bukan jumlah kelompok. Sekitar 2.000 rekaman HTR adalah izin perorangan, dan 240 nama lembaga tercatat pada lebih dari satu nomor SK. File rekap: `pdpsi_<versi>_rekap_jenis_ps.xlsx` (lembar Rekap Nasional, Rekap Provinsi, Rekap Kabupaten-Kota dengan subtotal provinsi, Data Panjang, dan Catatan) dan versi CSV format panjang.

## Wilayah
Nama provinsi dan kabupaten/kota sumber ditampilkan apa adanya. Sebagai hasil pengolahan, setiap nama dicocokkan ke kode resmi Kepmendagri No. 300.2.2-2138 Tahun 2025. Ke-407 pasangan provinsi + kabupaten/kota cocok, dan kodenya sama dengan data wilayah BIG edisi 2023. Pemeriksaan manual atas pencocokan ini belum dilakukan. **[K7]** Kecamatan ditampilkan sebagai teks sumber dan belum dicocokkan ke kode resmi.

## Angka agregat
Semua angka agregat adalah **hasil pengolahan PDPSI dari data sumber, bukan angka resmi nasional**. Setiap angka bisa diulang dengan memfilter rekaman di halaman Data atau di file unduhan.

| Angka | Cara hitung | Rilis 2026-11-02.r5 |
|-------|-------------|---------------------|
| Jumlah rekaman | Semua rekaman, termasuk rekaman bernomor SK sama | 10.061 |
| Luas (ha) | Jumlah kolom sumber Luas Area Keseluruhan (Ha) pada rekaman yang nilainya tersedia dan tidak negatif | 6.892.023 ha dari 10.061 rekaman |
| Anggota laki-laki + perempuan | Jumlah (laki-laki + perempuan) pada rekaman yang kedua nilainya tersedia dan tidak negatif, termasuk yang hasilnya 0 | 1.288.574 dari 10.060 rekaman; 1 rekaman tidak dapat dihitung karena ada nilai negatif |
| … laki-laki | Jumlah kolom sumber Anggota Laki-Laki pada rekaman yang sama dengan baris di atas | 1.211.597 |
| … perempuan | Jumlah kolom sumber Anggota Perempuan pada rekaman yang sama | 76.977; 5.371 rekaman bernilai 0 |
| Pembanding: kolom sumber Anggota Keseluruhan | Jumlah kolom apa adanya | 1.227.046 |

Kolom Anggota Keseluruhan dari sumber tetap ditampilkan tetapi tidak dipakai untuk menghitung anggota. Pada 1.127 rekaman, nilainya sama dengan jumlah anggota perempuan, bukan jumlah laki-laki + perempuan. Kedua angka ditampilkan berdampingan agar perbedaannya terlihat.

Laki-laki dan perempuan dijumlahkan dari rekaman yang sama dengan anggota L+P, sehingga keduanya selalu berjumlah sama dengan anggota L+P (K2). Anggota perempuan bernilai 0 pada 53% rekaman, termasuk hampir semua SK sebelum 2017. Sumber tidak membedakan 0 dari tidak dicatat, jadi jumlah perempuan kemungkinan lebih rendah dari keadaan sebenarnya. PDPSI menampilkan nilai apa adanya, menyertakan catatan ini dan jumlah rekaman yang mencatat perempuan 0 di setiap rincian, dan tidak menghitung rasio atau persentase perempuan.

**Filter anggota tercatat.** Halaman Data dan Statistik bisa disaring menurut jumlah anggota laki-laki + perempuan: 1 orang, 2 orang atau lebih, 0 orang, atau tidak dapat dihitung. Pilihan "1 orang" dipakai untuk melihat rekaman yang kemungkinan izin perorangan (2.168 rekaman, 2.167 di antaranya HTR). Ini hasil pengolahan, bukan status resmi; sumber hanya menandai 58 rekaman sebagai "PERORANGAN" di kolom Bentuk Lembaga.

**Filter pendamping.** Rekaman bisa disaring menurut ada atau tidaknya isi kolom Pendamping di sumber (2.233 terisi, 7.828 kosong). Nama pendamping tampil di halaman detail dan unduhan; kolom kosong bisa berarti tidak ada pendamping atau tidak dicatat (K11).

## Penanda ketidaksesuaian
Penanda tidak mengubah nilai dan tidak mengeluarkan rekaman dari perhitungan.
- **Luas:** selisih luas total dengan jumlah komponen luas lebih dari 5 ha (19 rekaman), selisih 1 sampai 5 ha (26), luas total 0 (64).
- **Anggota:** kolom total sumber tidak sama dengan laki-laki + perempuan (1.127), nilai negatif (1).
- **Tanggal:** tanggal SK sesudah tanggal pengambilan data (1, tahun 2029); tahun di nomor SK berbeda dengan tahun tanggal SK (325); tahun di nomor SK tertulis 3 digit (4).
- **Atribut lain:** bentuk lembaga Lembaga Pengelola Hutan Desa pada skema Hutan Tanaman Rakyat (2.479); KPH tercatat KPHP Bengkulu Utara pada rekaman di luar Bengkulu (452).

## Rekaman dengan nomor SK sama
Tidak ada rekaman yang dihapus atau digabung. 136 nomor SK dipakai lebih dari satu rekaman (282 rekaman). Setiap rekaman tersebut diberi label **Duplikat**, berisi jumlah rekaman bernomor SK sama dan tautan ke semua rekaman terkait. Rekaman dibedakan menjadi:
- **identik** (24 rekaman): semua kolom sumber selain nomor baris sama dengan rekaman lain;
- **atribut berbeda** (258 rekaman): nomor SK sama, isi kolom lain berbeda.

Ada 12 kelompok nomor SK yang hanya berbeda spasi atau huruf besar/kecil. PDPSI tidak menganggapnya sama; rekamannya diberi catatan dan tautan.

## Keterbatasan
- Angka PDPSI berbeda dari angka capaian di beranda GoKUPS (11.352 lembaga, 8.466.568 ha pada 4 November 2026). GoKUPS tidak menjelaskan penyebab selisih tersebut.
- Luas di sumber dibulatkan ke hektare penuh.
- Rekaman SK tahun 2025 dan 2026 kemungkinan belum lengkap di sumber.
- Kolom Region di workbook bukan field GoKUPS, tetapi diturunkan penyusun workbook dari provinsi.

## Lisensi dan pengelola
**[Belum ditetapkan: K9]**
