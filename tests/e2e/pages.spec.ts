import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const VERSION: string = JSON.parse(readFileSync("data/releases/current.json", "utf-8")).version;

const DUP_ID = "2d80cb80ba17"; // rekaman dengan nomor SK yang dipakai 3 rekaman (ID stabil antar-rilis)
const PATHS = ["/", "/map", "/statistics", "/data", `/data/${DUP_ID}`, "/download", "/about"];
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
    await expect(page.getByRole("link", { name: "Statistik" })).toBeVisible();
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
