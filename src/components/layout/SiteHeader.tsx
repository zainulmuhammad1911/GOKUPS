"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SECTIONS = ["map", "statistics", "data", "download", "about"] as const;

/** Bilah atas: tombol menu, posisi halaman, dan pilihan bahasa. */
export function SiteHeader({ shortName }: { shortName: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();
  const segments = pathname.split("/").filter(Boolean);
  const section = SECTIONS.find((s) => s === segments[0]);
  const isRecord = section === "data" && segments.length > 1;

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4">
      <SidebarTrigger label={t("common.menu")} className="size-10" />
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem className="hidden sm:inline-flex">
            {section ? (
              <BreadcrumbLink asChild>
                <Link href="/">{shortName}</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{shortName}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {section && <BreadcrumbSeparator className="hidden sm:block" />}
          {section && (
            <BreadcrumbItem className="min-w-0">
              {isRecord ? (
                <BreadcrumbLink asChild>
                  <Link href={`/${section}`}>{t(`nav.${section}`)}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate">{t(`nav.${section}`)}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          )}
          {isRecord && <BreadcrumbSeparator />}
          {isRecord && (
            <BreadcrumbItem>
              <BreadcrumbPage>{t("nav.record")}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
          {!section && segments.length === 0 && (
            <>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{t("nav.home")}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <ul className="flex items-center rounded-lg border bg-card p-0.5" aria-label={t("common.language")}>
        {(["id", "en"] as const).map((l) => (
          <li key={l}>
            <Link
              href={pathname}
              locale={l}
              lang={l}
              hrefLang={l}
              data-slot="language"
              aria-current={locale === l ? "true" : undefined}
              className={`flex h-9 min-w-10 items-center justify-center rounded-md px-2 text-sm font-bold no-underline ${
                locale === l ? "bg-primary text-primary-foreground" : "text-primary hover:bg-accent"
              }`}
            >
              {l.toUpperCase()}
            </Link>
          </li>
        ))}
      </ul>
    </header>
  );
}
