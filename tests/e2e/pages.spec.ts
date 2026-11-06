import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import ExcelJS from "exceljs";

const VERSION: string = JSON.parse(readFileSync("data/releases/current.json", "utf-8")).version;

const DUP_ID = "2d80cb80ba17"; // rekaman dengan nomor SK yang dipakai 3 rekaman (ID stabil antar-rilis)
const PATHS = ["/", "/map", "/statistics", "/data", "/data?province=72&type=HTR&sort=area&dir=desc", "/data?q=zzzzzz", "/statistics?province=72", "/statistics?type=KK&year_from=2017", "/map?province=72&indicator=area", `/data/${DUP_ID}`, "/download", "/about"];
const ROUTES = [...PATHS, ...PATHS.map((p) => (p === "/" ? "/en" : `/en${p}`))];
const VIEWPORTS = [
  { name: "ponsel", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} ${vp.width}px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const route of ROUTES) {
      test(`${route}: tanpa pelanggaran axe dan tanpa overflow horizontal`, async ({ page }) => {
        const res = await page.goto(route);
        expect(res?.status()).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, "lebar halaman melebihi viewport").toBeLessThanOrEqual(0);
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length} elemen`)).toEqual([]);
      });
    }
  });
}

test("Tab pertama memfokuskan tautan lewati-ke-konten", async ({ page }) => {
  await page.goto("/data");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Langsung ke konten" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#konten$/);
});

test.describe("menu ponsel", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test("buka, tutup dengan Escape, fokus kembali ke tombol", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Menu" });
    await button.click();
    await expect(page.getByRole("button", { name: "Tutup menu" })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Statistik", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  });
  test("tautan menu berpindah halaman", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("link", { name: "Data", exact: true }).click();
    await expect(page).toHaveURL(/\/data$/);
    await expect(page.locator("h1")).toHaveText("Data rekaman");
  });
});

test("referensi duplikat menaut ke semua rekaman terkait dan saling menaut balik", async ({ page }) => {
  await page.goto(`/data/${DUP_ID}`);
  const links = page.locator("section[aria-labelledby=duplikat] a");
  await expect(links).toHaveCount(2);
  const first = await links.first().textContent();
  await links.first().click();
  await expect(page).toHaveURL(new RegExp(`/data/${first}$`));
  await expect(page.locator(`section[aria-labelledby=duplikat] a:has-text("${DUP_ID}")`)).toHaveCount(1);
});

test("nilai sumber tampil apa adanya, termasuk spasi ganda dan kosong", async ({ page }) => {
  await page.goto(`/data/${DUP_ID}`);
  const name = page.locator("tr", { has: page.locator("th", { hasText: /^Nama Lembaga$/ }) }).locator("td");
  expect(await name.textContent()).toBe("KTH  MUARA KILIS");
  const district = page.locator("tr", { has: page.locator("th", { hasText: /^Kecamatan$/ }) }).locator("td");
  await expect(district).toHaveText("Kosong di sumber");
});

test("ganti bahasa mempertahankan halaman", async ({ page }) => {
  await page.goto(`/data/${DUP_ID}`);
  await page.getByRole("link", { name: "EN", exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/en/data/${DUP_ID}$`));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("paginasi data", async ({ page }) => {
  await page.goto("/data");
  await page.getByRole("link", { name: "Halaman berikutnya" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Halaman 2 dari 403", { exact: true })).toBeVisible();
});

test("unduhan: file manifes tersedia, file lain dan folder internal ditolak", async ({ request }) => {
  const ok = await request.get(`/unduh-berkas/pdpsi_${VERSION}_rekap_jenis_ps.xlsx`);
  expect(ok.status()).toBe(200);
  expect(ok.headers()["content-type"]).toContain("spreadsheetml");
  for (const bad of ["source_records.jsonl", "..%2Finternal%2Fsource_records.jsonl", "approvals.json"]) {
    expect((await request.get(`/unduh-berkas/${bad}`)).status()).toBe(404);
  }
});

test("rekaman tidak dikenal menghasilkan 404", async ({ page }) => {
  const res = await page.goto("/data/000000000000");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Halaman tidak ditemukan");
});

test("statistik menampilkan 5 jenis PS dengan rincian Kemitraan Kehutanan", async ({ page }) => {
  await page.goto("/statistics");
  const table = page.locator("#rekap-nasional + p + div table");
  for (const name of ["Hutan Desa", "Hutan Kemasyarakatan", "Hutan Tanaman Rakyat", "Hutan Adat", "Kemitraan Kehutanan"]) {
    await expect(table.getByRole("rowheader", { name, exact: true })).toBeVisible();
  }
  for (const sub of ["KULIN KK", "KONSERVASI", "IPHPS"]) {
    await expect(table.getByRole("rowheader", { name: new RegExp(sub) })).toBeVisible();
  }
});

test.describe("Tahap 4: filter, pencarian, urutan, unduhan", () => {
  test("filter lewat form menghasilkan alamat ringkas dan jumlah yang benar", async ({ page }) => {
    await page.goto("/data");
    const form = page.getByRole("search");
    await form.getByLabel("Provinsi", { exact: true }).selectOption("72");
    // Daftar kabupaten/kota mengikuti provinsi terpilih (13 kabupaten/kota + opsi "Semua").
    await expect(form.getByLabel("Kabupaten/Kota", { exact: true }).locator("option")).toHaveCount(14);
    await form.getByLabel("Jenis PS", { exact: true }).selectOption("HTR");
    await form.getByRole("button", { name: "Terapkan" }).click();
    await expect(page).toHaveURL(/\/data\?province=72&type=HTR$/);
    await expect(page.getByRole("heading", { name: /1\.085 dari 10\.061 rekaman/ })).toBeVisible();
  });

  test("pencarian tidak peka huruf dan menampilkan nilai sumber apa adanya", async ({ page }) => {
    await page.goto("/data?q=muara%20kilis");
    await expect(page.getByRole("cell", { name: "KTH  MUARA KILIS" }).first()).toBeVisible();
  });

  test("tajuk kolom mengurutkan dan menandai aria-sort", async ({ page }) => {
    await page.goto("/data?province=72");
    await page.getByRole("link", { name: /^Luas \(ha\)/ }).click();
    // dir=asc adalah bawaan, jadi tidak ditulis di alamat.
    await expect(page).toHaveURL(/province=72&sort=area$/);
    await expect(page.locator("th[aria-sort=ascending]")).toHaveText(/Luas/);
  });

  test("parameter tidak dikenal diabaikan dengan catatan", async ({ page }) => {
    await page.goto("/data?province=99");
    await expect(page.getByText(/tidak dikenali dan diabaikan: province/)).toBeVisible();
  });

  test("hasil kosong menampilkan keadaan kosong", async ({ page }) => {
    await page.goto("/data?q=zzzzzz");
    await expect(page.getByText("Tidak ada rekaman yang cocok")).toBeVisible();
    await expect(page.getByRole("link", { name: /rekaman ini/ })).toHaveCount(0);
  });

  test("unduhan CSV sesuai filter: jumlah baris, kolom sama dengan rilis, metadata filter", async ({ request }) => {
    const res = await request.get("/unduh-hasil?province=72&type=HTR&format=csv");
    expect(res.status()).toBe(200);
    const files = unzipSync(new Uint8Array(await res.body()));
    const csvName = Object.keys(files).find((n) => n.endsWith(".csv"))!;
    const csv = strFromU8(files[csvName]!).replace(/^\uFEFF/, "");
    const lines = csv.trimEnd().split("\r\n");
    expect(lines.length).toBe(1085 + 1);
    const readme = strFromU8(files["BACA_SAYA.txt"]!);
    expect(readme).toContain("Provinsi: Sulawesi Tengah (72)");
    expect(readme).toContain("Jumlah rekaman dalam file: 1085");
    expect(readme).toContain("bukan salinan mentah sepenuhnya");
    // Judul kolom sama persis dengan file rilis lengkap dari pipeline.
    const full = unzipSync(readFileSync(`data/releases/${VERSION}/downloads/pdpsi_${VERSION}_rekaman_lengkap_csv.zip`));
    const fullCsv = strFromU8(full[Object.keys(full).find((n) => n.endsWith(".csv"))!]!).replace(/^\uFEFF/, "");
    expect(lines[0]).toBe(fullCsv.split(/\r?\n/)[0]);
  });

  test("unduhan XLSX sesuai filter", async ({ request }) => {
    const res = await request.get("/unduh-hasil?type=KK_IPHPS&format=xlsx");
    expect(res.status()).toBe(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await res.body()) as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Data", "Metadata", "Kamus Kolom"]);
    expect(wb.getWorksheet("Data")!.actualRowCount).toBe(6 + 1);
    const meta = wb.getWorksheet("Metadata")!.getColumn(2).values.join(" ");
    expect(meta).toContain("Jenis PS: KEMITRAAN KEHUTANAN ~ IPHPS (KK_IPHPS)");
  });

  test("format unduhan tidak valid ditolak", async ({ request }) => {
    expect((await request.get("/unduh-hasil?format=exe")).status()).toBe(400);
  });

  test("angka di Statistik menaut ke rekaman pembentuknya", async ({ page }) => {
    await page.goto("/statistics");
    await page.getByRole("link", { name: /rekaman: Hutan Tanaman Rakyat, Sulawesi Tengah/ }).click();
    await expect(page).toHaveURL(/province=72/);
    await expect(page.getByRole("heading", { name: /1\.085 dari 10\.061 rekaman/ })).toBeVisible();
  });

  test.describe("ponsel", () => {
    test.use({ viewport: { width: 375, height: 812 } });
    test("panel filter dibuka dengan tombol", async ({ page }) => {
      await page.goto("/data");
      const toggle = page.getByRole("button", { name: /Filter dan pencarian/ });
      await expect(page.getByRole("search")).toBeHidden();
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByRole("search")).toBeVisible();
    });
  });
});

test.describe("Tahap 5: grafik", () => {
  test("Statistik: empat grafik tampil sebagai SVG dengan ringkasan aksesibel", async ({ page }) => {
    await page.goto("/statistics");
    for (const id of ["grafik-jenis", "grafik-wilayah", "grafik-top10", "grafik-komposisi"]) {
      const fig = page.locator(`figure[aria-labelledby="${id}-title"]`);
      await fig.scrollIntoViewIfNeeded(); // grafik dimuat saat mendekati layar
      await expect(fig.locator("[role=img] svg")).toHaveCount(1);
      await expect(fig.locator("[role=img]")).toHaveAttribute("aria-label", /.+/);
    }
  });

  test("pilihan ukuran mengganti grafik dan menandai tombol aktif", async ({ page }) => {
    await page.goto("/statistics");
    const fig = page.locator('figure[aria-labelledby="grafik-jenis-title"]');
    await fig.scrollIntoViewIfNeeded();
    await fig.getByRole("button", { name: "Luas" }).click();
    await expect(fig.getByRole("button", { name: "Luas" })).toHaveAttribute("aria-pressed", "true");
    await expect(fig.locator("[role=img]")).toHaveAttribute("aria-label", /Ukuran: Luas\. Tertinggi: Hutan Desa/);
  });

  test("tabel data grafik sama dengan angka pipeline", async ({ page }) => {
    await page.goto("/statistics");
    const fig = page.locator('figure[aria-labelledby="grafik-jenis-title"]');
    await fig.getByText("Tampilkan tabel data").click();
    const row = fig.getByRole("row", { name: /Hutan Kemasyarakatan/ });
    await expect(row).toContainText("3.907");
    await expect(row).toContainText("1.479.288");
  });

  test("filter provinsi mengubah tingkat wilayah ke kabupaten/kota", async ({ page }) => {
    await page.goto("/statistics?province=72&type=HTR");
    await expect(page.getByText("1.085 rekaman · Sulawesi Tengah")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sebaran per kabupaten/kota, Sulawesi Tengah" })).toBeVisible();
    await page.getByRole("link", { name: "Lihat 1.085 rekaman ini di halaman Data" }).click();
    await expect(page.getByRole("heading", { name: /1\.085 dari 10\.061 rekaman/ })).toBeVisible();
  });

  test("Beranda: dua grafik tampil", async ({ page }) => {
    await page.goto("/");
    for (const fig of await page.locator("figure").all()) await fig.scrollIntoViewIfNeeded();
    await expect(page.locator("figure [role=img] svg")).toHaveCount(2);
  });
});

test.describe("grafik di ponsel", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test("semua label kategori tampil (tidak disembunyikan otomatis)", async ({ page }) => {
    await page.goto("/");
    await page.locator('figure[aria-labelledby="beranda-jenis-title"]').scrollIntoViewIfNeeded();
    const svg = page.locator('figure[aria-labelledby="beranda-jenis-title"] [role=img] svg');
    await expect(svg).toHaveCount(1);
    const text = (await svg.locator("text").allTextContents()).join(" ");
    for (const word of ["Kemasyarakatan", "Tanaman", "Desa", "Kemitraan", "Adat"]) expect(text).toContain(word);
  });
});

test.describe("Tahap 6: halaman Tentang", () => {
  test("daftar isi menaut ke semua bagian yang ada", async ({ page }) => {
    await page.goto("/about");
    const links = page.getByRole("navigation", { name: "Isi halaman" }).getByRole("link");
    const count = await links.count();
    expect(count).toBe(12);
    for (let i = 0; i < count; i++) {
      const href = (await links.nth(i).getAttribute("href"))!;
      await expect(page.locator(href)).toHaveCount(1);
    }
  });

  test("angka di halaman Tentang dihitung dari rilis", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByText(/136 nomor SK dipakai lebih dari satu rekaman, dengan total 282 rekaman/)).toBeVisible();
    await expect(page.getByText(/24 rekaman isinya identik/)).toBeVisible();
    await expect(page.getByRole("link", { name: "3.907 rekaman" })).toBeVisible();
    await expect(page.getByText(/Total 6\.892\.023 ha dari 10\.061 rekaman/)).toBeVisible();
  });

  test("jumlah catatan pemeriksaan menaut ke rekaman yang sama", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("link", { name: /rekaman: Anggota Keseluruhan = perempuan/ }).click();
    await expect(page).toHaveURL(/flag=members_total_equals_female/);
    await expect(page.getByRole("heading", { name: /1\.127 dari 10\.061 rekaman/ })).toBeVisible();
  });

  test("versi Inggris memakai nama skema Indonesia dengan penjelasan", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.getByText(/Hutan Desa \(village forest\): forest area/)).toBeVisible();
  });
});

test.describe("Tahap 3: peta", () => {
  test("peta nasional dirender dan panel menampilkan total", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/map");
    await expect(page.locator("canvas.maplibregl-canvas")).toHaveCount(1);
    await expect(page.locator("aside dd").first()).toHaveText("10.061");
    await expect(page.getByText(/Peta menampilkan jumlah per wilayah administratif, bukan lokasi kelompok/)).toBeVisible();
    await expect(page.getByText(/CC BY 3\.0 IGO/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("pilih provinsi: URL, remah roti, panel, dan tabel kabupaten/kota", async ({ page }) => {
    await page.goto("/map");
    await page.getByLabel("Wilayah", { exact: true }).selectOption("72");
    await expect(page).toHaveURL(/\/map\?province=72$/);
    await expect(page.getByRole("button", { name: "Kembali ke Indonesia" })).toBeVisible();
    await expect(page.locator("aside h2")).toHaveText("Sulawesi Tengah");
    await expect(page.locator("aside dd").first()).toHaveText("1.282");
    await expect(page.getByRole("heading", { name: /per kabupaten\/kota di Sulawesi Tengah/ })).toBeVisible();
    await page.getByRole("button", { name: "Kabupaten Tojo Una Una" }).click();
    await expect(page).toHaveURL(/province=72&regency=72\.09/);
    await expect(page.locator("aside h2")).toHaveText("Kabupaten Tojo Una Una");
    await page.getByRole("button", { name: "Kembali ke Indonesia" }).click();
    await expect(page).toHaveURL(/\/map$/);
  });

  test("ukuran dan jenis PS tersimpan di URL; tautan panel cocok dengan halaman Data", async ({ page }) => {
    await page.goto("/map?province=72");
    await page.getByRole("button", { name: "Luas" }).click();
    await page.getByLabel("Jenis PS", { exact: true }).selectOption("HTR");
    await expect(page).toHaveURL(/indicator=area&type=HTR&province=72/);
    await page.locator("aside").getByRole("link", { name: /Lihat 1\.085 rekaman ini/ }).click();
    await expect(page.getByRole("heading", { name: /1\.085 dari 10\.061 rekaman/ })).toBeVisible();
  });

  test("Beranda: peta mini memuat 38 provinsi", async ({ page }) => {
    await page.goto("/");
    const paths = page.locator('section[aria-labelledby="peta-mini"] svg path');
    await expect(paths).toHaveCount(38);
    // Tidak ada satu provinsi pun yang menutupi seluruh kanvas (cek urutan putar poligon).
    const svgBox = (await page.locator('section[aria-labelledby="peta-mini"] svg').boundingBox())!;
    for (const box of await paths.evaluateAll((els) => els.map((e) => { const b = (e as SVGGraphicsElement).getBBox(); return { width: b.width, height: b.height }; }))) {
      expect(box.width * box.height).toBeLessThan(0.25 * 640 * 250);
    }
    expect(svgBox.width).toBeGreaterThan(0);
  });
});

test.describe("perutean bahasa (regresi pengalihan berulang)", () => {
  test("halaman Indonesia tanpa prefiks berhasil untuk host apa pun, tanpa cookie", async ({ request }) => {
    for (const host of ["localhost:3200", "127.0.0.1:3200", "pdpsi.contoh.test"]) {
      const res = await request.get("/statistics", { headers: { host }, maxRedirects: 0 });
      expect(res.status(), host).toBe(200);
      expect(res.headers()["set-cookie"], host).toBeUndefined();
    }
  });
  test("/id/... dialihkan ke alamat tanpa prefiks", async ({ request }) => {
    const res = await request.get("/id/data?province=72", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toBe("/data?province=72");
  });
});

test.describe("rincian anggota laki-laki dan perempuan (K2, 2026-11-06)", () => {
  const totals = JSON.parse(readFileSync(`data/releases/${VERSION}/control_totals.json`, "utf-8"));
  const nat = totals.national;
  const id = (v: number) => new Intl.NumberFormat("id-ID").format(v);
  const en = (v: number) => new Intl.NumberFormat("en").format(v);

  test("laki-laki + perempuan = anggota L+P pada total kontrol", () => {
    expect(nat.members_male + nat.members_female).toBe(nat.members_male_plus_female);
  });

  test("Beranda menampilkan rincian dan catatan perempuan 0, dalam dua bahasa", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(`Laki-laki ${id(nat.members_male)}, perempuan ${id(nat.members_female)}.`)).toBeVisible();
    await expect(page.getByText(new RegExp(`Pada ${id(nat.members_female_zero_records)} dari ${id(nat.members_records_used)} rekaman, anggota perempuan tercatat 0`))).toBeVisible();
    await page.goto("/en");
    await expect(page.getByText(`Men ${en(nat.members_male)}, women ${en(nat.members_female)}.`)).toBeVisible();
  });

  test("Statistik: kolom laki-laki dan perempuan di rekap jenis PS dan tabel per wilayah", async ({ page }) => {
    await page.goto("/statistics");
    const foot = page.getByRole("region", { name: /Rekap per jenis PS/ }).locator("tfoot tr");
    await expect(foot).toContainText(id(nat.members_male));
    await expect(foot).toContainText(id(nat.members_female));
    const sex = page.getByRole("region", { name: /Anggota laki-laki dan perempuan per provinsi/ });
    await expect(sex.locator("tbody tr")).toHaveCount(totals.provinces_with_records);
    const total = sex.locator("tfoot td");
    await expect(total).toHaveText([
      id(nat.members_records_used), id(nat.members_male_plus_female), id(nat.members_male), id(nat.members_female), id(nat.members_female_zero_records),
    ]);
  });

  test("Data dan Peta: rincian mengikuti filter provinsi", async ({ page }) => {
    const p = totals.by_province.find((x: { province_code: string }) => x.province_code === "72");
    await page.goto("/data?province=72");
    await expect(page.getByText(new RegExp(`laki-laki ${id(p.members_male)}, perempuan ${id(p.members_female)}`))).toBeVisible();
    await page.goto("/map?province=72");
    const panel = page.locator("aside");
    await expect(panel.getByText("Laki-laki", { exact: true })).toBeVisible();
    await expect(panel).toContainText(id(p.members_male));
    await expect(panel).toContainText(id(p.members_female));
  });
});
