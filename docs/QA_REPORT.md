# Laporan QA PDPSI (Tahap 7)

**Tanggal:** 2026-11-05
**Build yang diuji:** commit kerja setelah Tahap 3 dan 7, rilis data draf `2026-11-02.r3`. Pembaruan 2026-11-06: rincian anggota laki-laki/perempuan (K2) dan rilis `2026-11-02.r4`; uji diulang (bagian 1), Lighthouse tidak diulang, batas wilayah `bps-2020-gb9469f09-kemendagri2025`.
**Status publikasi:** belum diterbitkan. Rilis tetap draf sampai K7 dan K9 selesai (lihat bagian 6).

## 1. Pengujian otomatis

| Lapisan | Alat | Hasil |
|---------|------|-------|
| Pipeline data dan batas wilayah | pytest | 42 lulus |
| Logika web (agregasi, filter, data grafik) | Vitest | 34 lulus |
| E2E + aksesibilitas (axe WCAG 2.2 AA) | Playwright | 116 lulus (diulang setelah desain ulang shadcn/ui dan filter anggota/pendamping); 19 rute × 3 lebar layar (375, 768, 1280 px) tanpa pelanggaran axe dan tanpa geser horizontal |
| Tipe | `tsc --noEmit` | lulus |

Cakupan e2e meliputi: tautan lewati-ke-konten, menu ponsel (buka, tutup dengan Escape, fokus kembali), ganti bahasa, filter dan pencarian, urutan kolom, paginasi, unduhan sesuai filter (isi = tabel, kolom = rilis), referensi duplikat, nilai sumber apa adanya (spasi ganda, kosong), grafik (render, pilihan ukuran, tabel data, label di ponsel), peta (render, drill-down, URL, panel, tautan ke data), peta mini, halaman Tentang (daftar isi, angka dari rilis), keamanan rute unduhan, 404, dan regresi pengalihan berulang perutean bahasa.

## 2. Kinerja (Lighthouse 13.6, profil ponsel, jaringan 4G lambat tersimulasi)

| Halaman | Performa | Aksesibilitas | Best practices | LCP | CLS | TBT | JS (transfer) |
|---------|---------:|--------------:|---------------:|----:|----:|----:|--------------:|
| Beranda | 100 | 100 | 100 | 1,1 s | 0 | 10 ms | 157 KB |
| Data | 100 | 100 | 100 | 0,9 s | 0 | 10 ms | 160 KB |
| Statistik | 100 | 100 | 100 | 1,1 s | 0 | 50 ms | 337 KB |
| Peta | 100 | 100 | 100 | 1,1 s | 0 | 60 ms | 453 KB |
| Tentang | 100 | 100 | 100 | 0,8 s | 0 | 10 ms | 157 KB |

**Pengukuran ulang 2026-11-06 setelah desain ulang dengan shadcn/ui (DESIGN.md v0.4):**

| Halaman | Performa | Aksesibilitas | Best practices | LCP | CLS | TBT | JS (transfer) |
|---------|---------:|--------------:|---------------:|----:|----:|----:|--------------:|
| Beranda | 100 | 100 | 100 | 1,1 s | 0 | 10 ms | 213 KB |
| Data | 100 | 100 | 100 | 0,9 s | 0 | 10 ms | 204 KB |
| Statistik | 100 | 100 | 100 | 1,1 s | 0 | 80 ms | 390 KB |
| Peta | 99 sampai 100 | 100 | 100 | 1,1 s | 0 | 70 sampai 120 ms | 506 KB |
| Tentang | 100 | 100 | 100 | 0,9 s | 0 | 10 ms | 201 KB |

JS naik sekitar 45 sampai 55 KB per halaman karena Radix (sidebar, laci, toggle, collapsible) dan ikon lucide. Pengukuran pertama Peta setelah server baru dinyalakan memberi skor 75 (TBT 1,4 s); dua pengukuran ulang memberi 99 dan 100, jadi itu efek server dingin.

SEO bernilai 60 karena semua halaman sengaja memakai `noindex` selama rilis masih draf. Nilai ini akan naik setelah `robots` dibuka saat publikasi.

Catatan anggaran: target awal TECHNICAL_PLAN §8 (Beranda < 120 KB, Data < 100 KB JS) tidak tercapai karena React 19, Next.js 16, dan next-intl sendiri sekitar 155 KB terkompresi. Yang sudah dilakukan: teks antarmuka yang dikirim ke browser dibatasi ke namespace yang dipakai komponen klien, ECharts baru dimuat saat grafik mendekati layar (Beranda turun dari 332 KB ke 157 KB), dan MapLibre hanya dimuat di halaman Peta. Anggaran di TECHNICAL_PLAN §8 sudah diperbarui dengan angka terukur.

## 3. Keamanan dan privasi

- Header: `Content-Security-Policy` (produksi; semua sumber dari domain sendiri, tanpa skrip, font, atau tile pihak ketiga), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. Diperiksa: tidak ada pelanggaran CSP di konsol pada Beranda, Statistik, Peta, Data, dan Tentang.
- Tidak ada cookie. Perutean bahasa tidak lagi memakai middleware, jadi cookie `NEXT_LOCALE` juga tidak dipasang.
- Sejak rilis r7 semua kolom tabular GoKUPS dipublikasikan apa adanya, termasuk nama ketua lembaga, pra-pendamping, dan pendamping, atas keputusan pemilik produk (K11). Pemindaian kebocoran nama tidak lagi relevan; yang diuji pipeline sekarang adalah nilai ketiga kolom di rilis sama persis dengan sumber. Pemindaian 2026-11-06 sebelum perubahan ini (rilis r6) tidak menemukan kebocoran.
- Rute unduhan hanya melayani file di manifes rilis; `internal/` tidak bisa diakses (diuji).
- CSV (unduhan web dan file rilis) menetralkan teks berawalan `=`, `+`, `-`, `@` dengan awalan `'` dan menyebut jumlahnya di metadata. Rilis r7 punya 10 nilai seperti itu (Ketua Lembaga berawalan "-"); nilai asli tetap di XLSX dan `approvals.json` (diuji pipeline).
- Parameter filter divalidasi; parameter tidak dikenal diabaikan dan disebutkan di halaman.

## 4. Kesiapan deploy

- `output: "standalone"`; `Dockerfile` multi-stage (Node 26, pengguna non-root); `.dockerignore` mengecualikan workbook, `data/source`, dan semua `internal/`.
- Build standalone diuji langsung (`node server.js`, `HOSTNAME=0.0.0.0`) dengan host `localhost`, `127.0.0.1`, dan host lain: semua rute 200, `/id/...` dialihkan ke `/...`, unduhan dan batas wilayah tersedia. Build image Docker belum diuji karena daemon Docker tidak berjalan di mesin pengembangan.
- Masalah yang ditemukan dan diperbaiki: rewrite bahasa lewat middleware next-intl menyebabkan pengalihan berulang bila host pengunjung berbeda dari origin server (terjadi di Docker dan di belakang reverse proxy). Perutean bahasa dipindah ke `rewrites`/`redirects` di `next.config.ts`; ada uji regresi.

## 5. Delivery Gate `/antislop` (mode *during*)

Dial: **ENERGY 1 / RHYTHM 2 / MOTION 1** (DESIGN.md §1).

### Blok 1: Hard Gate (semua harus "tidak")

| Butir | Hasil | Bukti |
|-------|-------|-------|
| R-02 em dash di teks | PASS | `grep` em dash dan en dash di `src/messages`, `src/app`, `src/components`: 0 |
| R-03 rusak di ponsel | PASS | Playwright: tidak ada overflow pada 19 rute di 375 px; dua kasus overflow (tabel Statistik, pilihan jenis PS di Peta EN) ditemukan dan diperbaiki |
| R-17 angka tanpa sumber | PASS | Semua angka dihitung dari rilis; setiap blok angka memuat baris sumber dan label hasil pengolahan |
| R-18 testimoni fiktif | PASS | Tidak ada |
| R-23 aset tanpa konfirmasi | PASS, dengan catatan | Logo tidak dibuat; nama PDPSI tampil sebagai teks. Ikon tab browser adalah placeholder berlabel di kode (`src/app/icon.svg`) sampai logo institusi ditetapkan (K9) |
| R-24 tautan navigasi tanpa tujuan | PASS | 6 menu menuju halaman yang ada (uji e2e) |
| R-25 kontras | PASS | axe `color-contrast` 0 pelanggaran; token diuji `contrast-check.py` |
| R-26 kontrol mati | PASS | Klik-tuntas e2e: menu, filter, urutan, paginasi, pilihan ukuran grafik, tombol tabel, peta (pilih wilayah, kembali), unduhan |
| R-27 keadaan kosong/memuat/galat | PASS | Kosong: hasil filter kosong, wilayah tanpa rekaman. Memuat: ruang grafik dan peta dipesan (CLS 0). Galat: grafik dan peta gagal dimuat menampilkan pesan + tabel |
| R-28 FAQ templat | PASS | Tidak ada FAQ |
| R-32 keyboard | PASS | Lewati-ke-konten, cincin fokus `--accent-earth`, Escape pada menu, pilihan wilayah peta lewat daftar dan tabel |
| R-33 patch lewat skrip | PASS | Tidak ada. `scripts/copy-vendor.mjs` hanya menyalin worker MapLibre, tidak mengubah sumber |
| R-34 tema rusak | PASS | Satu tema (terang) sesuai keputusan F |
| R-35 tidak dijalankan | PASS | Build produksi, `next start`, dan standalone dijalankan; klik-tuntas e2e tercatat di bagian 1 |
| R-36 klaim palsu | PASS | Tidak ada klaim keamanan atau kinerja di UI |
| R-37 tanpa arah desain | PASS | DESIGN.md dari arahan pemilik produk |
| R-38 konten karangan | PASS | Institusi, kontak, lisensi tampil "Belum ditetapkan" |

### Blok 2: Purpose-Gate

| Butir | Hasil | Alasan tertulis |
|-------|-------|-----------------|
| R-01 gradien/glow | PASS | Tidak dipakai |
| R-04 ikon | PASS | Hanya kontrol zoom peta dan tanda +/− panel filter; warna skema selalu disertai teks |
| R-06 tipografi | PASS | Atkinson Hyperlegible Next dipilih untuk keterbacaan (DESIGN.md §4) |
| R-07 latar grid | PASS | Tidak dipakai |
| R-08 panah tombol | PASS | Hanya "›" pada remah roti peta |
| R-09 badge | PASS | Satu badge fungsional: "Duplikat" |
| R-10 glassmorphism | PASS | Tidak dipakai |
| R-12 bayangan | PASS | Hanya tooltip peta (melayang di atas isian berwarna) |
| R-13 glow | PASS | Tidak dipakai |
| R-14 kartu fitur seragam | PASS | Tidak ada kartu fitur; angka memakai motif lembar data |
| R-19 animasi | PASS | Tanpa animasi masuk; hanya transisi kamera peta (konteks drill-down) |
| R-22 ilustrasi | PASS | Tidak dipakai |

### Blok 3: Keaktifan

| Butir | Hasil |
|-------|-------|
| Dial dinyatakan | Ya, ENERGY 1 / RHYTHM 2 / MOTION 1 |
| Keluaran sesuai dial | Ya: komposisi berbeda per halaman (beranda editorial, peta, tabel padat, teks panjang), gerak minimal |
| Satu titik fokus per layar | Ya: angka nasional + peta mini (Beranda), peta (Peta), tabel (Data), teks (Tentang) |
| Ruang kosong struktural | Ya: garis rambut dan jarak antarbagian |
| Satu aksen | Ya: cokelat tanah untuk fokus, badge Duplikat, dan sorotan wilayah |
| Motif identitas | Ya: blok "lembar data" (angka, satuan, keterangan, baris sumber) |
| Design Read | Ya, DESIGN.md §1 |

### Blok 4: Kriya dan konsistensi

Semua butir "tidak": tidak ada keputusan yang alasannya hanya "bawaan AI", tidak ada kontrol mati, tidak ada bagian templat, UI tahan keadaan kosong dan galat di semua lebar layar dan tanpa tetikus, tidak ada klaim karangan, tidak ada tata letak templat, radius konsisten (2 dan 4 px), tidak ada CTA generik atau kata buzzword, palet 2 warna inti + 1 aksen (warna jenis PS khusus data), tidak meniru produk lain.

**Kesimpulan Delivery Gate: PASS** untuk rilis draf. Belum layak terbit sebagai rilis publik karena K7 dan K9 (bagian 6).

## 6. Yang masih menghalangi publikasi

| Butir | Keterangan | Pemilik |
|-------|------------|---------|
| K9 | Nama institusi pengelola, logo, kontak, dan lisensi data PDPSI. Diisi di `config/site.json`; rilis otomatis berstatus `published` bila nama institusi dan lisensi terisi, lalu pipeline dijalankan ulang | Institusi |
| K7 | Pemeriksaan manual crosswalk kode wilayah (`data/reference/region_crosswalk.csv`, kolom `verified_by_human`) | Pengelola data |
| Tinjauan istilah | Definisi jenis PS dan terjemahan di `docs/TERMINOLOGY.md` | Pakar kebijakan PS |
| Hosting | Server atau layanan hosting dan domain institusi; lalu `robots` dibuka (hapus `noindex` di `src/app/[locale]/layout.tsx`) | Institusi |
| Remote git | Visibilitas repositori (K10). Workbook sumber dan `internal/` sudah dikecualikan dari git | Institusi |
