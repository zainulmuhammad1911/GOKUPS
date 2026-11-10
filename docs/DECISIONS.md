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

**Kolom yang dipublikasikan.** Sejak rilis `2026-11-02.r7` **semua kolom tabular GoKUPS dipublikasikan apa adanya**, termasuk nama orang di kolom Ketua Lembaga, Pra-Pendamping, dan Pendamping (K11). Pemilik produk menilai nama-nama ini layak ditampilkan karena juga disajikan publik di situs GoKUPS. Ini menggantikan pengecualian awal berdasarkan PRD §6.5. Riwayat: r1–r5 mengecualikan ketiga kolom; r6 menerbitkan Pendamping; r7 menerbitkan Ketua Lembaga dan Pra-Pendamping.

Yang tetap tidak dipakai: sheet `Pendamping` di workbook (daftar nama dan SK pendamping), karena pipeline hanya membaca sheet tabular. Mekanisme pengecualian kolom (`PRIVATE_COLUMNS` di `pipeline/pdpsi_pipeline/ingest.py`) dipertahankan dalam keadaan kosong, sehingga kolom bisa dikecualikan lagi bila institusi pengelola memutuskan lain. Salinan baris mentah tetap ada di `internal/source_records.jsonl` (tidak masuk git).

Di unduhan CSV, teks yang diawali `=`, `+`, `-`, atau `@` diberi awalan `'` agar tidak dijalankan sebagai rumus oleh aplikasi spreadsheet (10 nilai Ketua Lembaga berawalan "-"); jumlahnya disebut di `BACA_SAYA.txt`. Nilai asli tetap utuh di `approvals.json` dan XLSX.

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

### K2. Rincian anggota laki-laki dan perempuan
- **Status:** Ditetapkan (2026-11-05, persetujuan umum pemilik produk atas rekomendasi)
- **Keputusan (diubah 2026-11-06 atas permintaan pemilik produk):** setiap angka anggota L+P disertai rinciannya, yaitu jumlah laki-laki dan jumlah perempuan, di Beranda, Statistik (rekap per jenis PS dan tabel per wilayah), Data, Peta, Tentang, unduhan ringkasan, dan file rekap.
- **Aturan hitung:** laki-laki dan perempuan dijumlahkan dari kolom sumber `Anggota Laki-Laki` dan `Anggota Perempuan` pada rekaman yang sama dengan anggota L+P (K1: kedua nilai tersedia dan tidak negatif, termasuk 0). Karena itu laki-laki + perempuan selalu sama dengan anggota L+P. Tidak ada nilai yang dikoreksi atau diisi perkiraan.
- **Transparansi:** anggota perempuan bernilai 0 pada 5.371 dari 10.060 rekaman yang dihitung (53%), hampir semuanya SK sebelum 2017. Sumber tidak membedakan 0 dari tidak dicatat. Setiap rincian disertai catatan ini dan jumlah rekaman yang mencatat perempuan 0 (`members_female_zero_records`), sehingga pembaca bisa menilai sendiri. Rasio atau persentase perempuan tidak dihitung oleh PDPSI.
- **Keputusan sebelumnya (2026-11-05):** tidak ada statistik gender agregat di MVP. Diganti oleh keputusan di atas.

### K11. Kolom nama orang (Ketua Lembaga, Pra-Pendamping, Pendamping) dan filter pendamping
- **Status:** Ditetapkan 2026-11-06, diubah dua kali pada hari yang sama atas keputusan pemilik produk.
- **Keputusan (berlaku, rilis r7):** kolom `Ketua Lembaga`, `Pra-Pendamping`, dan `Pendamping` dipublikasikan apa adanya (halaman detail rekaman, pencarian untuk Ketua Lembaga dan Pendamping, unduhan), karena nama-nama ini juga disajikan publik di situs GoKUPS. Penilaian kelayakan ini dibuat pemilik produk; konfirmasi institusi pengelola terhadap UU No. 27/2022 tentang Pelindungan Data Pribadi tetap disarankan sebelum rilis publik final (K9).
- **Filter pendamping:** turunan `derived.pendamping_status` (`tercatat`/`kosong`) dipakai filter Pendamping di Data, Statistik, Peta, dan unduhan, serta `pendamping_recorded_records` di total kontrol dan ringkasan. Pra-Pendamping tidak dipakai untuk filter (150 terisi, 84 bernilai "0").
- **Riwayat:** r5 menerbitkan status tercatat/kosong saja; r6 menerbitkan nama pendamping; r7 menerbitkan nama ketua lembaga dan pra-pendamping.
- **Cakupan (r7):** Ketua Lembaga terisi 1.995 rekaman, Pra-Pendamping 150, Pendamping 2.233.
- **Batasan yang ditampilkan:** kolom kosong bisa berarti tidak ada atau tidak dicatat.

### K12. Direktori OMS pendamping (sumber kedua)
- **Status:** Ditetapkan 2026-11-10 atas keputusan pemilik produk.
- **Sumber:** direktori OMS pendamping PS milik pemilik produk (per 6 November 2026, 67 entri), diperiksa daring pada 10 November 2026 dengan bantuan AI. Hasil pemeriksaan ada di workbook verifikasi (`data/source/oms/`, tidak masuk git). Workbook asli tidak diubah.
- **Yang terbit:** hanya entri berstatus Terverifikasi (39) dan Sebagian (20). Entri Tidak ditemukan (8) ditahan dan namanya tidak ditulis ke data publik. Isian direktori ditulis apa adanya; koreksi hasil pemeriksaan hanya muncul di catatan pemeriksaan tiap entri.
- **Tidak terbit:** kolom internal direktori (Tingkat Bukti, Asal Informasi, Catatan / Perlu Verifikasi, Sumber tanpa tautan) dan sheet lain (Rekap, Matriks Pembelajaran, Template Profil Dampingan).
- **Pemisahan dari data SK:** direktori tidak dihubungkan ke SK mana pun (tidak ada nama organisasi di kolom Pendamping GoKUPS) dan tidak dipakai di angka, peta, statistik, atau unduhan rilis. Hubungannya hanya lewat provinsi: halaman Statistik dengan filter provinsi menautkan ke direktori.
- **Data:** `pdpsi oms` menulis `data/oms/<versi>/directory.json` dan `data/oms/current.json`; aplikasi memuat ulang otomatis bila `current.json` berubah. Halaman `/organizations` (Direktori OMS).

### K13. Nama produk Data KUPS dan desain ulang
- **Status:** Ditetapkan 2026-11-10 atas permintaan pemilik produk.
- **Nama:** produk berganti nama dari PDPSI (Pusat Data Perhutanan Sosial Indonesia) menjadi **Data KUPS** di semua teks yang dilihat pengguna: antarmuka, metadata halaman, berkas unduhan (awalan `datakups_`), catatan unduhan, dan label "hasil pengolahan". Nama paket dan perintah pipeline (`pdpsi_pipeline`, `pdpsi`) serta dokumen riwayat tetap, karena tidak terlihat pengguna.
- **Rilis:** `2026-11-02.r8` dibangun ulang dari sumber yang sama hanya untuk nama baru; isi rekaman, olahan, penanda, dan total kontrol identik dengan r7 (diperiksa). Folder r7 masih ada di working tree karena berisi `internal/` yang tidak tersimpan di git.
- **Desain:** palet TRI (DESIGN.md v0.5), navigasi atas menggantikan sidebar, dan gerak halus yang mengacu pada VengeanceUI, Animmaster, dan React Bits. Teks antarmuka ditulis ulang agar lebih mudah dibaca (pedoman humanizer).

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
- **Status 2026-11-10:** sebagian terisi. Pemilik produk menetapkan **The Reform Initiatives (TRI)** sebagai institusi pengelola dan menyerahkan logo TRI serta logo Data KUPS (`public/brand/`). Kontak, situs, dan lisensi data masih `null`, sehingga rilis tetap `draft`.
- **Status awal:** Menunggu. Persetujuan umum pemilik produk (2026-11-05) tidak bisa mengisi nama institusi, kontak, atau lisensi data, karena nilai-nilai ini harus berasal dari institusi pengelola; mengarangnya melanggar keputusan G.
- Semua nilai dibaca dari `config/site.json`. Nilai `null` tampil sebagai "Belum ditetapkan". Rilis berstatus `draft` dan tidak boleh diterbitkan sebagai rilis publik final sampai K9 terisi.

### K10. Git dan repositori
- **Status:** Ditetapkan 2026-11-06. Remote GitHub `zainulmuhammad1911/GOKUPS` (publik), cabang `main`, dibuat dan di-push atas permintaan pemilik produk. Workbook sumber, `data/source/`, dan `internal/` tidak pernah masuk riwayat git (diperiksa sebelum push). Repositori belum punya berkas lisensi karena lisensi kode dan data belum ditetapkan (K9).

## 3. Keputusan desain (keputusan F)

- Swiss minimal dan editorial; hijau kehutanan, putih hangat, abu-abu netral; Atkinson Hyperlegible Next; mode terang saja untuk MVP; label, legenda, dan tabel untuk membantu pembacaan grafik; bukan tampilan dashboard generik; peta interaktif sebagai fitur utama.
- "Indonesian Social Forestry Data Center" dipakai sebagai **terjemahan kerja**, bukan nama resmi institusi.
- `/antislop` mode *during*.

## 4. Ringkasan status

| Kode | Status |
|------|--------|
| K1 | Ditetapkan |
| K2 | Ditetapkan (diubah 2026-11-06) |
| K3 | Ditetapkan |
| K4 | Ditetapkan |
| K5 | Ditetapkan |
| K6 | Ditetapkan (sumber alternatif) |
| K7 | Sebagian |
| K8 | Ditetapkan (diubah 2026-11-05) |
| K9 | Menunggu |
| K10 | Ditetapkan (remote GitHub publik) |
| K11 | Ditetapkan (semua kolom nama dipublikasikan sejak r7) |

## 5. Log perubahan

| Tanggal | Perubahan |
|---------|-----------|
| 2026-11-04 | Keputusan awal A–E dicatat; status K1 sampai K10 pertama. |
| 2026-11-04 | K3 (versi awal): aturan penyamaran nama HTR dengan pengecualian penanda kelompok. K7: crosswalk final dari Kepmendagri 2025. |
| 2026-11-04 | **Konsolidasi sebelum Tahap 2.** Prinsip Source Fidelity & Data Transparency ditetapkan. K1 dikoreksi: L+P dihitung termasuk bila 0. K3 diganti: tidak ada penyamaran nama. K4 ditetapkan: semua dihitung, penanda Duplikat dengan referensi. K5 ditetapkan: ambang hanya penanda. K8 ditetapkan: 7 kategori sumber tidak digabung. Nilai sumber mentah dipertahankan (tanpa perapian spasi atau koreksi ejaan). KPH dan Region dipublikasikan dengan catatan. Rilis `2026-11-02` (draf pertama, dengan penyamaran) digantikan rilis `2026-11-02.r2`. |
| 2026-11-05 | **K8 diubah.** Instruksi rekap: rekapitulasi penerima persetujuan PS per provinsi, kabupaten/kota, dan jenis PS (HD, HKm, HTR, HA, KK). Kemitraan Kehutanan ditampilkan sebagai satu jenis PS dengan rincian 3 subskema yang selalu terlihat. Tujuh kategori sumber tetap disimpan. Rilis `2026-11-02.r3` menambahkan rekap ini. |
| 2026-11-05 | Pemilik produk memberi persetujuan umum atas semua rekomendasi. **K2** ditetapkan (tanpa statistik gender di MVP). **K6** ditetapkan lewat sumber alternatif berlisensi jelas (BPS/OCHA, geoBoundaries, CC BY 3.0 IGO); BIG tidak dipakai. K7, K9, K10 tetap menunggu karena butuh tindakan atau informasi dari pihak lain. Rilis draf `2026-11-02` dan `2026-11-02.r2` dihapus dari working tree (masih ada di riwayat git). |
| 2026-11-06 | **K2 diubah** atas permintaan pemilik produk: anggota L+P selalu disertai jumlah laki-laki dan perempuan, dihitung dari rekaman yang sama, dengan catatan dan jumlah rekaman yang mencatat perempuan 0. Rilis `2026-11-02.r4` (sumber sama) menambahkan `members_male`, `members_female`, dan `members_female_zero_records` ke total kontrol, ringkasan, dan file rekap. Rilis `2026-11-02.r3` dihapus dari working tree (masih ada di riwayat git). |
| 2026-11-06 | **Filter "Anggota tercatat"** ditambahkan atas permintaan pemilik produk (halaman Data, Statistik, dan unduhan sesuai filter; parameter `members` = `1`, `2plus`, `0`, `na`). Tujuannya melihat rekaman yang kemungkinan izin perorangan. Filter memakai anggota laki-laki + perempuan hasil pengolahan K1, bukan status resmi: kolom sumber Bentuk Lembaga hanya mencatat "PERORANGAN" pada 58 rekaman, sedangkan rekaman beranggota 1 orang berjumlah 2.168 (2.167 HTR). Setiap tampilan hasil filter memuat catatan ini. |
| 2026-11-06 | **K11 ditetapkan:** filter Pendamping (ada/tidak ada pendamping tercatat) atas permintaan pemilik produk; hanya status isi kolom yang dipublikasikan. Filter Anggota tercatat dan Pendamping juga ditambahkan ke halaman Peta (diterapkan di server). Rilis `2026-11-02.r5` (sumber sama) menambahkan `derived.pendamping_status`; rilis r4 dihapus dari working tree (masih ada di riwayat git). |
| 2026-11-06 | **Filter Region** ditambahkan atas permintaan pemilik produk (Data, Statistik, Peta, unduhan; parameter `region`). Memakai nilai kolom sumber `Region` apa adanya (7 kelompok pulau, terisi di semua rekaman, satu region per provinsi). Kolom ini bukan field GoKUPS, melainkan turunan penyusun workbook dari provinsi; keterangan ini tampil di bawah pilihan filter. Provinsi atau kabupaten/kota di luar region terpilih diabaikan dan dicatat. |
| 2026-11-06 | **K11 diubah:** pemilik produk memutuskan kolom `Pendamping` dipublikasikan dengan nama apa adanya, karena nama pendamping juga disajikan di situs GoKUPS. Rilis `2026-11-02.r6` (sumber sama) memuat kolom ini; Ketua Lembaga dan Pra-Pendamping tetap dikecualikan. Rilis r5 dihapus dari working tree (masih ada di riwayat git). Aplikasi kini memuat ulang rilis otomatis bila `current.json` berubah, karena server yang sudah berjalan sebelumnya masih menyajikan rilis lama dari memori (filter pendamping tampak 0). |
| 2026-11-06 | **K11 diubah lagi:** pemilik produk memutuskan kolom `Ketua Lembaga` dan `Pra-Pendamping` juga dipublikasikan. Rilis `2026-11-02.r7` (sumber sama) memuat semua kolom tabular GoKUPS; `PRIVATE_COLUMNS` dikosongkan. CSV rilis kini menetralkan teks berawalan = + - @ seperti unduhan web (10 nilai Ketua Lembaga). Rilis r6 dihapus dari working tree (masih ada di riwayat git). |
| 2026-11-06 | **K10 ditetapkan:** riwayat git di-push ke `https://github.com/zainulmuhammad1911/GOKUPS` (repositori publik). Sebelum push diperiksa: tidak ada workbook sumber, `data/source/`, `internal/`, atau berkas rahasia di riwayat; berkas terbesar 14,6 MB. |
| 2026-11-10 | **K12 ditetapkan:** Direktori OMS pendamping diterbitkan sebagai halaman terpisah (`/organizations`) dari direktori pemilik produk yang sudah diperiksa daring. 59 dari 67 entri terbit (39 terverifikasi, 20 sebagian); 8 ditahan karena bukti publik belum ditemukan. Data direktori versi `2026-11-10`. |
| 2026-11-10 | **K13 ditetapkan dan K9 sebagian terisi:** nama produk menjadi Data KUPS; The Reform Initiatives ditetapkan sebagai institusi pengelola. Desain ulang dengan palet TRI, navigasi atas, dan gerak halus. Rilis `2026-11-02.r8` (sumber sama, isi identik dengan r7) memakai nama berkas `datakups_`. |
