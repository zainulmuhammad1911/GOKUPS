import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { readFileSync } from "node:fs";

const maplibreVersion: string = JSON.parse(readFileSync("node_modules/maplibre-gl/package.json", "utf-8")).version;

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build mandiri untuk hosting institusi (Docker atau server Node), lihat Dockerfile dan README.
  output: "standalone",
  // Dipakai sebagai parameter versi URL worker MapLibre agar cache browser ikut berganti saat MapLibre diperbarui.
  env: { NEXT_PUBLIC_MAPLIBRE_VERSION: maplibreVersion },
  poweredByHeader: false,
  // Data rilis dibaca di server dari data/releases. Folder internal/ (berisi kolom
  // yang tidak dipublikasikan) tidak pernah dibaca aplikasi dan dikeluarkan dari build.
  outputFileTracingIncludes: {
    "/**": ["./data/releases/current.json", "./data/releases/*/approvals.json", "./data/releases/*/control_totals.json",
      "./data/releases/*/admin_areas.json", "./data/releases/*/schemes.json", "./data/releases/*/release.json",
      "./data/releases/*/downloads/**", "./config/site.json", "./data/config/export_schema.json",
      "./data/oms/current.json", "./data/oms/*/directory.json"],
  },
  outputFileTracingExcludes: {
    "/**": ["./data/releases/*/internal/**", "./data/source/**", "./*.xlsx", "./pipeline/**"],
  },
  /**
   * Bahasa Indonesia tanpa prefiks: "/statistics" dilayani oleh "/id/statistics", Inggris di "/en/...".
   * Dilakukan dengan rewrite konfigurasi (selalu internal), bukan middleware. Rewrite dari middleware
   * dibandingkan Next.js dengan origin server (localhost atau HOSTNAME); di belakang reverse proxy atau
   * di Docker, host pengunjung berbeda sehingga terjadi pengalihan berulang (diuji 2026-11-05).
   * Memakai "beforeFiles" karena rute dinamis [locale] sudah cocok sebelum "afterFiles" dicek; file
   * statis, aset, dan route handler dikecualikan secara eksplisit.
   */
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/id" },
        {
          source: "/:path((?!en$|en/|id$|id/|_next/|geo/|vendor/|brand/|unduh-berkas/|unduh-hasil$|icon\\.png$|apple-icon\\.png$|favicon\\.ico$|robots\\.txt$).+)",
          destination: "/id/:path",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [
      { source: "/id", destination: "/", permanent: false },
      { source: "/id/:path*", destination: "/:path*", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // CSP hanya di produksi (mode dev Next.js memakai eval). Semua sumber dari domain sendiri;
          // tanpa skrip, font, atau tile pihak ketiga.
          ...(process.env.NODE_ENV === "production"
            ? [{
                key: "Content-Security-Policy",
                value: [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline'",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: blob:",
                  "font-src 'self'",
                  "connect-src 'self'",
                  "worker-src 'self' blob:",
                  "object-src 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                  "frame-ancestors 'none'",
                ].join("; "),
              }]
            : []),
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
