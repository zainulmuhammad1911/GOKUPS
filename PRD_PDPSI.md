# Product Requirements Document (PRD)

# Pusat Data Perhutanan Sosial Indonesia (PDPSI)

**Versi:** 1.2 (riwayat perubahan di bagian 18)\
**Status:** Draft untuk implementasi\
**Tanggal:** 4 November 2026\
**Target implementasi:** Claude Code\
**Bahasa antarmuka:** Bahasa Indonesia dan Bahasa Inggris\
**Model akses:** Publik / open access\
**Domain:** Subdomain institusi (ditentukan kemudian)

------------------------------------------------------------------------

## 1. Ringkasan Produk

Pusat Data Perhutanan Sosial Indonesia (PDPSI) adalah portal publik
untuk menyajikan data dan statistik Perhutanan Sosial Indonesia secara
mudah dipahami, dicari, dilihat melalui peta, dan diunduh.

PDPSI mengambil pendekatan portal informasi dan data seperti SNIF Brasil
(https://snif.florestal.gov.br/): berorientasi pada informasi, navigasi
tematik, statistik, peta, dan akses dataset.

PDPSI **bukan** sistem administrasi Perhutanan Sosial, bukan sistem
pengajuan persetujuan, bukan aplikasi monitoring kelompok, dan bukan
pengganti GoKUPS atau sistem resmi pemerintah.

Prinsip produk: - Sederhana dan fokus pada publikasi data. - Pengunjung
dapat mengakses informasi tanpa membuat akun. - Peta menjadi fitur
utama, berdampingan dengan statistik dan tabel data. - Data yang
ditampilkan harus dapat ditelusuri sumber dan tanggal pembaruannya. -
Jangan menampilkan informasi yang tidak tersedia atau belum tervalidasi
seolah-olah akurat. - Versi pertama harus realistis untuk dibangun dan
dipelihara oleh tim kecil.

## 1.1 Prinsip Permanen: Source Fidelity & Data Transparency

PDPSI adalah portal penyajian data berdasarkan sumber yang tersedia.
Setiap informasi harus dapat ditelusuri ke data sumber. Nilai sumber
tidak boleh diperbaiki, direkonstruksi, diestimasi, atau diubah secara
diam-diam. Prinsip ini berlaku permanen dan mengalahkan aturan teknis
lain dalam dokumen ini.

1.  Pertahankan seluruh nilai asli dari workbook.
2.  Jangan mengoreksi nama, angka, tanggal, luas, atau atribut lainnya
    secara otomatis.
3.  Jangan mengisi data kosong menggunakan perkiraan.
4.  Bedakan nilai 0 dengan data kosong.
5.  Jangan menghapus rekaman duplikat.
6.  Jangan menggabungkan kategori yang berbeda.
7.  Jangan menyembunyikan ketidaksesuaian data.
8.  Jangan membuat koordinat kelompok yang tidak tersedia.
9.  Hasil agregasi harus diberi label sebagai hasil pengolahan dari data
    sumber.
10. Seluruh hasil agregasi harus dapat ditelusuri ke rekaman
    pembentuknya.

Jika data tidak tersedia, katakan tidak tersedia. Jika data tidak
konsisten, tampilkan nilainya dan berikan catatan.

Data pribadi tetap harus melalui penilaian kelayakan publikasi dan
ketentuan perlindungan data. Jika kolom dikecualikan dari publikasi,
dokumentasikan alasan dan cakupannya, dan jangan menyebut data publik
sebagai salinan mentah sepenuhnya. Workbook sumber tidak boleh diubah.

Rincian penerapan dan keputusan terkait ada di `docs/DECISIONS.md`.

## 2. Tujuan dan Ukuran Keberhasilan

### 2.1 Tujuan

1.  Menyediakan satu portal publik untuk melihat data persetujuan
    Perhutanan Sosial.
2.  Menampilkan persebaran data secara geografis pada tingkat provinsi
    dan kabupaten/kota.
3.  Memudahkan publik memahami statistik berdasarkan wilayah dan skema.
4.  Menyediakan pencarian, filter, detail data, serta unduhan dataset.
5.  Menyediakan informasi metodologi, sumber, periode, dan keterbatasan
    data.

### 2.2 Indikator keberhasilan MVP

-   Seluruh data yang telah lolos pemeriksaan dapat ditampilkan dalam
    tabel.
-   Statistik, grafik, dan peta menggunakan dataset dan aturan agregasi
    yang sama.
-   Pengunjung dapat mencari dan memfilter data tanpa login.
-   Peta dapat menampilkan agregasi pada tingkat provinsi dan
    kabupaten/kota.
-   Pengunjung dapat mengunduh data yang ditampilkan dalam format CSV
    dan Excel.
-   Setiap halaman data menampilkan sumber dan tanggal pembaruan.
-   Website responsif pada desktop, tablet, dan ponsel.
-   Tidak ada angka contoh/dummy yang tampil pada website produksi.

## 3. Pengguna

  -----------------------------------------------------------------------
  Pengguna                            Kebutuhan
  ----------------------------------- -----------------------------------
  Masyarakat umum                     Melihat informasi dan persebaran
                                      Perhutanan Sosial

  Peneliti dan akademisi              Menemukan, membandingkan, dan
                                      mengunduh data

  Organisasi masyarakat sipil         Menggunakan data untuk analisis dan
                                      advokasi

  Pemerintah dan pemangku kepentingan Mengakses ringkasan data dan
                                      informasi wilayah

  Jurnalis                            Memeriksa angka, wilayah, skema,
                                      dan sumber data
  -----------------------------------------------------------------------

Semua pengguna mengakses portal yang sama. Tidak diperlukan akun publik
atau dashboard berdasarkan peran.

## 4. Ruang Lingkup MVP

### 4.1 Fitur yang wajib dibangun

1.  Beranda.
2.  Peta persebaran interaktif.
3.  Statistik dan grafik.
4.  Database data persetujuan/kelompok.
5.  Pencarian dan filter.
6.  Halaman detail satu rekaman.
7.  Unduhan CSV dan Excel.
8.  Halaman Tentang Data / Metodologi.
9.  Dukungan bahasa Indonesia dan Inggris.
10. Sumber data dan tanggal pembaruan yang terlihat.

### 4.2 Di luar ruang lingkup MVP

Fitur berikut tidak perlu dibangun pada versi pertama:

-   Registrasi dan akun untuk pengunjung.
-   Dashboard khusus pengguna atau organisasi.
-   Workflow pengajuan, verifikasi, dan persetujuan pemerintah.
-   Sistem monitoring kegiatan kelompok.
-   Pengelolaan program atau pendampingan.
-   API publik.
-   Integrasi otomatis langsung dengan GoKUPS.
-   Pemetaan poligon areal persetujuan per kelompok.
-   Peta titik lokasi kelompok apabila koordinat belum tersedia dan
    terverifikasi.
-   Sistem komentar, forum, atau kontribusi pengguna.
-   CMS kompleks.

Pembaruan data dilakukan secara hybrid: proses impor dataset baru
dilakukan oleh pengelola secara terkontrol. Otomatisasi integrasi dapat
dipertimbangkan setelah tersedia akses resmi dan stabil.

## 5. Struktur Website dan Navigasi

Navigasi utama dibatasi menjadi:

1.  **Beranda**
2.  **Peta**
3.  **Statistik**
4.  **Data**
5.  **Unduh**
6.  **Tentang**

Header menampilkan logo/nama PDPSI, navigasi, dan pilihan bahasa
`ID | EN`.

Footer menampilkan deskripsi singkat, sumber data, tanggal pembaruan
terakhir, informasi institusi pengelola, dan tautan metodologi.

### 5.1 Struktur URL yang disarankan

``` text
/
 /map
 /statistics
 /data
 /data/[record-id]
 /download
 /about
```

Untuk halaman wilayah, boleh menggunakan pola:

``` text
/region/[province-slug]
/region/[province-slug]/[regency-slug]
```

Jangan membuat struktur URL yang terlalu dalam.

## 6. Kebutuhan Fungsional

### 6.1 Beranda

Beranda harus menjawab secara cepat: berapa jumlah persetujuan/rekaman
yang tercatat, berapa luasnya, bagaimana persebarannya, dan ke mana
pengunjung harus melanjutkan.

Komponen: - Judul: **Pusat Data Perhutanan Sosial Indonesia**. -
Deskripsi satu atau dua kalimat. - Empat kartu ringkasan: - Jumlah
rekaman/kelompok sesuai unit analisis yang telah ditetapkan. - Jumlah
provinsi tercakup. - Luas persetujuan (ha), jika lolos validasi. -
Jumlah anggota, jika lolos validasi. - Cuplikan peta Indonesia. - Grafik
komposisi skema. - Grafik wilayah dengan jumlah rekaman tertinggi. -
Tautan langsung ke Peta, Data, dan Unduh. - Keterangan sumber dan
tanggal pembaruan.

**Aturan:** Label angka harus menyebut unitnya dengan jelas. Jangan
menggunakan istilah "jumlah kelompok" apabila sumber sebenarnya
menghitung SK atau baris data.

### 6.2 Peta Interaktif

Peta merupakan salah satu fitur utama PDPSI dan harus tersedia pada
navigasi utama.

#### Tampilan awal

-   Peta Indonesia.
-   Batas provinsi.
-   Warna choropleth berdasarkan nilai indikator terpilih.
-   Legenda rentang nilai.
-   Panel informasi singkat.
-   Kontrol zoom dan reset tampilan.
-   Sumber peta dan keterangan bahwa peta merupakan agregasi data
    administratif.

#### Indikator yang dapat dipilih

-   Jumlah rekaman persetujuan.
-   Jumlah kelompok, hanya jika unit kelompok telah dibedakan secara
    valid dari SK.
-   Luas persetujuan (ha), jika data lolos validasi.
-   Jumlah anggota, jika data lolos validasi.
-   Distribusi menurut skema.

#### Interaksi

-   Klik provinsi untuk melihat ringkasan provinsi.
-   Dari provinsi, pengunjung dapat melihat agregasi kabupaten/kota.
-   Klik kabupaten/kota untuk melihat ringkasan wilayah.
-   Filter skema dapat diterapkan pada peta.
-   Peta dan tabel/ringkasan harus mengikuti filter yang sama.
-   Sediakan tombol kembali ke tampilan nasional.
-   Tampilkan keadaan kosong jika wilayah tidak memiliki data yang cocok
    dengan filter.

#### Informasi pada panel wilayah

-   Nama wilayah.
-   Jumlah rekaman persetujuan.
-   Luas (jika valid).
-   Jumlah anggota (jika valid).
-   Komposisi skema.
-   Tautan menuju data yang sudah difilter untuk wilayah tersebut.

#### Aturan penting peta

-   Dataset awal tidak memiliki koordinat lokasi kelompok yang dapat
    digunakan sebagai titik lokasi.
-   Karena itu, MVP menggunakan batas administrasi resmi dan agregasi
    data pada tingkat provinsi serta kabupaten/kota.
-   Jangan membuat titik koordinat sintetis atau menempatkan marker di
    pusat wilayah seolah-olah merupakan lokasi kelompok.
-   Jangan menampilkan poligon areal persetujuan jika geometri
    legal/terverifikasi tidak tersedia.
-   Gunakan kode wilayah resmi sebagai kunci penghubung, bukan hanya
    pencocokan nama.
-   Jika kode wilayah belum tersedia, buat tabel pemetaan nama sumber ke
    kode wilayah resmi dan tandai entri yang belum terverifikasi.
-   Tampilkan catatan metodologi dan tanggal versi data batas
    administrasi.

### 6.3 Halaman Statistik

Menampilkan visualisasi yang ringkas dan mudah dibaca:

-   Distribusi data berdasarkan skema.
-   Distribusi berdasarkan provinsi.
-   Top 10 kabupaten/kota berdasarkan jumlah rekaman.
-   Luas persetujuan per provinsi, jika valid.
-   Jumlah anggota per provinsi, jika valid.
-   Perbandingan skema menurut wilayah.

Filter global: - Provinsi. - Kabupaten/kota. - Skema. - Rentang
tahun/tanggal SK, jika data tanggal memadai.

Semua grafik harus diperbarui berdasarkan filter. Sertakan label satuan,
sumber, dan penjelasan singkat. Hindari grafik dekoratif yang tidak
menambah informasi.

### 6.4 Halaman Data

Tabel publik dengan fitur: - Pencarian teks. - Filter provinsi. - Filter
kabupaten/kota. - Filter skema. - Filter tahun SK jika tersedia. -
Sorting kolom. - Pagination. - Jumlah hasil. - Reset filter. - Unduh
hasil sesuai filter.

Kolom awal yang disarankan: - Nama kelompok/lembaga (jika tersedia dan
layak dipublikasikan). - Provinsi. - Kabupaten/kota. - Skema Perhutanan
Sosial. - Nomor SK. - Tanggal SK. - Luas (ha), jika valid.

Pada layar ponsel, tabel boleh berubah menjadi daftar/kartu ringkas.
Jangan memaksa tabel desktop tampil kecil di layar ponsel.

### 6.5 Halaman Detail Rekaman

Saat pengguna membuka satu rekaman, tampilkan: - Nama kelompok/lembaga,
jika tersedia. - Nomor SK. - Tanggal SK. - Skema asli dari sumber. -
Skema normalisasi. - Provinsi, kabupaten/kota, kecamatan jika
tersedia. - Luas total, jika lolos validasi. - Rincian luas per kategori
jika tersedia dan tervalidasi. - Statistik anggota
laki-laki/perempuan/total jika aman dan tervalidasi. - Sumber data. -
Tanggal ekstraksi/pembaruan. - Catatan kualitas data jika relevan.

Informasi personal seperti nama ketua dan nama pendamping tidak
ditampilkan secara default. Publikasi informasi tersebut harus melalui
pemeriksaan dasar hukum, tujuan, dan risiko privasi terlebih dahulu.

Nama lembaga, nama kelompok, dan nama pemegang izin HTR perorangan
ditampilkan sebagaimana tercatat di sumber, tanpa disamarkan atau diubah
(keputusan K3, `docs/DECISIONS.md`).

Jika nomor SK rekaman juga dipakai rekaman lain, halaman detail
menampilkan penanda Duplikat, jumlah rekaman dengan nomor SK yang sama,
serta ID dan tautan ke seluruh rekaman terkait. Rekaman yang identik
penuh dibedakan dari rekaman yang hanya memiliki nomor SK sama (K4).

### 6.6 Unduh Data

Sediakan: - Unduh seluruh dataset dalam CSV. - Unduh seluruh dataset
dalam Excel. - Unduh data sesuai filter aktif. - Unduh ringkasan
statistik per provinsi. - Unduh ringkasan statistik per kabupaten/kota.

Setiap file harus menyertakan: - Nama dataset. - Sumber. - Tanggal
ekstraksi atau pembaruan. - Definisi unit analisis. - Keterangan
kolom. - Catatan keterbatasan. - Versi dataset.

### 6.7 Tentang Data / Metodologi

Halaman ini menjelaskan secara singkat: - Tujuan PDPSI. - Sumber data. -
Periode/cut-off data. - Definisi unit analisis. - Definisi setiap
skema. - Metode pembersihan dan normalisasi. - Metode agregasi peta dan
statistik. - Penanganan data duplikat. - Keterbatasan dan data kosong. -
Lisensi atau ketentuan penggunaan data. - Kontak institusi pengelola.

## 7. Dasar Data dan Audit Dataset Awal

Dataset awal berasal dari ekstraksi GoKUPS dan file kerja
`Data_SK_Perhutanan_Sosial_GoKUPS.xlsx`.

Ringkasan pemeriksaan dataset yang menjadi dasar perencanaan:

  Indikator pemeriksaan                                  Hasil awal
  ------------------------------------------------- ---------------
  Baris pada sheet SK Perhutanan Sosial                      10.061
  Nomor SK unik                                               9.915
  Baris berlebih dalam kelompok nomor SK duplikat               146
  Nama provinsi berbeda pada data mentah                         37
  Nama kabupaten/kota berbeda pada data mentah                  407
  Total luas tercatat                                 ±6.892.023 ha
  Total anggota tercatat                                  1.227.046
  Laki-laki tercatat                                      1.211.968
  Perempuan tercatat                                         76.974

Angka di atas adalah hasil audit awal file, bukan otomatis angka
publikasi final. Perbedaan antara baris, nomor SK unik, kelompok, dan
unit lain harus diselesaikan sebelum angka digunakan pada kartu
statistik.

### 7.1 Distribusi skema pada data mentah

  Kategori sumber                       Jumlah baris
  ----------------------------------- --------------
  HKm                                          3.907
  HTR                                          2.736
  HD                                           2.464
  KULIN KK                                       641
  Hutan Adat                                     173
  Kemitraan Kehutanan -- Konservasi              134
  IPHPS                                            6
  **Total**                               **10.061**

Jangan langsung mengubah kategori sumber menjadi lima skema baku tanpa
aturan pemetaan yang terdokumentasi. Simpan nilai asli dan nilai
normalisasi secara terpisah.

Ketujuh kategori sumber di atas disimpan dan ditampilkan apa adanya.
Rekapitulasi memakai 5 jenis PS: Hutan Desa, Hutan Kemasyarakatan, Hutan
Tanaman Rakyat, Hutan Adat, dan Kemitraan Kehutanan. Angka Kemitraan
Kehutanan adalah jumlah tiga subskema berlabel "KEMITRAAN KEHUTANAN ~" di
sumber, dan rincian ketiganya selalu ditampilkan. Hutan Adat dicatat
sebagai penetapan, bukan persetujuan (K8).

Rekap utama PDPSI: jumlah rekaman SK penerima persetujuan/penetapan dan
luasnya per provinsi, per kabupaten/kota, dan per jenis PS.

### 7.2 Isu kualitas data yang wajib ditangani

-   Terdapat nomor SK duplikat. Jangan menghapus atau menggabungkan
    otomatis. Simpan setiap baris sumber, gunakan ID internal unik, dan
    buat proses pemeriksaan duplikasi.
-   Nama wilayah merupakan nilai teks mentah. Jumlah nama berbeda tidak
    sama dengan jumlah entitas administrasi resmi. Cocokkan dengan kode
    wilayah resmi.
-   Terdapat nilai kosong pada sejumlah kolom, termasuk nama lembaga,
    bentuk lembaga, kecamatan, ketua lembaga, pendamping, dan KPH.
-   Terdapat ketidaksesuaian antara jumlah anggota laki-laki + perempuan
    dengan total anggota pada sebagian rekaman.
-   Terdapat ketidaksesuaian antara jumlah komponen luas dan luas total
    pada sebagian rekaman.
-   Ada tanggal SK yang perlu diperiksa karena berada di masa depan.
-   Ada perbedaan antara angka capaian yang ditampilkan pada halaman
    GoKUPS dan jumlah baris hasil ekstraksi. Definisi dan tanggal
    cut-off harus diperiksa sebelum dibandingkan.

### 7.3 Aturan publikasi data

-   Data mentah tidak boleh ditimpa oleh data hasil pembersihan.
-   Setiap rekaman harus memiliki ID internal yang stabil.
-   Simpan nilai sumber asli dan nilai hasil normalisasi.
-   Jangan memperbaiki data sumber tanpa menyimpan jejak perubahan.
-   Ketidaksesuaian data ditandai dan diberi catatan, bukan dihapus.
    Rekaman hanya tidak diikutkan dalam perhitungan tertentu bila
    nilainya tidak dapat dihitung (misalnya komponen kosong atau
    negatif). Jumlah dan alasan rekaman yang tidak diikutkan selalu
    ditampilkan. Ambang selisih luas hanya dipakai sebagai penanda (K5).
-   Kolom Anggota Keseluruhan dari sumber tetap ditampilkan. Hasil
    perhitungan laki-laki + perempuan disajikan terpisah sebagai hasil
    pengolahan, bukan sebagai total resmi nasional (K1).
-   Jangan menyembunyikan masalah kualitas data yang memengaruhi
    interpretasi angka.
-   Jangan menampilkan nilai kosong sebagai nol.
-   Jangan menyimpulkan jumlah kelompok dari jumlah SK jika hubungan
    satu SK dengan kelompok belum dipastikan.

## 8. Model Data Minimum

Gunakan model data yang cukup untuk kebutuhan portal. Hindari desain
enterprise yang berlebihan.

Entitas/tabel minimum:

### `source_records`

Menyimpan salinan rekaman dari sumber. - `id` - `source_name` -
`source_record_id` (nullable) - `raw_payload` atau kolom sumber mentah -
`extracted_at` - `dataset_version`

### `approvals`

Menyimpan data yang sudah dinormalisasi untuk ditampilkan. - `id` (UUID
atau ID internal) - `source_record_id` - `approval_number` -
`approval_date` - `group_name` - `institution_name` -
`scheme_original` - `scheme_normalized` - `province_code` -
`province_name` - `regency_code` - `regency_name` - `district_name` -
`total_area_ha` - `male_members` - `female_members` - `total_members` -
`publication_status` - `quality_status` - `updated_at`

### `administrative_areas`

Menyimpan referensi wilayah dan kode resmi. - `id` -
`administrative_code` - `name` - `type` (province/regency) -
`parent_code` - `geometry` atau referensi file geometri

### `data_releases`

Mencatat versi dataset yang dipublikasikan. - `id` - `version` -
`source_name` - `source_cutoff_date` - `published_at` - `notes` -
`is_current`

Skema dapat disesuaikan setelah pemeriksaan workbook dan sumber data
final. Jangan menambah tabel atau layanan hanya untuk mengantisipasi
fitur yang belum menjadi kebutuhan MVP.

## 9. Arsitektur Teknis yang Disarankan

Gunakan arsitektur web sederhana yang dapat dikembangkan bertahap.

  Komponen             Rekomendasi
  -------------------- -------------------------------------------------
  Framework            Next.js (App Router)
  Bahasa               TypeScript
  UI                   React + Tailwind CSS
  Peta                 MapLibre GL JS
  Data peta            GeoJSON atau vector tiles dari sumber tepercaya
  Grafik               Apache ECharts
  Database             PostgreSQL
  ORM/query layer      Prisma atau Drizzle; pilih satu
  Pengolahan dataset   Python, pandas, openpyxl
  Hosting aplikasi     Vercel atau hosting institusi yang kompatibel
  Penyimpanan file     Object storage atau penyimpanan statis
  Bahasa               Sistem i18n sederhana

Catatan: - PostGIS boleh digunakan jika operasi spasial di database
memang dibutuhkan. Untuk choropleth administratif sederhana, GeoJSON dan
agregasi statistik dapat cukup. - Tidak perlu microservices. - Tidak
perlu message broker. - Tidak perlu Kubernetes. - Tidak perlu backend
terpisah apabila Next.js API/server actions sudah mencukupi. - Jangan
menambahkan autentikasi publik. Jika kelak ada halaman admin, gunakan
autentikasi sederhana yang hanya diberikan kepada pengelola.

### 9.1 Alur data

``` text
Workbook / sumber GoKUPS
        |
        v
Pemeriksaan dan pembersihan dataset
        |
        v
Data mentah + data normalisasi
        |
        v
Pencocokan kode wilayah resmi
        |
        v
Agregasi statistik provinsi/kabupaten
        |
        v
Database / dataset publik
        |
        +----> Beranda dan grafik
        +----> Peta interaktif
        +----> Tabel dan detail
        +----> Unduhan CSV/Excel
```

## 10. Desain UI/UX

Referensi arah desain: https://snif.florestal.gov.br/

Gunakan karakter portal data publik yang: - Bersih, tenang, dan
informatif. - Memiliki hierarki informasi yang jelas. - Mengutamakan
peta, statistik, dan akses dataset. - Menggunakan tipografi yang mudah
dibaca. - Menghindari tampilan template dashboard SaaS. - Menghindari
dekorasi, gradient, glassmorphism, animasi, dan kartu berlebihan. -
Memiliki ruang kosong yang cukup. - Konsisten pada desktop dan mobile.

Arah visual: - Warna utama bernuansa hijau kehutanan, dipadukan putih
dan warna netral. - Warna peta harus memiliki kontras yang memadai dan
legenda yang jelas. - Jangan mengandalkan warna saja untuk menyampaikan
informasi. - Gunakan ikon hanya jika membantu pemahaman. - Hindari angka
besar dan grafik yang tidak punya konteks.

### 10.1 Prinsip konten dan microcopy

-   Gunakan Bahasa Indonesia yang lugas, spesifik, dan mudah dipahami.
-   Hindari jargon teknis tanpa penjelasan.
-   Hindari klaim seperti "data paling lengkap" atau "data real-time"
    jika tidak dapat dibuktikan.
-   Setiap label metrik harus menyebut unit.
-   Tulis keterangan sumber dan keterbatasan secara terbuka.
-   Terjemahan Inggris harus mempertahankan makna istilah kebijakan
    Indonesia; jangan menerjemahkan nama skema secara serampangan.

## 11. Skill Claude Code yang Wajib Digunakan

Implementasi dilakukan melalui Claude Code. Skill berikut harus
dimasukkan ke dalam alur kerja dan digunakan sesuai tahapnya.

### `/ui-ux-pro-max`

Wajib digunakan pada tahap perencanaan desain dan implementasi
antarmuka: - Menentukan arah visual dan design system. - Menentukan
tipografi, palet warna, spacing, komponen, dan layout. - Merancang
tampilan desktop dan mobile. - Memastikan konsistensi ant halaman. -
Meninjau kualitas UI sebelum dianggap selesai.

Instruksi: desain harus mengikuti karakter portal data publik dan
referensi SNIF, bukan dashboard SaaS generik.

### `/antislop`

Wajib digunakan saat menyusun dan meninjau tulisan produk: - Menulis
judul, deskripsi, label, keterangan grafik, tooltip, empty state,
navigasi, dan teks metodologi. - Menghapus frasa generik, kalimat
berulang, klaim berlebihan, dan bahasa yang terdengar seperti keluaran
AI. - Menjaga tulisan tetap spesifik terhadap data Perhutanan Sosial. -
Memastikan setiap teks menyampaikan informasi yang jelas.

### `/humanizer`

Wajib digunakan sebagai tahap penyuntingan akhir konten: - Membuat
bahasa antarmuka terdengar wajar dan manusiawi. - Memperbaiki kalimat
yang kaku atau terlalu formal. - Menjaga nada informatif, profesional,
dan tidak berlebihan. - Tidak mengubah definisi, angka, istilah
kebijakan, atau makna metodologis.

### Urutan penggunaan skill

1.  Gunakan `/ui-ux-pro-max` sebelum membangun komponen dan halaman
    utama.
2.  Gunakan `/antislop` saat menulis seluruh teks antarmuka dan konten.
3.  Gunakan `/humanizer` untuk menyunting hasil tulisan sebelum
    publikasi.
4.  Jalankan pemeriksaan konsistensi desain dan konten setelah seluruh
    halaman selesai.

Jangan menganggap pemanggilan skill sebagai pengganti pengujian. Hasil
desain, tulisan, aksesibilitas, dan fungsi tetap harus diperiksa.

## 12. Kebutuhan Nonfungsional

### Kinerja

-   Halaman utama harus terasa cepat pada koneksi internet seluler yang
    wajar.
-   Peta tidak boleh memuat seluruh data mentah sebagai marker.
-   Gunakan agregasi wilayah untuk peta.
-   Terapkan pagination atau server-side filtering untuk tabel jika
    ukuran data membesar.
-   Optimalkan ukuran GeoJSON dan gunakan simplifikasi geometri bila
    diperlukan.

### Responsivitas

-   Mendukung desktop, tablet, dan ponsel.
-   Peta tetap dapat digunakan pada layar kecil.
-   Filter peta tidak boleh menutupi seluruh area peta pada ponsel.

### Aksesibilitas

-   Kontras teks memadai.
-   Navigasi dapat digunakan dengan keyboard.
-   Input memiliki label.
-   Peta memiliki alternatif informasi berbentuk tabel/list.
-   Jangan mengandalkan warna sebagai satu-satunya pembeda.

### Keamanan dan privasi

-   Tidak mengumpulkan data pribadi pengunjung jika tidak diperlukan.
-   Jangan mempublikasikan informasi personal dari workbook tanpa
    pemeriksaan.
-   Validasi input pencarian dan filter.
-   Lindungi endpoint impor/admin jika dibuat.
-   Simpan kredensial pada environment variables, bukan repository.

### Keandalan

-   Jika peta gagal dimuat, data statistik dan tabel tetap dapat
    diakses.
-   Jika satu indikator tidak valid, indikator tersebut harus
    disembunyikan atau diberi keterangan; jangan menggantinya dengan
    angka nol.
-   Catat versi dataset yang sedang dipublikasikan.

## 13. Kriteria Penerimaan (Acceptance Criteria)

MVP dapat diterima jika:

### Beranda

-   Menampilkan angka yang berasal dari dataset aktif.
-   Angka dan label unit konsisten dengan metodologi.
-   Tautan ke peta, statistik, data, dan unduhan berfungsi.

### Peta

-   Peta Indonesia tampil dengan batas provinsi.
-   Indikator dapat diganti.
-   Klik provinsi menampilkan ringkasan.
-   Pengunjung dapat melihat agregasi kabupaten/kota.
-   Filter skema memengaruhi peta dan ringkasan.
-   Legenda, satuan, sumber, dan tanggal data terlihat.
-   Tidak ada marker lokasi kelompok yang dibuat tanpa koordinat
    terverifikasi.
-   Tersedia alternatif tabel/list untuk informasi peta.

### Statistik

-   Grafik mengikuti filter.
-   Nilai grafik sama dengan hasil query dataset yang sama.
-   Grafik memiliki judul, satuan, dan label yang jelas.

### Data

-   Pencarian dan filter berfungsi.
-   Sorting dan pagination berfungsi.
-   Detail rekaman dapat dibuka.
-   Hasil unduhan sesuai dengan filter yang aktif.

### Unduhan

-   CSV dapat dibuka dengan aplikasi spreadsheet.
-   Excel memiliki nama kolom dan format yang jelas.
-   File memuat informasi sumber, tanggal, dan metodologi.

### Bahasa dan tampilan

-   Pengunjung dapat mengganti bahasa Indonesia/Inggris.
-   Tidak ada teks dummy atau placeholder pada produksi.
-   Tampilan responsif dan tidak ada elemen yang saling bertumpuk.

## 14. Tahapan Implementasi

Target berikut adalah estimasi kerja untuk MVP sederhana, bukan janji
waktu yang kaku. Durasi bergantung pada kesiapan data batas administrasi
dan hasil validasi dataset.

  -----------------------------------------------------------------------
  Tahap                   Pekerjaan               Hasil
  ----------------------- ----------------------- -----------------------
  1\. Audit dan persiapan Audit workbook,         Dataset bersih dan
                          definisi unit analisis, catatan metodologi
                          normalisasi skema, kode 
                          wilayah                 

  2\. Fondasi aplikasi    Setup Next.js, struktur Kerangka website
                          proyek, database, i18n, 
                          design system           

  3\. Beranda dan         Kartu ringkasan dan     Halaman informasi
  statistik               grafik                  nasional

  4\. Peta                Batas wilayah,          Peta interaktif
                          choropleth, filter,     
                          drill-down              

  5\. Data dan unduhan    Tabel, pencarian,       Database publik
                          detail, ekspor          

  6\. QA dan publikasi    Uji data, UI, mobile,   MVP online
                          performa, deploy        
  -----------------------------------------------------------------------

Urutan pengerjaan dapat disesuaikan. Peta dan persiapan data wilayah
perlu diuji lebih awal karena keduanya memiliki risiko teknis terbesar.

## 15. Risiko dan Keputusan yang Harus Dijaga

  -----------------------------------------------------------------------
  Risiko                              Penanganan
  ----------------------------------- -----------------------------------
  Duplikasi nomor SK                  Simpan seluruh baris sumber; jangan
                                      menghapus otomatis

  Unit analisis tidak jelas           Bedakan baris, SK, kelompok, KUPS,
                                      anggota, dan luas

  Nama wilayah tidak seragam          Cocokkan ke kode wilayah resmi

  Data luas/anggota tidak konsisten   Tandai dan keluarkan dari indikator
                                      yang terdampak sampai tervalidasi

  Data koordinat tidak tersedia       Gunakan choropleth administrasi,
                                      bukan titik kelompok

  Batas wilayah berbeda versi         Catat sumber dan tahun versi
                                      geometri

  Informasi personal                  Jangan tampilkan tanpa dasar dan
                                      pemeriksaan publikasi

  Angka sumber berbeda                Tampilkan definisi, tanggal
                                      ekstraksi, dan catatan rekonsiliasi
  -----------------------------------------------------------------------

## 16. Keputusan Produk yang Sudah Tetap

Keputusan berikut dianggap terkunci untuk MVP:

-   Nama produk: **Pusat Data Perhutanan Sosial Indonesia (PDPSI)**.
-   Akses: terbuka untuk publik.
-   Bahasa: Indonesia dan Inggris.
-   Pembaruan data: hybrid, dengan impor dataset terkontrol.
-   Identitas pengelola: institusi.
-   Domain: subdomain institusi.
-   Referensi arah portal: SNIF Brasil.
-   Peta interaktif: fitur wajib.
-   Fokus: publikasi data, statistik, peta, pencarian, dan unduhan.
-   Implementasi: Claude Code.
-   Skill wajib: `/ui-ux-pro-max`, `/antislop`, `/humanizer`.

## 17. Instruksi Implementasi untuk Claude Code

Sebelum mulai coding:

1.  Periksa isi repository dan file dataset yang tersedia. Jangan
    mengasumsikan struktur proyek.
2.  Baca PRD ini sampai selesai.
3.  Periksa ketersediaan skill `/ui-ux-pro-max`, `/antislop`, dan
    `/humanizer`. Gunakan skill tersebut sesuai ketentuan pada
    Bagian 11. Jika skill tidak tersedia, laporkan dan jangan
    berpura-pura telah menjalankannya.
4.  Audit ulang workbook sumber dan dokumentasikan nama sheet, kolom,
    tipe data, duplikasi, nilai kosong, serta anomali.
5.  Verifikasi sumber dan lisensi batas administrasi yang akan dipakai.
6.  Susun rencana implementasi singkat dan struktur folder sebelum
    membuat banyak file.
7.  Bangun MVP sesuai ruang lingkup. Jangan menambahkan fitur di luar
    PRD tanpa alasan dan persetujuan.
8.  Jangan menggunakan data dummy untuk menggantikan data produksi.
    Untuk komponen yang belum siap, tampilkan empty state yang jelas.
9.  Pastikan peta, grafik, tabel, dan unduhan menggunakan sumber data
    dan aturan agregasi yang konsisten.
10. Jalankan pengujian fungsional, responsivitas, aksesibilitas dasar,
    dan validasi angka sebelum deployment.

### Batasan untuk Claude Code

-   Jangan membangun aplikasi yang terlalu kompleks.
-   Jangan membuat CMS, role system, workflow persetujuan, API publik,
    atau microservices pada MVP.
-   Jangan menambahkan animasi dan dekorasi yang tidak diperlukan.
-   Jangan membuat angka atau data lokasi fiktif.
-   Jangan menghapus rekaman duplikat tanpa proses audit dan aturan
    eksplisit.
-   Jangan menganggap data kosong sama dengan nol.
-   Jangan menyatakan data real-time.
-   Prioritaskan hasil yang berfungsi, mudah dipelihara, dan mudah
    diperbarui.

**Definisi selesai:** PDPSI versi pertama dapat dibuka publik,
menampilkan statistik dan peta persebaran yang bersumber dari dataset
terverifikasi, menyediakan tabel pencarian, detail rekaman, serta
unduhan data dengan metodologi dan sumber yang jelas.

## 18. Riwayat Perubahan

  -----------------------------------------------------------------------
  Versi   Tanggal         Perubahan
  ------- --------------- -----------------------------------------------
  1.0     4 Nov 2026      Draft awal

  1.1     4 Nov 2026      Tambah §1.1 Source Fidelity & Data
                          Transparency (prinsip permanen); §6.5 nama
                          lembaga/pemegang izin HTR tampil sesuai sumber
                          dan penanda Duplikat; §7.1 tujuh kategori skema
                          tidak digabung; §7.3 ketidaksesuaian hanya
                          ditandai, anggota sumber dan hasil perhitungan
                          L+P dibedakan. Rincian: `docs/DECISIONS.md`.
  1.2     5 Nov 2026      §7.1 rekap memakai 5 jenis PS; Kemitraan
                          Kehutanan = 3 subskema sumber dengan rincian
                          selalu tampil (K8 diubah).
  -----------------------------------------------------------------------
