# Catatan Keputusan PDPSI

Dokumen ini mencatat keputusan produk dan data beserta statusnya. Perubahan keputusan dicatat di log (bagian 5); keputusan lama tidak dihapus dari log.

**Status:**
- **Ditetapkan**: sudah diputuskan pemilik produk.
- **Sebagian**: prinsipnya ditetapkan, tetapi sebagian isinya masih menunggu.
- **Menunggu**: belum diputuskan. Pipeline memakai nilai bawaan yang tercatat di sini dan bisa diubah lewat konfigurasi.

---

## 1. Prinsip permanen: Source Fidelity & Data Transparency

Ditetapkan pemilik produk pada 2026-11-04. Prinsip ini berlaku untuk semua tahap, mengalahkan aturan teknis lain, dan juga dicantumkan di `PRD_PDPSI.md` §1.1.

PDPSI menyajikan data sesuai sumber yang tersedia. Setiap informasi harus bisa ditelusuri ke data sumber. Nilai sumber tidak boleh diperbaiki, direkonstruksi, diestimasi, atau diubah diam-diam.

1. Seluruh nilai asli workbook dipertahankan.
2. Nama, angka, tanggal, luas, dan atribut lain tidak dikoreksi otomatis.
3. Data kosong tidak diisi dengan perkiraan.
4. Nilai 0 dibedakan dari data kosong.
5. Rekaman duplikat tidak dihapus.
6. Kategori yang berbeda tidak digabungkan.
7. Ketidaksesuaian data tidak disembunyikan.
8. Koordinat kelompok yang tidak tersedia tidak dibuat.
9. Hasil agregasi diberi label sebagai hasil pengolahan dari data sumber.
10. Setiap hasil agregasi bisa ditelusuri ke rekaman pembentuknya.

Jika data tidak tersedia, katakan tidak tersedia. Jika data tidak konsisten, tampilkan nilainya dan beri catatan.

**Penerapan di pipeline dan aplikasi:**
- Kolom sumber disimpan apa adanya di objek `source` setiap rekaman, dengan nama kolom asli. Spasi ganda, ejaan, dan format nomor SK tidak diubah.
- Semua hasil pengolahan (kode wilayah resmi, kode skema, L+P, tahun, bendera kualitas) disimpan terpisah di `derived` dan `quality`, dan diberi label "olahan PDPSI".
- Agregat dihitung dari rekaman dengan aturan tertulis (`control_totals.json` → `definitions`). Setiap angka agregat bisa diulang dengan memfilter `approvals.json` atau halaman Data dengan kunci yang sama.

**Kolom yang tidak dipublikasikan.** Data publik **bukan** salinan mentah sepenuhnya. Kolom berikut dikecualikan:

| Kolom | Alasan | Cakupan |
|-------|--------|---------|
| Ketua Lembaga | Nama orang; PRD §6.5 meminta tidak ditampilkan secara default sampai ada pemeriksaan dasar hukum, tujuan, dan risiko privasi | Semua rekaman |
| Pra-Pendamping | Sama | Semua rekaman |
| Pendamping | Sama | Semua rekaman |
| Sheet `Pendamping` | Daftar nama orang dan SK pendamping | Seluruh sheet |

Kolom ini tetap tersimpan di `internal/source_records.jsonl` (tidak dipublikasikan, tidak masuk git) dan bisa dipublikasikan bila penilaian kelayakan publikasi menyetujuinya.

## 2. Daftar K1 sampai K10

### K1. Perhitungan anggota
- **Status:** Ditetapkan (dikoreksi 2026-11-04, keputusan B)
- **Aturan:**
  - Laki-laki dan perempuan tersedia dan tidak negatif → hitung laki-laki + perempuan, **termasuk bila hasilnya 0**.
  - Salah satu komponen kosong → hasil perhitungan "tidak tersedia".
  - Ada nilai negatif → ditandai anomali (`members_negative`) dan tidak masuk agregasi.
  - Kolom `Anggota Keseluruhan` tetap tampil sebagai data sumber dan tidak diganti hasil penjumlahan.
- **Yang selalu dibedakan dalam tampilan dan unduhan:**
  1. Anggota Keseluruhan (data sumber).
  2. Hasil perhitungan laki-laki + perempuan (olahan PDPSI).
  3. Jumlah rekaman yang dapat dipakai untuk perhitungan.
  4. Jumlah rekaman yang tidak dapat dipakai, beserta alasannya.
- **Label:** hasil perhitungan tidak disebut "total resmi nasional". Labelnya "jumlah anggota laki-laki + perempuan tercatat (hasil pengolahan PDPSI)".
- **Catatan:** Pada 1.127 rekaman, nilai `Anggota Keseluruhan` sama dengan nilai anggota perempuan. Ini ditampilkan sebagai catatan (`members_total_column_mismatch`), bukan diperbaiki.

### K2. Statistik gender
- **Status:** Ditetapkan (2026-11-05, persetujuan umum pemilik produk atas rekomendasi)
- **Keputusan:** MVP tidak menampilkan statistik atau rasio gender agregat. Nilai laki-laki dan perempuan tetap ditampilkan per rekaman sebagai nilai sumber, dan ikut dalam unduhan. Alasan: anggota perempuan bernilai 0 pada 53% rekaman (hampir semua SK sebelum 2017), yang kemungkinan berarti tidak dicatat.

### K3. Nama lembaga dan pemegang izin HTR
- **Status:** Ditetapkan (dikoreksi 2026-11-04, keputusan E). Menggantikan aturan penyamaran sebelumnya.
- **Aturan:** Semua nama dipertahankan sebagaimana tercatat di sumber, termasuk nama pemegang izin HTR perorangan. Nama tidak disamarkan, tidak diganti inisial atau label lain, dan tidak diubah. Tidak ada pengecualian berdasarkan asumsi sistem.
- **Konsekuensi:** Sekitar 2.000 rekaman HTR menampilkan nama orang (pola `NAMA (KELOMPOK)`) di kolom Nama Lembaga. Keputusan ini adalah keputusan pemilik produk. Dasar hukum dan pertimbangan perlindungan data pribadi untuk kolom ini perlu dicatat di halaman Metodologi sebelum publikasi (lihat K9). Kolom Ketua, Pra-Pendamping, dan Pendamping tetap tidak dipublikasikan (bagian 1).

### K4. Rekaman dengan nomor SK sama
- **Status:** Ditetapkan (keputusan C)
- **Aturan:** Semua rekaman dipertahankan dan dihitung. Setiap rekaman yang nomor SK-nya (teks persis sama) dipakai rekaman lain diberi penanda **Duplikat**, berisi:
  - nomor SK yang sama,
  - jumlah rekaman dengan nomor SK itu,
  - ID dan tautan ke **semua** rekaman lain dengan nomor SK itu,
  - tipe: `identik` (semua kolom sumber selain No sama dengan rekaman lain dalam kelompok) atau `atribut_berbeda`.
- Nomor SK yang hanya berbeda spasi atau huruf besar/kecil (12 kelompok) tidak dianggap sama. Rekaman itu diberi catatan terpisah, "kemungkinan nomor SK sama, beda penulisan", dengan tautan ke rekaman terkait.
- **ID rekaman:** hash dari isi rekaman (nomor SK, kode kabupaten/kota, tanggal, nama lembaga, kecamatan), bukan dari urutan baris Excel. Baris yang identik penuh tidak bisa dibedakan dari isinya, sehingga diberi akhiran `-2`, `-3` menurut urutan kemunculan. Menukar dua baris identik tidak mengubah isi data yang tampil.
- Penanda duplikat adalah metadata hasil pemeriksaan sistem dan tidak mengubah isi data sumber.

### K5. Anomali luas
- **Status:** Ditetapkan (keputusan D)
- **Aturan:** Selisih |luas total − jumlah komponen| > 5 ha hanya menjadi penanda (`area_component_mismatch`). Selisih 1 sampai 5 ha diberi penanda pembulatan (`area_component_rounding`). Luas total 0 diberi penanda `area_zero`. **Tidak ada rekaman yang dikeluarkan** dari statistik luas karena penanda ini. Luas sumber tidak diubah.
- Indikator luas = jumlah `Luas Area Keseluruhan (Ha)` sumber pada semua rekaman yang nilainya tersedia.

### K6. Sumber dan lisensi batas wilayah
- **Status:** Ditetapkan (2026-11-05) dengan jalur alternatif, sesuai keputusan C5.
- Lisensi geometri BIG **tetap belum terkonfirmasi**, jadi geometri BIG tidak dipakai dan tidak didistribusikan.
- Peta memakai batas kabupaten/kota **BPS (lewat OCHA ROAP/HDX, versi geoBoundaries gbOpen IDN ADM2, commit 9469f09)** dengan lisensi **CC BY 3.0 IGO**, yang mengizinkan redistribusi dengan atribusi. Batasnya mewakili tahun 2020 (34 provinsi). Setiap kabupaten/kota diberi kode Kepmendagri 2025, lalu batas provinsi dibentuk dengan menggabungkan kabupaten/kota menurut kode tersebut, sehingga peta memakai 38 provinsi.
- 11 nama dicocokkan lewat alias (kabupaten yang berganti nama, misalnya Toba Samosir menjadi Toba, Mamuju Utara menjadi Pasangkayu, Maluku Tenggara Barat menjadi Kepulauan Tanimbar). 5 fitur bukan wilayah administratif (danau, waduk, hutan) tidak digambar. Rincian: `data/config/geo_aliases.csv` dan `public/geo/<versi>/boundary_release.json`.
- Atribusi wajib tampil di peta dan di halaman Tentang. Batas bersifat indikatif untuk visualisasi statistik, bukan rujukan batas hukum.
- Bila lisensi BIG kelak terkonfirmasi, sumber batas bisa diganti tanpa mengubah data rilis.

### K7. Verifikasi kode wilayah
- **Status:** Sebagian. Kode resmi Kepmendagri 300.2.2-2138/2025 sebagai identitas administratif ditetapkan. Pemeriksa manusia belum ditunjuk.
- 407/407 pasangan provinsi + kabupaten/kota cocok; kode identik dengan atribut BIG 2023. Nama wilayah sumber tetap ditampilkan; nama dan kode resmi adalah kolom olahan terpisah.

### K8. Kategori skema dan jenis PS
- **Status:** Ditetapkan (keputusan A2; diubah 2026-11-05 atas persetujuan pemilik produk)
- **Tujuh kategori sumber** tetap disimpan dan ditampilkan apa adanya: Hutan Kemasyarakatan, Hutan Tanaman Rakyat, Hutan Desa, Kemitraan Kehutanan ~ Kulin KK, Kemitraan Kehutanan ~ Konservasi, Kemitraan Kehutanan ~ IPHPS, Hutan Adat.
- **Rekapitulasi memakai 5 jenis PS** sesuai instruksi rekap (provinsi, kabupaten/kota, jenis PS): Hutan Desa, Hutan Kemasyarakatan, Hutan Tanaman Rakyat, Hutan Adat, Kemitraan Kehutanan.
- **Kemitraan Kehutanan** = jumlah tiga subskema yang di sumber sendiri tertulis berawalan "KEMITRAAN KEHUTANAN ~". Pengelompokan ini mengikuti label sumber, bukan asumsi sistem. **Rincian tiga subskema selalu ditampilkan** di setiap rekap yang memuat angka Kemitraan Kehutanan.
- Hutan Adat diberi jenis rekaman **penetapan**; yang lain **persetujuan**. Label rekap: "persetujuan/penetapan".
- **Unit rekap:** jumlah rekaman SK penerima persetujuan/penetapan, bukan jumlah kelompok. Sekitar 2.000 rekaman HTR adalah izin perorangan, dan 240 nama lembaga muncul pada lebih dari satu nomor SK. Hal ini dicatat di setiap rekap.

### K9. Identitas institusi, logo, kontak, atribusi, lisensi data
- **Status:** Menunggu. Persetujuan umum pemilik produk (2026-11-05) tidak bisa mengisi nama institusi, kontak, atau lisensi data, karena nilai-nilai ini harus berasal dari institusi pengelola; mengarangnya melanggar keputusan G.
- Semua nilai dibaca dari `config/site.json`. Nilai `null` tampil sebagai "Belum ditetapkan". Rilis berstatus `draft` dan tidak boleh diterbitkan sebagai rilis publik final sampai K9 terisi.

### K10. Git dan repositori
- **Status:** Sebagian. Repositori lokal + `.gitignore` sudah ada. Commit dan remote belum dibuat.

## 3. Keputusan desain (keputusan F)

- Swiss minimal dan editorial; hijau kehutanan, putih hangat, abu-abu netral; Atkinson Hyperlegible Next; mode terang saja untuk MVP; label, legenda, dan tabel untuk membantu pembacaan grafik; bukan tampilan dashboard generik; peta interaktif sebagai fitur utama.
- "Indonesian Social Forestry Data Center" dipakai sebagai **terjemahan kerja**, bukan nama resmi institusi.
- `/antislop` mode *during*.

## 4. Ringkasan status

| Kode | Status |
|------|--------|
| K1 | Ditetapkan |
| K2 | Ditetapkan |
| K3 | Ditetapkan |
| K4 | Ditetapkan |
| K5 | Ditetapkan |
| K6 | Ditetapkan (sumber alternatif) |
| K7 | Sebagian |
| K8 | Ditetapkan (diubah 2026-11-05) |
| K9 | Menunggu |
| K10 | Sebagian |

## 5. Log perubahan

| Tanggal | Perubahan |
|---------|-----------|
| 2026-11-04 | Keputusan awal A–E dicatat; status K1 sampai K10 pertama. |
| 2026-11-04 | K3 (versi awal): aturan penyamaran nama HTR dengan pengecualian penanda kelompok. K7: crosswalk final dari Kepmendagri 2025. |
| 2026-11-04 | **Konsolidasi sebelum Tahap 2.** Prinsip Source Fidelity & Data Transparency ditetapkan. K1 dikoreksi: L+P dihitung termasuk bila 0. K3 diganti: tidak ada penyamaran nama. K4 ditetapkan: semua dihitung, penanda Duplikat dengan referensi. K5 ditetapkan: ambang hanya penanda. K8 ditetapkan: 7 kategori sumber tidak digabung. Nilai sumber mentah dipertahankan (tanpa perapian spasi atau koreksi ejaan). KPH dan Region dipublikasikan dengan catatan. Rilis `2026-11-02` (draf pertama, dengan penyamaran) digantikan rilis `2026-11-02.r2`. |
| 2026-11-05 | **K8 diubah.** Instruksi rekap: rekapitulasi penerima persetujuan PS per provinsi, kabupaten/kota, dan jenis PS (HD, HKm, HTR, HA, KK). Kemitraan Kehutanan ditampilkan sebagai satu jenis PS dengan rincian 3 subskema yang selalu terlihat. Tujuh kategori sumber tetap disimpan. Rilis `2026-11-02.r3` menambahkan rekap ini. |
| 2026-11-05 | Pemilik produk memberi persetujuan umum atas semua rekomendasi. **K2** ditetapkan (tanpa statistik gender di MVP). **K6** ditetapkan lewat sumber alternatif berlisensi jelas (BPS/OCHA, geoBoundaries, CC BY 3.0 IGO); BIG tidak dipakai. K7, K9, K10 tetap menunggu karena butuh tindakan atau informasi dari pihak lain. Rilis draf `2026-11-02` dan `2026-11-02.r2` dihapus dari working tree (masih ada di riwayat git). |
