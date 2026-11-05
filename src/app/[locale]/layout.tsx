import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { loadRelease } from "@/lib/data/release";
import "../globals.css";

// Dipilih karena keterbacaan tinggi untuk pembaca umum (DESIGN.md §4). Di-host sendiri oleh next/font.
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: `%s · PDPSI` },
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
  // Hanya teks yang dipakai komponen klien yang dikirim ke browser (menu, filter, grafik, peta).
  const all = await getMessages();
  const clientMessages = Object.fromEntries(
    ["nav", "common", "data", "charts", "map"].map((ns) => [ns, (all as Record<string, unknown>)[ns]]),
  );

  return (
    <html lang={locale} className={atkinson.variable}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#konten"
          className="sr-only z-50 bg-surface-raised px-4 py-3 font-bold focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        >
          {t("common.skipToContent")}
        </a>
        <NextIntlClientProvider messages={clientMessages}>
          {meta.status === "draft" && (
            <p className="border-b border-earth/40 bg-surface-sunken px-4 py-2 text-center text-caption text-ink">
              {t("draft.banner", { version: meta.version })}
            </p>
          )}
          <SiteHeader />
          <main id="konten" tabIndex={-1} className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-10 md:px-6 md:pt-14">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
