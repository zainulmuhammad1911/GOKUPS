import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import ExcelJS from "exceljs";

const VERSION: string = JSON.parse(readFileSync("data/releases/current.json", "utf-8")).version;

const DUP_ID = "2d80cb80ba17"; // rekaman dengan nomor SK yang dipakai 3 rekaman (ID stabil antar-rilis)
const PATHS = ["/", "/map", "/statistics", "/data", "/data?province=72&type=HTR&sort=area&dir=desc", "/data?q=zzzzzz", "/statistics?province=72", "/statistics?type=KK&year_from=2017", `/data/${DUP_ID}`, "/download", "/about"];
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
      await expect(fig.locator("[role=img] svg")).toHaveCount(1);
      await expect(fig.locator("[role=img]")).toHaveAttribute("aria-label", /.+/);
    }
  });

  test("pilihan ukuran mengganti grafik dan menandai tombol aktif", async ({ page }) => {
    await page.goto("/statistics");
    const fig = page.locator('figure[aria-labelledby="grafik-jenis-title"]');
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
    await expect(page.locator("figure [role=img] svg")).toHaveCount(2);
  });
});

test.describe("grafik di ponsel", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test("semua label kategori tampil (tidak disembunyikan otomatis)", async ({ page }) => {
    await page.goto("/");
    const svg = page.locator('figure[aria-labelledby="beranda-jenis-title"] [role=img] svg');
    await expect(svg).toHaveCount(1);
    const text = (await svg.locator("text").allTextContents()).join(" ");
    for (const word of ["Kemasyarakatan", "Tanaman", "Desa", "Kemitraan", "Adat"]) expect(text).toContain(word);
  });
});
