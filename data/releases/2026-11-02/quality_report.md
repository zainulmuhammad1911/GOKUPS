# Laporan Kualitas Rilis 2026-11-02

- Status: **draft**
- Sumber: `Data_SK_Perhutanan_Sosial_GoKUPS.xlsx` (SHA-256 `99c05e22db11c316…`)
- Ekstraksi sumber: 2026-11-02T04:52:09.490000+00:00
- Dibuat: 2026-11-04T16:26:10+00:00 dengan pipeline 0.1.0

## Total kontrol nasional

| Indikator | Nilai | Rekaman dihitung | Rekaman dikecualikan |
|-----------|------:|-----------------:|---------------------:|
| Rekaman persetujuan/penetapan | 10.061 | 10.061 | 0 |
| Luas (ha) | 6.881.152 | 9.981 | 80 |
| Anggota (laki-laki + perempuan) | 1.288.574 | 9.852 | 209 |

Provinsi dengan rekaman: 37 dari 38. Kabupaten/kota dengan rekaman: 407 dari 514.

## Catatan kualitas per baris

| Kode | Baris | Arti |
|------|------:|------|
| `sk_shared_by_several_records` | 106 | Nomor SK yang sama dipakai beberapa rekaman dengan lembaga berbeda. |
| `duplicate_review` | 152 | Nomor SK sama dengan isi berbeda; perlu pemeriksaan manual. |
| `duplicate_exact_group` | 24 | Bagian dari kelompok baris yang identik penuh. |
| `duplicate_exact` | 12 | Baris kedua dan seterusnya yang identik penuh dengan baris lain. |
| `sk_spacing_variant` | 24 | Nomor SK hanya berbeda spasi dengan nomor SK lain. |
| `sk_year_truncated` | 4 | Tahun pada nomor SK terpotong (3 digit). |
| `date_after_extraction` | 1 | Tanggal SK setelah tanggal ekstraksi; tidak dipakai di filter tahun. |
| `date_year_mismatch` | 325 | Tahun pada nomor SK berbeda dengan tahun tanggal SK. |
| `area_zero` | 64 | Luas total 0; tidak dipakai di indikator luas. |
| `area_component_mismatch` | 19 | Selisih luas total dan jumlah komponen melebihi ambang; tidak dipakai di indikator luas. |
| `area_component_rounding` | 26 | Selisih kecil luas total dan komponen (pembulatan); tetap dipakai. |
| `members_total_column_mismatch` | 1.127 | Kolom total anggota sumber tidak sama dengan laki-laki + perempuan. |
| `members_negative` | 1 | Ada nilai anggota negatif; tidak dipakai di indikator anggota. |
| `members_zero` | 208 | Laki-laki dan perempuan sama-sama 0; tidak dipakai di indikator anggota. |
| `name_masked` | 2.121 | Nama pemegang izin perorangan disamarkan. |
| `institution_type_inconsistent` | 2.479 | Bentuk lembaga di sumber tidak sesuai dengan skema. |

## Duplikasi

Kelas kelompok nomor SK duplikat: beda_lembaga 49, campuran 75, identik_penuh 12.
Baris identik penuh berlebih: 12 rekaman, 38.987 ha, 1.417 anggota (L+P). Dikeluarkan dari agregasi: tidak (bawaan sementara, K4).

## Penyamaran nama

Nama disamarkan: 2.121 rekaman (pola_nama_orang_dengan_kelompok: 2000, anggota_maks_1: 121). Daftar untuk ditinjau manusia ada di `internal/masking_review.csv` (tidak dipublikasikan).

## Kode wilayah

Pasangan provinsi + kabupaten/kota: 407. Metode: nama_ternormalisasi 406, alias_manual 1. Cek silang BIG 2023: nama_sama 407. Diverifikasi manusia: 0.

## Keputusan yang masih menunggu

- K2: statistik gender laki-laki/perempuan belum diputuskan; tidak ada statistik gender di rilis.
- K4: apakah baris identik penuh dikeluarkan dari agregasi (bawaan: tetap dihitung).
- K5: ambang selisih luas (bawaan: 5 ha).
- K6: lisensi batas wilayah BIG (tidak memengaruhi rilis data).
- K7: verifikasi manusia atas crosswalk kode wilayah.
- K8: posisi IPHPS di bawah Kemitraan Kehutanan.
- K9: institusi pengelola, kontak, dan lisensi data.
