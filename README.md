# PDPSI: Pusat Data Perhutanan Sosial Indonesia

Portal data terbuka dua bahasa (Indonesia/Inggris) untuk rekapitulasi kelompok penerima persetujuan Perhutanan Sosial per provinsi, kabupaten/kota, dan jenis PS (Hutan Desa, Hutan Kemasyarakatan, Hutan Tanaman Rakyat, Hutan Adat, Kemitraan Kehutanan beserta tiga subskemanya). Sumber datanya satu: ekstraksi situs GoKUPS.

**Status:** rilis draf. Belum boleh diterbitkan sebagai rilis publik sampai institusi pengelola dan lisensi data ditetapkan (K9 di `docs/DECISIONS.md`). Semua halaman memakai `noindex` dan menampilkan banner draf.

## Isi repositori

| Folder | Isi |
|--------|-----|
| `PRD_PDPSI.md`, `DESIGN.md` | Kebutuhan produk dan sistem desain |
| `docs/` | Keputusan (`DECISIONS.md`), rencana teknis dan implementasi, audit data dan peta, draf metodologi, glosarium, laporan QA |
| `pipeline/` | Pipeline Python: workbook → rilis data berversi; batas wilayah → GeoJSON. Lihat `pipeline/README.md` |
| `data/config/` | Aturan yang dipakai pipeline dan web: pemetaan skema, aturan pemeriksaan, skema kolom unduhan, alias batas |
| `data/reference/` | Kode wilayah Kepmendagri 2025 dan crosswalk nama → kode |
| `data/releases/<versi>/` | Rilis data publik; `current.json` menunjuk rilis aktif |
| `public/geo/<versi>/` | Batas wilayah yang sudah disederhanakan; `current.json` menunjuk versi aktif |
| `config/site.json` | Identitas produk, institusi, lisensi. Nilai `null` = belum ditetapkan |
| `src/` | Aplikasi Next.js |
| `tests/` | Uji Vitest (`unit/`) dan Playwright + axe (`e2e/`) |

Tidak pernah masuk git atau image produksi: workbook sumber (`*.xlsx` di akar), `data/source/`, dan `data/releases/*/internal/`. Ketiganya memuat kolom Ketua Lembaga, Pra-Pendamping, dan Pendamping yang tidak dipublikasikan.

## Persiapan

Butuh Node 26 dan npm, serta [uv](https://docs.astral.sh/uv/) untuk pipeline.

```bash
npm install
```

```bash
cd pipeline && uv sync
```

## Menjalankan aplikasi

```bash
npm run dev
```

Buka http://localhost:3000. Bahasa Indonesia ada di `/`, Inggris di `/en`.

## Memperbarui data

1. Simpan workbook ekstraksi GoKUPS baru di `data/source/<nama-ekstraksi>/`. Workbook tidak diubah oleh pipeline.
2. Buat rilis baru dari folder `pipeline/`:

```bash
uv run pdpsi build --source ../data/source/<nama-ekstraksi>/<file>.xlsx --version <YYYY-MM-DD>
```

3. Baca `data/releases/<versi>/quality_report.md`. Rilis lama tidak ditimpa; `current.json` menunjuk rilis baru.
4. Jalankan semua uji (bagian berikut), lalu commit folder rilis baru dan deploy ulang.

Batas wilayah hanya perlu dibangun ulang bila sumber batas atau kode wilayah berubah. Caranya ada di `pipeline/README.md`.

## Pengujian

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build && npm run test:e2e
```

```bash
cd pipeline && uv run pytest
```

Uji e2e menjalankan build produksi di port 3200 dan memeriksa 19 rute pada lebar 375, 768, dan 1280 px dengan axe. Hasil terakhir ada di `docs/QA_REPORT.md`.

## Deploy

Aplikasi dibangun dalam mode `standalone` dan membaca data rilis dari disk saat berjalan. Tidak butuh basis data, kunci API, atau layanan pihak ketiga.

Dengan Docker:

```bash
docker build -t pdpsi .
```

```bash
docker run -p 3000:3000 pdpsi
```

Tanpa Docker (server Node):

```bash
npm ci && npm run build
```

```bash
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/ && cd .next/standalone && HOSTNAME=0.0.0.0 PORT=3000 node server.js
```

Catatan:
- Perutean bahasa memakai `rewrites` di `next.config.ts`, bukan middleware, sehingga aman di belakang reverse proxy dengan host apa pun.
- Header keamanan dan CSP dipasang oleh aplikasi. CSP hanya mengizinkan sumber dari domain sendiri.
- Build image Docker belum diuji di mesin pengembangan (daemon Docker tidak berjalan); build standalone sudah diuji.

## Sebelum publikasi

Daftar lengkap ada di `docs/QA_REPORT.md` bagian 6. Ringkasnya:

1. Institusi pengelola mengisi nama, kontak, dan lisensi data di `config/site.json`, lalu membuat rilis baru. Rilis berstatus `published` bila nama institusi dan lisensi terisi.
2. Pengelola data memeriksa crosswalk kode wilayah (`data/reference/region_crosswalk.csv`).
3. Pakar kebijakan PS meninjau definisi dan terjemahan di `docs/TERMINOLOGY.md`.
4. Hapus `noindex` di `src/app/[locale]/layout.tsx` setelah rilis publik siap.

## Prinsip data

Nilai dari workbook ditampilkan apa adanya: tidak dikoreksi, tidak diisi perkiraan, duplikat tidak dihapus, kategori tidak digabung, dan nama tidak disamarkan. Setiap angka agregat diberi label hasil pengolahan dan menaut ke rekaman pembentuknya. Rincian di `docs/DECISIONS.md` bagian 1 dan PRD §1.1.

## Lisensi

Lisensi kode dan lisensi data PDPSI belum ditetapkan (K9). Batas wilayah: BPS, OCHA ROAP, geoBoundaries, CC BY 3.0 IGO.
