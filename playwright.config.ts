import { defineConfig, devices } from "@playwright/test";

// Uji dijalankan terhadap build produksi (npm run build lebih dulu).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3200", trace: "retain-on-failure" },
  webServer: {
    command: "npm run start -- -p 3200",
    url: "http://localhost:3200",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  // WebGL lewat SwiftShader agar peta MapLibre bisa dirender di mode headless.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] } },
    },
  ],
});
