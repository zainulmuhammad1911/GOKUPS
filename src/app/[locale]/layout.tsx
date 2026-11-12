import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Atkinson_Hyperlegible_Next, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MOTION_SCRIPT } from "@/components/motion/motion-script";
import { loadRelease, loadSiteConfig } from "@/lib/data/release";
import "../globals.css";

// Dipilih karena keterbacaan tinggi untuk pembaca umum (DESIGN.md §4). Di-host sendiri oleh next/font.
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson", display: "swap" });
// Judul: Plus Jakarta Sans (huruf geometris tebal, senada dengan logo Data KUPS). Label teknis: JetBrains Mono.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", weight: ["600", "700", "800"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb", display: "swap", weight: ["500", "700"] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: `%s · Data KUPS` },
    description: t("description"),
    // Rilis masih draf (K9): jangan diindeks mesin pencari.
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const { meta } = loadRelease();
  const site = loadSiteConfig();
  // Hanya teks yang dipakai komponen klien yang dikirim ke browser (menu, filter, grafik, peta).
  const all = await getMessages();
  const clientMessages = Object.fromEntries(
    ["nav", "common", "data", "charts", "map"].map((ns) => [ns, (all as Record<string, unknown>)[ns]]),
  );

  return (
    <html lang={locale} className={`${atkinson.variable} ${jakarta.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Gerak halaman (muncul saat digulir, sorot kursor). Lihat motion-script.ts. */}
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body>
        <a
          href="#konten"
          className="sr-only z-50 rounded-md bg-card px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("common.skipToContent")}
        </a>
        <NextIntlClientProvider messages={clientMessages}>
          <div className="flex min-h-dvh flex-col overflow-x-clip">
            {meta.status === "draft" && (
              <p className="bg-forest px-4 py-1.5 text-center text-[0.75rem] leading-snug text-[#ffe3ea] sm:font-mono">
                {t("draft.banner")}
              </p>
            )}
            <SiteNav
              productName={locale === "en" ? site.product.name_en : site.product.name_id}
              logoSrc={site.product.logo_path}
              version={meta.version}
              draft={meta.status === "draft"}
            />
            <main id="konten" tabIndex={-1} className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-4 md:px-6 md:pt-10 lg:px-8">
              {children}
            </main>
            <SiteFooter />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
