# Data referensi wilayah

## `big_kabkota_2023_attributes.csv`

Tabel atribut (tanpa geometri) dari layanan BIG:

- Layanan: `https://geoservices.big.go.id/rbi/rest/services/Hosted/Wilayah_Administrasi_Kabupaten__Kota/FeatureServer/0`
- Edisi: Geodatabase batas wilayah administrasi kabupaten/kota edisi September 2023 (pemutakhiran edisi Desember 2022), menurut deskripsi layanan.
- Diambil: 2026-11-04, query `where=1=1`, `returnGeometry=false`, 548 fitur.
- Kolom: `kdppum` (kode provinsi Kemendagri), `wadmpr` (nama provinsi), `kdpkab` (kode kab/kota Kemendagri, format `PP.KK`), `wadmkk` (nama kab/kota), `tipadm` (4 = kabupaten, 5 = kota; nilai lain = wilayah khusus/bermasalah), `remark`, `luaswh`.

Satu kode kab/kota bisa muncul di lebih dari satu fitur (pulau, wilayah terapung). Ada 514 kode kab/kota unik berformat `PP.KK` (416 kabupaten, 98 kota) dan 38 provinsi.

**Status lisensi: belum dikonfirmasi.** Deskripsi layanan tidak mencantumkan lisensi atau ketentuan penggunaan. File ini hanya dipakai untuk audit pencocokan kode wilayah dan belum boleh dipublikasikan sebelum ketentuan penggunaannya dikonfirmasi (lihat `docs/MAP_DATA_AUDIT.md`).
