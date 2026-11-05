# Rencana Implementasi PDPSI

**Status:** Tahap 0, 1, dan 2 selesai (2026-11-05), ditambah rekap provinsi × kabupaten/kota × jenis PS (rilis `2026-11-02.r3`); menunggu arahan untuk Tahap 3. Hasil Tahap 2: 7 rute dalam 2 bahasa terhubung ke rilis draf `2026-11-02.r2`; Vitest 9 lulus, Playwright + axe 51 lulus (375/768/1280 px), pytest pipeline 28 lulus.
**Urutan:** data dan peta lebih dulu, karena keduanya membawa risiko terbesar (PRD §14). Setiap tahap punya kriteria selesai yang bisa diperiksa. Tahap berikutnya dimulai setelah tahap sebelumnya disetujui.

**Aturan permanen untuk semua tahap:** prinsip Source Fidelity & Data Transparency (PRD §1.1, DECISIONS.md bagian 1). Setiap fitur yang menampilkan data harus memakai nilai `source` apa adanya, memberi label pada hasil pengolahan, dan menampilkan penanda ketidaksesuaian.

---

## Status keputusan

Rincian lengkap, konsekuensi, dan nilai bawaan ada di `docs/DECISIONS.md`. Ringkasan per 2026-11-04 (setelah konsolidasi sebelum Tahap 2):

| # | Keputusan | Status | Penerapan |
|---|-----------|--------|-----------|
| K1 | Perhitungan anggota | Ditetapkan | L+P bila keduanya tersedia dan ≥ 0, termasuk 0; negatif = anomali; kolom sumber tetap tampil |
| K2 | Statistik gender | Menunggu | Tidak ada statistik gender agregat |
| K3 | Nama lembaga/pemegang izin HTR | Ditetapkan | Ditampilkan sesuai sumber, tanpa penyamaran |
| K4 | Nomor SK sama | Ditetapkan | Semua dihitung; penanda Duplikat + referensi ke semua rekaman terkait |
| K5 | Anomali luas | Ditetapkan | Ambang 5 ha hanya penanda; tidak ada rekaman yang dikeluarkan |
| K6 | Lisensi batas wilayah | Menunggu | Tidak ada geometri di aplikasi sampai lisensi jelas |
| K7 | Verifikasi kode wilayah | Sebagian | Kode resmi; cek silang otomatis lolos; verifikasi manusia belum |
| K8 | Kategori skema dan jenis PS | Ditetapkan (diubah 2026-11-05) | Rekap 5 jenis PS; Kemitraan Kehutanan dengan rincian 3 subskema; 7 kategori sumber tetap disimpan |
| K9 | Institusi dan lisensi data | Menunggu | `config/site.json` berisi `null`; tampil "Belum ditetapkan"; rilis tetap draf |
| K10 | Git | Sebagian | Repositori lokal + `.gitignore`; belum ada commit/remote |

**K6 dan K9 harus selesai sebelum rilis publik final.** Pembangunan aplikasi boleh berjalan, tetapi tidak menerbitkan rilis publik final atau mendistribusikan geometri yang belum jelas lisensinya.

## Tahap 1: Pipeline data dan rilis pertama (selesai)

Hasil: rilis draf `2026-11-02.r2` (menggantikan draf `2026-11-02` yang masih memakai penyamaran nama dan pengecualian luas). 28 uji pipeline lulus.

**Tujuan:** rilis data pertama yang tervalidasi, dengan angka yang bisa dipertanggungjawabkan.

Pekerjaan:
1. Siapkan `pipeline/` (Python 3.12 via `uv`, pandas, openpyxl, pytest).
2. Salin workbook ke `data/source/` (salinan, file asli tidak dipindah; folder ini di-`.gitignore`) dan catat checksum.
3. Implementasi ingest → normalize → regions → quality → privacy → aggregate → export (TECHNICAL_PLAN §4.5).
4. Buat `data/config/scheme_map.csv`, `data/config/quality_rules.json`, dan `data/reference/region_crosswalk.csv` (kode resmi, cek silang dua sumber, `verified_by_human = false`).
5. Hasilkan rilis `2026-11-02` dan laporan kualitas.
6. Draf teks Metodologi berdasarkan keputusan di `docs/DECISIONS.md`.
7. Cek sampel baris anggota bermasalah ke halaman detail GoKUPS untuk memastikan masalahnya ada di sumber atau di ekstraksi. Pemeriksaan ini dilakukan pengelola; pipeline tidak mengakses GoKUPS.

Selesai jika:
- `pytest` hijau. Nilai sumber yang dipublikasikan sama persis dengan workbook (diuji per kolom per rekaman).
- Isi kolom Ketua, Pra-Pendamping, dan Pendamping tidak muncul di keluaran publik (diuji otomatis).
- 407/407 wilayah terpetakan ke kode resmi.
- Laporan pemeriksaan sudah ditinjau pengelola. Rilis berstatus `draft` sampai K6 dan K9 selesai.

## Tahap 2: Fondasi aplikasi dan sistem desain

**Tujuan:** kerangka web yang berjalan dengan data rilis asli, tanpa angka contoh.

Pekerjaan:
1. Next.js App Router + TypeScript strict, `.nvmrc`.
2. Tailwind CSS v4 dengan token dari `DESIGN.md`; font Atkinson Hyperlegible Next lewat `next/font`.
3. i18n dengan next-intl (`/` = id, `/en` = en).
4. Layout global: tautan lewati-ke-konten, header (PDPSI sebagai teks, 6 menu, `ID | EN`), banner "rilis draf", footer (sumber, waktu pengambilan data, versi rilis, institusi dari `config/site.json`).
5. Komponen dasar: blok angka "lembar data", baris sumber, catatan data, keadaan kosong, referensi duplikat.
6. Modul `src/lib/data/` (server saja): memuat rilis aktif, agregasi TypeScript, format angka per bahasa. Uji Vitest: agregasi TS = total kontrol Python.
7. Halaman dengan integrasi awal: Beranda (angka nasional dengan label hasil pengolahan dan cakupan), Data (daftar sederhana berhalaman), Detail rekaman (data sumber, hasil pengolahan, penanda, referensi Duplikat), Statistik (tabel per kategori skema), Unduh (daftar file rilis), Tentang (prinsip dan sumber), Peta (keadaan "belum tersedia" karena K6).
8. Uji Playwright + axe di 375, 768, 1280 px dan navigasi keyboard.

Bukan bagian Tahap 2: peta interaktif, grafik, filter dan pencarian tabel, ekspor terfilter.

Selesai jika: semua rute tampil dengan layout di dua bahasa, data rilis terbaca di server, uji konsistensi angka hijau, axe tanpa pelanggaran, dan tidak ada data uji atau angka contoh di halaman.

## Tahap 3: Peta

**Tujuan:** peta choropleth provinsi → kabupaten/kota yang mengikuti filter.

Pekerjaan:
1. **Spike geometri (hari pertama tahap ini):** unduh, sederhanakan, dan ukur file provinsi dan kabupaten (MAP_DATA_AUDIT §5). Hentikan dan laporkan bila target ukuran tidak tercapai.
2. Pipeline geometri `geo/` dengan mapshaper, output ke `public/geo/<versi>/` + `boundary_release.json`.
3. Komponen peta MapLibre: choropleth, legenda, panel wilayah, drill-down, tombol kembali, filter skema, pemilih indikator, state di URL.
4. Tabel alternatif wilayah dan kontrol keyboard.
5. Keadaan kosong, tidak valid, dan gagal muat (MAP_DATA_AUDIT §8).
6. Atribusi sumber batas dan catatan "agregasi data administratif".

Selesai jika: kriteria peta PRD §13 terpenuhi, angka panel sama dengan `/data` untuk filter yang sama (uji E2E), dan peta bisa dipakai di layar 375 px.

## Tahap 4: Data, detail, dan unduhan

Pekerjaan:
1. `/data`: tabel dirender server, pencarian, filter provinsi/kabupaten/skema/tahun, sorting, paginasi, jumlah hasil, reset; tampilan kartu di ponsel.
2. `/data/[id]`: detail rekaman, catatan kualitas, sumber, dan versi rilis. Halaman untuk ID yang sudah tidak ada di rilis aktif.
3. `/download` dan `/download/export`: file lengkap dari pipeline dan ekspor terfilter (CSV + XLSX dengan metadata).

Selesai jika: hasil unduhan terfilter sama persis dengan isi tabel untuk filter yang sama (uji otomatis), dan CSV serta XLSX terbuka benar di Excel dan LibreOffice.

## Tahap 5: Beranda dan statistik

Pekerjaan:
1. Beranda: 4 kartu (rekaman persetujuan, provinsi tercakup, luas, anggota bila K1 disetujui), peta mini SVG, komposisi skema, wilayah teratas, tautan ke Peta/Data/Unduh, sumber dan tanggal.
2. `/statistics`: distribusi skema, provinsi, top 10 kabupaten/kota, luas dan anggota per provinsi, perbandingan skema per wilayah; filter global; setiap grafik punya judul, satuan, sumber, dan tabel data.

Selesai jika: setiap angka grafik sama dengan hasil agregasi modul tunggal untuk filter yang sama (uji Vitest + E2E).

## Tahap 6: Konten dan bahasa

Pekerjaan:
1. Halaman Tentang/Metodologi (PRD §6.7) dari draf Tahap 1.
2. Semua teks antarmuka (label, tooltip, pesan kosong, keterangan grafik) ditulis dengan **`/antislop`** (`antislop-copywriting`).
3. Penyuntingan akhir dengan **`/humanizer`** untuk teks Indonesia dan Inggris, tanpa mengubah angka, definisi, atau istilah kebijakan.
4. Tinjauan terjemahan istilah skema oleh orang yang memahami kebijakan PS.

Selesai jika: tidak ada placeholder kecuali label "[Menunggu institusi]" yang disetujui (K9), dan semua halaman lengkap dalam dua bahasa.

## Tahap 7: QA dan publikasi

Pekerjaan:
1. Playwright E2E di 375, 768, dan 1280 px; axe-core; uji keyboard manual pada peta, filter, dan tabel.
2. Lighthouse terhadap anggaran kinerja (TECHNICAL_PLAN §8).
3. Pemeriksaan konsistensi desain dan konten, serta Delivery Gate `/antislop` dengan bukti klik per elemen.
4. Pemeriksaan kebocoran data pribadi: cari nama ketua/pendamping di build output dan unduhan.
5. Deploy ke staging, tinjauan institusi, lalu produksi.

Selesai jika: semua kriteria penerimaan PRD §13 terpenuhi dengan bukti tertulis.

## Ringkasan urutan dan ketergantungan

```text
K1–K10 ──► Tahap 1 (data) ──► Tahap 2 (fondasi + desain) ──┬─► Tahap 3 (peta)
                                                          ├─► Tahap 4 (data & unduhan)
                                                          └─► Tahap 5 (beranda & statistik)
                                                                    │
                                              Tahap 6 (konten) ◄────┘
                                                    │
                                              Tahap 7 (QA & publikasi)
```

Tahap 3, 4, dan 5 bisa berjalan paralel setelah Tahap 2, karena ketiganya hanya bergantung pada modul data dan sistem desain. Spike geometri (Tahap 3, langkah 1) boleh dimajukan ke paralel dengan Tahap 1 bila lisensi batas sudah jelas.
