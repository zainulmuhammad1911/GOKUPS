import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Data rilis dibaca di server dari data/releases. Folder internal/ (berisi kolom
  // yang tidak dipublikasikan) tidak pernah dibaca aplikasi dan dikeluarkan dari build.
  outputFileTracingIncludes: {
    "/**": ["./data/releases/current.json", "./data/releases/*/approvals.json", "./data/releases/*/control_totals.json",
      "./data/releases/*/admin_areas.json", "./data/releases/*/schemes.json", "./data/releases/*/release.json",
      "./data/releases/*/downloads/**", "./config/site.json", "./data/config/export_schema.json"],
  },
  outputFileTracingExcludes: {
    "/**": ["./data/releases/*/internal/**", "./data/source/**", "./*.xlsx", "./pipeline/**"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
