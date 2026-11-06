import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { loadRelease, loadSiteConfig } from "@/lib/data/release";
import { formatDateTime } from "@/lib/data/format";
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
  const site = loadSiteConfig();
  // Hanya teks yang dipakai komponen klien yang dikirim ke browser (menu, filter, grafik, peta).
  const all = await getMessages();
  const clientMessages = Object.fromEntries(
    ["nav", "common", "data", "charts", "map"].map((ns) => [ns, (all as Record<string, unknown>)[ns]]),
  );

  return (
    <html lang={locale} className={atkinson.variable}>
      <body>
        <a
          href="#konten"
          className="sr-only z-50 rounded-md bg-card px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("common.skipToContent")}
        </a>
        <NextIntlClientProvider messages={clientMessages}>
            <SidebarProvider>
              <AppSidebar
                productName={locale === "en" ? site.product.name_en : site.product.name_id}
                shortName={site.product.short_name}
                version={meta.version}
                draft={meta.status === "draft"}
                extracted={formatDateTime(meta.source.extracted_at, locale)}
                extractedLabel={t("footer.extracted")}
              />
              <SidebarInset className="min-w-0">
                {meta.status === "draft" && (
                  <p className="border-b border-earth/30 bg-muted px-4 py-2 text-center text-caption text-foreground">
                    {t("draft.banner", { version: meta.version })}
                  </p>
                )}
                <SiteHeader shortName={site.product.short_name} />
                <main id="konten" tabIndex={-1} className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-4 md:px-6 md:pt-8 lg:px-8">
                  {children}
                </main>
                <SiteFooter />
              </SidebarInset>
            </SidebarProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
