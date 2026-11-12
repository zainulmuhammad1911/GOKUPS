/*
 * Ambil tautan halaman detail dan PDF SK dari GoKUPS, untuk `pdpsi links`.
 *
 * Cara pakai (dijalankan sendiri oleh pengguna di browsernya):
 *   1. Buka https://gokups.hutsos.kehutanan.go.id/public/society
 *   2. Buka Console (Cmd+Option+J di Brave/Chrome), tempel seluruh isi file ini, tekan Enter.
 *   3. Biarkan tab terbuka. Kemajuan tampil di Console dan tersimpan; kalau terhenti,
 *      tempel ulang skrip ini dan ia melanjutkan dari posisi terakhir.
 *   4. Selesai: file `tautan-sk-gokups.csv` terunduh. Simpan di data/source/gokups_links/.
 *
 * Hentikan kapan saja: ketik  window.__stopKups = true  di Console.
 * Mulai dari awal: ketik  localStorage.removeItem("kupsLinks")  lalu tempel ulang.
 *
 * Skrip berjalan pelan (satu permintaan setiap ~0,8 detik) supaya tidak membebani GoKUPS.
 * Dokumen SK tidak diunduh; yang dicatat hanya alamatnya.
 */
(async () => {
  // true  = hanya tautan halaman detail SK (sekitar 100 permintaan, beberapa menit).
  // false = juga tautan PDF SK (satu halaman detail + satu pratinjau per SK, beberapa jam).
  const HANYA_DETAIL = true;
  const BASE = "https://gokups.hutsos.kehutanan.go.id";
  const DELAY_MS = 800;
  const PAGE = 100;
  const KEY = "kupsLinks";
  if (!location.href.startsWith(BASE)) return console.error("Jalankan di halaman " + BASE + "/public/society");

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const parse = (html) => new DOMParser().parseFromString(html, "text/html");
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const state = JSON.parse(localStorage.getItem(KEY) || '{"rows":[],"listed":false,"next":0}');
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  window.__stopKups = false;

  async function post(url, body) {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
          body,
        });
        if (res.ok) return await res.text();
      } catch (e) {}
      await sleep(DELAY_MS * attempt * 3);
    }
    throw new Error("Gagal: " + url);
  }
  async function get(url) {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch(url);
        if (res.ok) return await res.text();
      } catch (e) {}
      await sleep(DELAY_MS * attempt * 3);
    }
    throw new Error("Gagal: " + url);
  }

  // 1. Daftar Tabular: kode detail, nomor SK, tanggal, luas, lembaga, wilayah.
  if (!state.listed) {
    let start = state.rows.length;
    let total = Infinity;
    while (start < total) {
      if (window.__stopKups) return console.warn("Dihentikan. Tempel ulang skrip untuk melanjutkan.");
      const body = `draw=1&start=${start}&length=${PAGE}&search%5Bvalue%5D=&kategori=&tipe=`;
      const json = JSON.parse(await post(`${BASE}/public/society/society_datatable`, body));
      total = json.recordsTotal;
      for (const row of json.data) {
        const sk = parse(row[1]);
        const id = (row[1].match(/detail\('([^']+)'\)/) || [])[1] || "";
        const a = sk.querySelector("a");
        const luas = clean(a?.querySelector("span")?.textContent);
        a?.querySelector("span")?.remove();
        const date = clean(a?.querySelector("small")?.textContent);
        a?.querySelector("small")?.remove();
        const lembaga = parse(row[2]).querySelector("a");
        lembaga?.querySelector("small")?.remove();
        const wilayah = parse(row[3]).body;
        wilayah.querySelector("small")?.remove();
        const [prov = "", kab = "", kec = ""] = clean(wilayah.textContent).split("~").map(clean);
        state.rows.push({ no: row[0], id, sk: clean(a?.textContent), date, lembaga: clean(lembaga?.textContent), prov, kab, kec, luas, pdf: null });
      }
      start += json.data.length;
      save();
      console.log(`Daftar: ${state.rows.length} dari ${total} SK`);
      if (json.data.length === 0) break;
      await sleep(DELAY_MS);
    }
    state.listed = true;
    save();
  }

  // 2. Halaman detail tiap SK: dokumen kategori Surat Keputusan, lalu alamat PDF-nya.
  for (let i = HANYA_DETAIL ? state.rows.length : state.next; i < state.rows.length; i++) {
    if (window.__stopKups) return console.warn(`Dihentikan di SK ke-${i + 1}. Tempel ulang skrip untuk melanjutkan.`);
    const r = state.rows[i];
    const urls = [];
    if (r.id) {
      const doc = parse(await get(`${BASE}/public/society/detail/${r.id}`));
      await sleep(DELAY_MS);
      for (const link of doc.querySelectorAll('a[onclick*="documents("]')) {
        const rowText = clean(link.closest("tr")?.textContent).toUpperCase();
        if (!rowText.includes("SURAT KEPUTUSAN") || rowText.includes("PENDAMPING")) continue;
        const docId = (link.getAttribute("onclick").match(/documents\('([^']+)'\)/) || [])[1];
        if (!docId) continue;
        const preview = await post(`${BASE}/public/document/preview/${docId}`, "");
        await sleep(DELAY_MS);
        const src = (preview.match(/(?:src|href|data)="(https:\/\/gokups\.hutsos\.kehutanan\.go\.id\/storage\/[^"]+\.pdf)"/i) || [])[1];
        if (src && !urls.includes(src)) urls.push(src);
      }
    }
    r.pdf = urls;
    state.next = i + 1;
    if (state.next % 25 === 0 || state.next === state.rows.length) {
      save();
      console.log(`Detail: ${state.next} dari ${state.rows.length} SK`);
    }
  }
  save();

  // 3. CSV sesuai format `pdpsi links`.
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["No", "Nomor Surat Keputusan", "Tanggal Surat Keputusan", "Nama Lembaga", "Provinsi", "Kabupaten Kota", "Kecamatan",
    "Luas Area Keseluruhan (Ha)", "Tautan Detail GoKUPS", "Tautan PDF SK"];
  const lines = [header.map(q).join(",")].concat(
    state.rows.map((r) =>
      [r.no, r.sk, r.date, r.lembaga, r.prov, r.kab, r.kec, r.luas, r.id ? `${BASE}/public/society/detail/${r.id}` : "", (r.pdf || []).join("|")]
        .map(q).join(","),
    ),
  );
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tautan-sk-gokups.csv";
  a.click();
  console.log(`Selesai: ${state.rows.length} SK, ${state.rows.filter((r) => r.pdf?.length).length} dengan PDF SK. File tautan-sk-gokups.csv diunduh.`);
})();
