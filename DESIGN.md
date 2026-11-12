# DESIGN.md: Data KUPS (sebelumnya PDPSI)

**v0.6, 2026-11-12 (berlaku, menggantikan palet v0.5):** atas permintaan pemilik produk, logo dan warna mengikuti identitas TRI. Logo Data KUPS tidak dipakai lagi; navbar dan footer memakai logo The Reform Initiatives dengan nama "Data KUPS" sebagai teks, dan ikon situs memakai tanda TRI. Palet: merah logo TRI `#FC0F47` untuk aksen dan hiasan; tombol utama `#E3063B` (teks putih 4,82:1; merah logo hanya 3,96:1 sehingga tidak dipakai di bawah teks kecil); permukaan gelap `#A3042A` (hero, footer, menu ponsel; teks putih 8,05:1); tautan dan label kecil `#C4052F`; permukaan terang `#FDE8ED`; latar `#F8F5F5`; teks `#2A2426`; teks sekunder `#6E6265`. Ramp peta menjadi merah muda ke merah tua; wilayah terpilih di peta digaris arang `#2A2426`. Warna 5 jenis PS tidak berubah karena membedakan kategori data. Nama token CSS lama (`forest`, `deep`, `leaf`) dipertahankan agar kode tidak berubah, tetapi nilainya kini merah.

**v0.5, 2026-11-10 (berlaku, menggantikan bagian yang bertentangan di bawah):** atas permintaan pemilik produk, nama produk menjadi Data KUPS dan tampilan didesain ulang. Ringkasnya:
- **Palet TRI:** TRI Red `#E3063B` (primer: tombol utama, penanda aktif), Forest Green `#173F35` (permukaan gelap: hero, footer, menu ponsel), Deep Green `#28664F` (tautan, aksen), Light Green `#DCE9DF` (permukaan), Background `#F4F6F2`, Text `#25332D`. Merah TRI di atas latar hanya 4,43:1, jadi teks merah kecil memakai `--color-tri-ink` `#C4052F` (5,66:1). Teks putih di atas merah 4,82:1. Teks sekunder `#56645C` (5,73:1 pada latar). Warna 5 jenis PS dan ramp peta tidak berubah.
- **Tipografi:** Plus Jakarta Sans untuk judul, Atkinson Hyperlegible Next untuk teks, JetBrains Mono untuk label kecil (eyebrow, versi).
- **Tata letak:** navigasi atas dengan sorotan yang bergeser (gaya VengeanceUI) menggantikan sidebar; menu ponsel berupa panel hijau hutan dari kanan. Footer hijau hutan memuat logo Data KUPS dan TRI.
- **Gerak (MOTION 1 → 3), mengacu pada VengeanceUI, Animmaster, dan React Bits:** judul muncul per kata, kartu muncul saat digulir, angka utama menghitung naik, lingkaran sorot mengikuti kursor di kartu, latar titik/grid dan dua cahaya yang bergerak pelan di hero, sapuan radar di sekitar tanda Data KUPS, pita provinsi berjalan, transisi masuk halaman, dan penanda memuat lima batang. Semua gerak mati bila pengguna meminta gerak dikurangi, dan konten tetap tampil tanpa JavaScript (`src/components/motion/`).
- Prinsip lembar data, kontras, keyboard, dan ponsel 375 px tetap berlaku.


**Status:** v0.4, 2026-11-06. v0.4: atas permintaan pemilik produk, tampilan memakai komponen **shadcn/ui** (Radix, gaya `radix-nova`) dengan tata letak dasbor bersidebar. Identitas PDPSI tetap: palet hijau hutan, putih hangat, abu-abu netral, aksen cokelat tanah, palet 5 jenis PS, skala peta, dan Atkinson Hyperlegible Next.
v0.3, 2026-11-05. v0.3: palet diganti menjadi 5 warna jenis PS yang divalidasi untuk urutan rekap.
v0.2, 2026-11-04. Arah ditetapkan pemilik produk (DECISIONS.md bagian 3, keputusan F): Swiss minimal dan editorial, Atkinson Hyperlegible Next, mode terang saja untuk MVP. Nilai token sudah diuji kontras dan keamanan buta warna. v0.2: palet skema diperluas ke 7 kategori.
**Dipakai bersama:** `/antislop` mode *during* (filter), `/ui-ux-pro-max` (pedoman UX), `docs/MAP_DATA_AUDIT.md` (aturan peta).

---

## 1. Arah dan karakter

Dari pemilik produk:
- Swiss minimal dan editorial.
- Institusional, modern, kredibel, berorientasi pada keterbacaan data.
- Hijau kehutanan, putih hangat, abu-abu netral.
- Bukan dashboard korporat generik.
- Peta interaktif adalah fitur utama.
- **Diubah 2026-11-06:** tata letak dasbor dengan sidebar dan komponen shadcn/ui (kartu, tabel, toggle, select, sheet, breadcrumb, badge). Agar tetap tidak generik: warna dan tipografi PDPSI, setiap angka tetap membawa satuan dan baris sumber, tidak ada ikon dekoratif di kartu angka, dan tidak ada grafik hiasan.

**Design Read:** portal data publik untuk masyarakat umum, peneliti, jurnalis, dan pemerintah, dengan bahasa visual Swiss editorial. **Dial: ENERGY 1 / RHYTHM 2 / MOTION 1.**
- ENERGY 1: tenang dan institusional. Yang menonjol adalah angka dan peta, bukan dekorasi.
- RHYTHM 2: tiap halaman punya komposisi sendiri (beranda editorial, peta layar penuh, tabel padat, metodologi berupa teks panjang), tetapi grid dan aturan tipografinya sama.
- MOTION 1: hanya perubahan state hover/fokus dan transisi kamera peta. Tidak ada animasi masuk atau scroll reveal.

**Motif identitas: "lembar data".** Setiap angka utama tampil sebagai blok berisi angka besar, satuan yang tertulis, satu kalimat keterangan, dan baris sumber kecil di bawahnya (sumber, tanggal ekstraksi, cakupan). Sejak v0.4 blok ini berupa kartu shadcn (`Card`) berbingkai garis 1 px `--border`, tanpa bayangan. Motif ini diulang di beranda, panel peta, statistik, dan detail rekaman, sehingga portal terasa seperti publikasi statistik yang bisa dicek, bukan aplikasi SaaS.

## 2. Prinsip

1. **Angka selalu membawa konteks.** Satuan, cakupan ("dihitung dari N dari M rekaman"), sumber, dan tanggal. Angka tanpa konteks tidak ditampilkan.
2. **Jujur tentang kekosongan.** Kosong, nol, dan tidak valid tampil berbeda dan diberi label. Tidak ada angka pengganti.
3. **Satu fokus per layar.** Beranda: angka nasional + peta mini. `/map`: peta. `/data`: tabel. `/about`: teks.
4. **Teks lebih dulu dari ikon.** Ikon hanya dipakai bila maknanya langsung terbaca (zoom, tutup, unduh, kembali), selalu dengan label aksesibel.
5. **Bisa dipakai dengan keyboard dan di ponsel 375 px.** Ini bukan tambahan, melainkan syarat selesai.

## 3. Warna

Semua nilai di bawah sudah diuji: rasio teks dengan `antislop-human/contrast-check.py` (WCAG 2), palet grafik dengan `dataviz/validate_palette.js`.

### 3.1 Token antarmuka

Pemetaan ke variabel shadcn (v0.4, `src/app/globals.css`): `--background` = surface, `--card`/`--popover` = surface-raised, `--muted`/`--secondary`/`--sidebar` = surface-sunken, `--foreground` = ink, `--muted-foreground` = ink-muted, `--border` = rule, `--input` = rule-strong (batas kontrol ≥ 3:1), `--primary` = forest, `--ring` = accent-earth, `--accent` = tint hijau `#E7EEE8` (latar hover), `--sidebar-accent` = `#E3DDD0` (menu aktif), `--chart-1..5` = 5 warna jenis PS.

| Token | Hex | Pemakaian | Kontras | Alasan |
|-------|-----|-----------|---------|--------|
| `--surface` | `#FAF8F3` | Latar halaman | – | Putih hangat sesuai arahan; lebih lembut dari putih murni untuk bacaan panjang |
| `--surface-raised` | `#FFFFFF` | Tabel, panel peta, input | – | Membedakan area kerja dari latar tanpa bayangan |
| `--surface-sunken` | `#F1EEE6` | Baris sumber, blok catatan, header tabel | – | Pembeda tingkat ketiga |
| `--ink` | `#1F2420` | Teks utama | 14,86:1 pada surface | Hitam kehijauan agar senada dengan palet |
| `--ink-muted` | `#575E58` | Teks sekunder, baris sumber | 6,29:1 pada surface; 5,76:1 pada sunken | Lolos AA untuk teks kecil |
| `--rule` | `#DAD5CA` | Garis rambut pemisah, border tabel | 1,38:1 (dekoratif, bukan pembawa informasi) | Garis tipis motif lembar data |
| `--rule-strong` | `#8C8F87` | Border input, garis kontrol | 3,09:1 pada surface | Lolos 3:1 untuk komponen UI non-teks |
| `--forest` | `#1E5A3A` | Warna primer: tautan, tombol utama, judul aktif | 7,67:1 pada surface; teks putih di atasnya 8,14:1 | Hijau kehutanan yang cukup gelap untuk teks |
| `--forest-hover` | `#174A2F` | Hover tombol/tautan | lebih tinggi dari `--forest` | |
| `--accent-earth` | `#8A4B1E` | Satu-satunya aksen: cincin fokus, wilayah terpilih di legenda, penanda filter aktif | 6,37:1 pada surface | Cokelat tanah memberi satu titik perhatian yang tidak bersaing dengan hijau peta |

Palet inti: hijau hutan + netral hangat, ditambah satu aksen (R-29). Tidak ada gradien, glow, atau glassmorphism.

### 3.2 Warna jenis PS (kategorikal)

Rekap dan grafik memakai 5 jenis PS (DECISIONS.md K8). Satu warna = satu jenis PS di seluruh aplikasi. Tiga subskema Kemitraan Kehutanan memakai warna Kemitraan Kehutanan dan dibedakan dengan label teks, karena ketiganya adalah rincian dari satu jenis.

| Urutan | Jenis PS | Kode | Hex |
|--------|----------|------|-----|
| 1 | Hutan Desa | HD | `#2F8F5B` |
| 2 | Hutan Kemasyarakatan | HKM | `#2F6FB0` |
| 3 | Hutan Tanaman Rakyat | HTR | `#CF5F3A` |
| 4 | Hutan Adat | HA | `#9A5AA8` |
| 5 | Kemitraan Kehutanan (+ 3 subskema) | KK | `#D08A1A` |

Cara memilih (v0.3, 2026-11-05): palet 7 kategori versi sebelumnya gagal untuk urutan 5 jenis PS (Hutan Desa dan Hutan Kemasyarakatan nyaris sama bagi pembaca protan, ΔE 1,8). Semua 2.520 cara menempatkan 5 dari 7 warna tervalidasi ke urutan di atas diuji dengan validator dataviz, lalu dipilih yang jarak buta warna terburuknya terbesar. Hasil (mode terang, surface `#FAF8F3` dan `#FFFFFF`, pasangan bersebelahan): pita lightness PASS, chroma PASS, CVD ΔE terburuk 17,5 (HD↔HKM, deutan) PASS, normal-vision ΔE 18,6 PASS. Kontras KK terhadap surface 2,7:1 (di bawah 3:1).

**Kewajiban karena kontras KK:** grafik bertumpuk wajib punya legenda, tooltip, jarak 2 px antar-segmen, dan tampilan tabel. Teks label memakai `--ink`, bukan warna jenis PS. Grafik satu seri (mis. rekaman per provinsi) memakai satu warna `--forest` tanpa legenda.

### 3.3 Skala choropleth (sekuensial)

| Kelas | Hex | Teks di atasnya |
|-------|-----|-----------------|
| 1 (terendah) | `#8FBB76` | `--ink` |
| 2 | `#68A058` | `--ink` |
| 3 | `#458343` | putih (4,58:1) |
| 4 | `#276633` | putih (6,92:1) |
| 5 (tertinggi) | `#104524` | putih |

Validator ordinal: lightness monoton, selisih antar-kelas ≥ 0,06, satu hue (sebaran 17°), kelas terendah 2,07:1 terhadap surface. Semua PASS.

### 3.4 Keadaan khusus pada peta

| Keadaan | Tampilan | Alasan |
|---------|----------|--------|
| Tidak ada rekaman untuk filter ini | Isian netral hangat `#E2DED5`, label legenda "Tidak ada rekaman" | Berbeda hue dan lightness dari kelas 1; nol tidak tampil sebagai kelas terendah (keputusan C3) |
| Indikator tidak valid / tidak tersedia | Arsiran diagonal 45° `#8C8F87` di atas `#F1EEE6`, label "Data belum dapat ditampilkan" | Pola membedakannya tanpa bergantung pada warna |
| Laut / luar wilayah | `#E6ECEB` | Dingin dan pucat, terpisah dari daratan |
| Batas antar-wilayah | Garis `#FAF8F3` 0,75 px (provinsi), 0,5 px (kab/kota) | Berfungsi sebagai celah antar-isian |
| Wilayah terpilih | Garis `--ink` 2,5 px + nama di panel | Tidak hanya perubahan warna |
| Wilayah difokus keyboard / hover | Garis `--accent-earth` 2 px | Sama dengan aksen fokus di seluruh UI |

## 4. Tipografi

**Keluarga: Atkinson Hyperlegible Next** (Google Fonts, SIL OFL, variabel 200–800), di-host sendiri lewat `next/font`.
- Alasan: dirancang untuk keterbacaan tinggi bagi pembaca dengan penglihatan rendah. Ini cocok untuk portal publik dan dipilih karena alasan itu, bukan sebagai bawaan.
- Hasil evaluasi (file woff2 Google Fonts, 2026-11-04): mendukung fitur `tnum` (angka tabular) dan `pnum`. Angka bawaannya proporsional, jadi tabel dan blok angka wajib memakai `font-variant-numeric: tabular-nums`.
- Satu keluarga untuk semua teks. Karakter editorial dibangun dari skala, bobot, panjang baris, dan garis rambut, bukan dari font kedua.

| Peran | Ukuran / tinggi baris | Bobot | Catatan |
|-------|----------------------|-------|---------|
| Display (angka utama beranda) | 48/52 px (ponsel 36/40) | 700 | Angka proporsional (bukan tabular, agar tidak renggang di ukuran besar), tracking −0,01em |
| H1 | 36/44 px (ponsel 28/36) | 700 | Satu per halaman |
| H2 | 24/32 px | 650 | Garis rambut 1 px `--rule` di atasnya, jarak 12 px |
| H3 | 18/26 px | 650 | |
| Body | 17/28 px | 400 | Panjang baris maks. 68 karakter untuk teks Metodologi |
| Small / tabel | 15/22 px | 400 | Minimum untuk isi tabel |
| Caption / baris sumber | 13/20 px | 400 | Hanya `--ink-muted` ke atas; tidak pernah lebih kecil dari 13 px |

Larangan: label huruf kapital dengan tracking lebar, monospace dekoratif, judul dengan gradien.

## 5. Spacing, grid, bentuk

- Satuan dasar 4 px. Skala: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Kerangka: sidebar 256 px (≥ 1024 px; di bawahnya menjadi laci `Sheet` dari tombol menu di bilah atas), area isi maks. 1400 px, gutter 32 px (desktop), 24 px (tablet), 16 px (ponsel). Teks panjang dibatasi 72 karakter.
- Breakpoint: 375 (dasar), 768, 1024 (sidebar tetap), 1280 (tabel Data 7 kolom; di bawahnya daftar ringkas).
- Radius (v0.4): `--radius` 0,5 rem; kartu 0,7 rem, kontrol 0,4 sampai 0,5 rem, mengikuti skala shadcn.
- Bayangan: hanya panel peta yang mengambang di atas peta (`0 1px 2px rgb(31 36 32 / 0.12)`), karena harus terbaca di atas isian berwarna. Elemen lain memakai garis rambut.
- Target sentuh: minimal 40 px untuk tombol, select, dan menu (WCAG 2.2 AA mensyaratkan 24 px); tautan dalam teks mengikuti tinggi baris.

## 6. Komponen

Komponen dasar dari shadcn/ui di `src/components/ui/` (kode milik proyek, boleh diubah). Perubahan PDPSI pada komponen bawaan:
- `sidebar.tsx`: status buka/tutup tidak disimpan di cookie (situs tanpa cookie); label tombol dan laci memakai teks bahasa aktif; sidebar tetap mulai 1024 px; fokus kembali ke tombol menu saat laci ditutup; `SidebarInset` berupa `div` karena `<main id="konten">` ada di dalamnya.
- `native-select.tsx`: ukuran `lg` (40 px) dan latar kartu.
- `card.tsx`: teks mewarisi ukuran body (bukan 14 px), bingkai `--border`, jarak 20 px.
- `src/lib/utils.ts`: `cn()` memakai tailwind-merge yang mengenali ukuran teks PDPSI (`text-caption`, `text-small`, `text-h3`, ...), agar tidak dianggap warna teks.

| Komponen | Pedoman |
|----------|---------|
| Kerangka | `SidebarProvider` + `AppSidebar` (nama PDPSI sebagai teks, dua kelompok menu: Jelajahi data dan Informasi, versi rilis + badge Draf, tanggal pengambilan data) + `SidebarInset` berisi banner draf, bilah atas, isi, footer. |
| Bilah atas | Tombol menu (`SidebarTrigger`), breadcrumb posisi halaman, pemilih bahasa `ID | EN` berupa dua tautan dengan `aria-current`. Lengket di atas. |
| Footer | Deskripsi singkat, sumber data, tanggal ekstraksi dan versi rilis, institusi pengelola (atau "Belum ditetapkan"), tautan Metodologi. |
| Kartu angka (lembar data) | `Card`: label, angka besar + satuan tertulis, keterangan, baris sumber 13 px di kaki kartu. Tanpa ikon dekoratif. |
| Kartu bagian | `SectionCard`: judul h2, keterangan sumber, isi (tabel/grafik), kaki opsional. Dipakai untuk rekap, grafik, panel detail, dan unduhan. |
| Grafik | `Card` + `ToggleGroup` untuk ukuran (rekaman/luas/anggota) + `Collapsible` berisi `Table` data grafik. |
| Bilah filter | Kartu dengan `Label`, `Input` (ikon cari), `NativeSelect`, `Button`. Form GET biasa (tetap bekerja tanpa JavaScript). Di < 1024 px tersembunyi di balik tombol "Filter dan pencarian" dengan `Badge` jumlah filter aktif. |
| Tabel data | Gaya `Table` shadcn: kepala `--muted`, baris dengan garis `--border` dan hover tipis, angka rata kanan `tabular-nums`, tajuk yang bisa diurutkan dengan ikon panah dan `aria-sort`. |
| Tombol | `Button` default: isi `--primary` (hijau hutan), teks putih. `outline`: garis `--border`, untuk unduhan dan navigasi halaman. Label spesifik, tidak generik. |
| Tautan dalam teks | `--forest` bergaris bawah; komponen shadcn (`data-slot`) memakai gayanya sendiri. |
| Cincin fokus | 2 px `--accent-earth`, offset 2 px, di semua elemen interaktif termasuk komponen shadcn (aturan global di luar `@layer`). |
| Catatan kualitas data | `Alert` dengan ikon info, latar `--muted`. Tidak memakai merah/hijau status. |
| Penanda Duplikat | `Badge` garis cokelat tanah dengan teks "Duplikat". |
| Keadaan kosong / memuat / galat | Kosong: kalimat yang menyebut filter aktif + tautan atur ulang. Memuat: ruang tetap (CLS < 0,1). Galat: penjelasan singkat + tabel alternatif. |
| Placeholder institusi | Teks "Belum ditetapkan" berwarna `--muted-foreground`; tidak ada logo atau nama karangan. |

## 7. Pola grafik (ECharts)

- Bentuk sesuai tugas data. Perbandingan wilayah: batang horizontal terurut. Komposisi skema: batang bertumpuk 100% atau batang berkelompok, bukan donat/pie 3D. Tren tahun (jika dipakai): batang per tahun, karena tahun SK diskret.
- Satu sumbu Y. Tidak ada grafik dua sumbu.
- Batang tipis dengan ujung data membulat 4 px menempel di baseline, jarak 2 px antar-segmen. Grid dan sumbu samar (`--rule`). Label langsung hanya pada nilai penting, bukan setiap batang.
- Setiap grafik: judul berupa kalimat yang menyebut ukuran dan satuan ("Luas persetujuan per provinsi, hektare"), baris sumber, cakupan, tooltip saat hover/fokus, dan tombol "Tampilkan tabel".
- Grafik nominal satu seri (misalnya rekaman per provinsi) memakai satu warna `--forest`, tanpa legenda. Warna skema hanya dipakai bila seri adalah skema.
- Renderer SVG, impor modular `echarts/core`, dimuat setelah halaman tampil dengan ruang yang sudah dipesan.
- Label sumbu dan nilai minimal 13 px; semua label kategori selalu tampil (ECharts tidak boleh menyembunyikannya otomatis).
- Grafik satu seri memakai `--forest`; hanya grafik komposisi bertumpuk yang memakai 5 warna jenis PS.
- Klik batang membuka halaman Data dengan filter yang sama.

## 8. Peta (MapLibre)

Aturan data dan drill-down ada di `docs/MAP_DATA_AUDIT.md` §6–8. Aturan visual:
- Peta mengisi area konten di `/map` (desktop: peta + panel kanan 360 px; ponsel: peta ≥ 60% tinggi layar + bottom sheet yang bisa diciutkan).
- Tanpa basemap. Hanya laut, daratan berisi kelas, dan batas.
- Legenda selalu terlihat: judul indikator + satuan, 5 kelas dengan rentang angka, "Tidak ada rekaman", "Data belum dapat ditampilkan". Di ponsel, legenda ringkas dengan tombol buka.
- Kontrol: zoom +/−, "Kembali ke Indonesia", pemilih indikator, filter skema. Semua tombol berlabel dan bisa diakses keyboard.
- Atribusi sumber batas dan catatan "Peta menampilkan agregasi data per wilayah administratif, bukan lokasi kelompok" selalu tampil di bawah peta.
- Alternatif tabel wilayah tersedia di halaman yang sama (tab "Tabel wilayah").

## 9. Bahasa antarmuka

- Bahasa Indonesia lugas. Istilah kebijakan (Hutan Desa, Hutan Kemasyarakatan, Hutan Tanaman Rakyat, Kemitraan Kehutanan, Hutan Adat) tidak diterjemahkan. Versi Inggris memberi penjelasan dalam kurung pada penyebutan pertama.
- Unit hitung: "rekaman persetujuan/penetapan". Jangan memakai "kelompok", "penerima manfaat", "real-time", atau "terlengkap".
- Setiap angka agregat diberi label "hasil pengolahan PDPSI dari data sumber". Hasil L+P tidak disebut "total anggota nasional".
- Nilai sumber ditampilkan apa adanya (huruf besar, ejaan, spasi). UI tidak mengubah kapitalisasi nama lembaga.
- Rekaman bernomor SK sama diberi label **Duplikat** dengan tautan ke rekaman terkait; label menyebut "identik" atau "atribut berbeda".
- Ditulis dengan `/antislop` (`antislop-copywriting`), lalu disunting dengan `/humanizer`, tanpa mengubah angka atau definisi.
- Tidak ada em dash di teks antarmuka.

## 10. Tema

Hanya mode terang untuk MVP (ditetapkan pemilik produk, keputusan F). Alasannya: palet peta dan grafik divalidasi untuk satu surface, dan PRD meminta hijau, putih, dan netral. Mode gelap yang layak butuh ramp dan validasi terpisah.

## 11. Yang dihindari

Meski memakai pola dasbor (v0.4): kartu berbayang, ikon dekoratif di kartu angka, gradien, glassmorphism, badge "Baru", angka besar tanpa satuan atau sumber, grafik hiasan tanpa tabel data, animasi masuk, ilustrasi generik, CTA generik ("Mulai", "Pelajari lebih lanjut"), FAQ templat.
