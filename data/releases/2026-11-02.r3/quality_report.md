# Laporan Pemeriksaan Rilis 2026-11-02.r3

- Status: **draft** (bukan rilis publik final)
- Sumber: `Data_SK_Perhutanan_Sosial_GoKUPS.xlsx` (SHA-256 `99c05e22db11c316…`)
- Pengambilan data sumber: 2026-11-02T04:52:09.490000+00:00
- Dibuat: 2026-11-05T01:05:21+00:00 dengan pipeline 0.1.0

## Angka nasional (hasil pengolahan PDPSI dari data sumber)

| Indikator | Nilai | Rekaman dipakai | Rekaman tidak dipakai (alasan) |
|-----------|------:|----------------:|--------------------------------|
| Rekaman persetujuan/penetapan | 10.061 | 10.061 | tidak ada |
| Luas (ha), dari kolom Luas Area Keseluruhan | 6.892.023 | 10.061 | tidak ada |
| Anggota laki-laki + perempuan | 1.288.574 | 10.060 | nilai_negatif 1 |
| Pembanding: jumlah kolom sumber Anggota Keseluruhan | 1.227.046 | 10.061 | – |

Provinsi dengan rekaman: 37 dari 38. Kabupaten/kota dengan rekaman: 407 dari 514.

## Penanda pemeriksaan

Penanda tidak mengubah nilai sumber dan tidak mengeluarkan rekaman dari perhitungan.

| Kode | Rekaman | Arti |
|------|--------:|------|
| `duplicate_sk` | 282 | Duplikat: nomor SK (teks persis sama) juga dipakai rekaman lain. Semua rekaman tetap dihitung. |
| `duplicate_identical` | 24 | Duplikat identik: semua kolom sumber selain No sama dengan rekaman lain bernomor SK sama. |
| `duplicate_attributes_differ` | 258 | Duplikat dengan atribut berbeda: nomor SK sama, tetapi isi kolom lain berbeda. |
| `sk_spacing_variant` | 24 | Nomor SK hanya berbeda spasi atau huruf besar/kecil dengan nomor SK rekaman lain; kemungkinan nomor SK sama dengan penulisan berbeda. |
| `sk_year_truncated` | 4 | Tahun pada nomor SK tertulis 3 digit. |
| `date_after_extraction` | 1 | Tanggal SK sesudah tanggal pengambilan data. |
| `date_year_mismatch` | 325 | Tahun pada nomor SK berbeda dengan tahun tanggal SK. |
| `area_zero` | 64 | Luas total di sumber bernilai 0. |
| `area_component_mismatch` | 19 | Selisih luas total dan jumlah komponen luas lebih dari ambang penanda (5 ha). Luas tetap dihitung. |
| `area_component_rounding` | 26 | Selisih luas total dan jumlah komponen 1 sampai 5 ha. Luas tetap dihitung. |
| `area_missing` | 0 | Luas total kosong di sumber; tidak bisa dihitung. |
| `area_negative` | 0 | Luas total negatif di sumber; tidak dihitung. |
| `members_total_column_mismatch` | 1.127 | Anggota Keseluruhan di sumber tidak sama dengan laki-laki + perempuan. |
| `members_total_equals_female` | 1.127 | Anggota Keseluruhan di sumber sama dengan jumlah anggota perempuan, padahal anggota laki-laki lebih dari 0. |
| `members_negative` | 1 | Ada nilai anggota negatif di sumber; laki-laki + perempuan tidak dihitung. |
| `members_component_missing` | 0 | Anggota laki-laki atau perempuan kosong di sumber; laki-laki + perempuan tidak tersedia. |
| `institution_type_lphd_on_htr` | 2.479 | Bentuk lembaga tercatat Lembaga Pengelola Hutan Desa pada skema Hutan Tanaman Rakyat. |
| `kph_bengkulu_utara_outside_bengkulu` | 452 | KPH tercatat KPHP Bengkulu Utara pada rekaman di luar Provinsi Bengkulu. Catatan workbook menyebut ini isian sumber GoKUPS yang perlu dikonfirmasi. |

## Rekaman dengan nomor SK sama

136 nomor SK dipakai lebih dari satu rekaman (282 rekaman). Ukuran kelompok: 2 rekaman × 132, 3 rekaman × 2, 5 rekaman × 1, 7 rekaman × 1. Tipe per rekaman: atribut_berbeda 258, identik 24. Semua rekaman tetap dihitung.

## Kolom yang tidak dipublikasikan

Ketua Lembaga, Pra-Pendamping, Pendamping: berisi nama orang (PRD §6.5). Data publik karena itu bukan salinan mentah sepenuhnya. Salinan lengkap ada di `internal/` (tidak dipublikasikan).

## Kode wilayah

Pasangan provinsi + kabupaten/kota: 407. Metode: nama_ternormalisasi 406, alias_manual 1. Cek silang BIG 2023: nama_sama 407. Diverifikasi manusia: 0.

## Keputusan yang masih menunggu

- K2: statistik gender belum disepakati; rilis tidak memuat statistik gender agregat.
- K6: lisensi dan izin redistribusi geometri BIG (rilis ini tidak memuat geometri).
- K7: verifikasi manusia atas crosswalk kode wilayah.
- K9: institusi pengelola, kontak, dan lisensi publikasi data. Rilis tetap draf sampai terisi.
