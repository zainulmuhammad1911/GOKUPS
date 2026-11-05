// Menyalin file worker MapLibre ke public/vendor agar bisa dimuat sebagai Web Worker.
// Dijalankan otomatis sebelum `npm run build` dan `npm run dev`.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("node_modules/maplibre-gl/package.json", "utf-8"));
mkdirSync("public/vendor", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/vendor/maplibre-gl-worker.mjs");
console.log(`maplibre-gl-worker ${pkg.version} disalin ke public/vendor/`);
