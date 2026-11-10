"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS, isActive } from "./nav-items";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Bilah navigasi atas. Di layar lebar, sorotan (pill) bergeser ke menu yang sedang ditunjuk
 * atau difokus, lalu kembali ke halaman aktif. Di layar kecil, menu dibuka dari samping.
 */
export function SiteNav({ productName, logoSrc, version, draft }: { productName: string; logoSrc: string; version: string; draft: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();
  const listRef = useRef<HTMLUListElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [hovering, setHovering] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const moveTo = (el: HTMLElement | null) => {
    if (!el || !listRef.current) return setPill(null);
    const box = listRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setPill({ left: r.left - box.left, width: r.width });
  };
  const toActive = () => moveTo(listRef.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(toActive, [pathname, locale]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const onResize = () => toActive();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const languages = (
    <ul className="flex items-center rounded-full border bg-card p-0.5" aria-label={t("common.language")}>
      {(["id", "en"] as const).map((l) => (
        <li key={l}>
          <Link
            href={pathname}
            locale={l}
            lang={l}
            hrefLang={l}
            data-slot="language"
            aria-current={locale === l ? "true" : undefined}
            className={`flex h-9 min-w-10 items-center justify-center rounded-full px-2.5 font-mono text-xs font-bold no-underline transition-colors ${
              locale === l ? "bg-forest text-white" : "text-forest hover:bg-accent"
            }`}
          >
            {l.toUpperCase()}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-[background-color,box-shadow] duration-300 ${
        scrolled ? "bg-background/85 shadow-[0_8px_30px_-18px_rgb(23_63_53/0.45)] backdrop-blur-md" : "bg-background/95"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 px-4 md:px-6 lg:px-8">
        <Link href="/" data-slot="brand" className="flex shrink-0 items-center no-underline" aria-label={t("nav.homeLabel", { name: productName })}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={639} height={234} className="h-10 w-auto" />
        </Link>
        {draft && (
          <span className="hidden rounded-full border border-tri-ink/40 px-2 py-0.5 font-mono text-[0.6875rem] font-bold text-tri-ink sm:inline-block">
            {t("common.draftBadge")} · {version}
          </span>
        )}

        <nav aria-label={t("nav.label")} className="ml-auto hidden lg:block">
          <ul
            ref={listRef}
            className="relative flex items-center gap-0.5"
            onMouseLeave={() => {
              setHovering(false);
              toActive();
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setHovering(false);
                toActive();
              }
            }}
          >
            {pill && (
              <li
                aria-hidden="true"
                className={`pointer-events-none absolute inset-y-1 rounded-full transition-[left,width,background-color] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none ${
                  hovering ? "bg-accent" : "bg-transparent"
                }`}
                style={{ left: pill.left, width: pill.width }}
              />
            )}
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.key} className="relative">
                  <Link
                    href={item.href}
                    data-slot="nav-link"
                    aria-current={active ? "page" : undefined}
                    onMouseEnter={(e) => {
                      setHovering(true);
                      moveTo(e.currentTarget);
                    }}
                    onFocus={(e) => {
                      setHovering(true);
                      moveTo(e.currentTarget);
                    }}
                    className={`relative flex h-10 items-center rounded-full px-3.5 text-[0.9375rem] font-bold no-underline transition-colors ${
                      active ? "text-forest" : "text-muted-foreground hover:text-forest"
                    }`}
                  >
                    {t(`nav.${item.key}`)}
                    {active && <span aria-hidden="true" className="absolute inset-x-3.5 -bottom-[13px] h-[3px] rounded-full bg-tri" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          {languages}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full border bg-card text-forest lg:hidden"
                aria-label={t("common.menu")}
              >
                <Menu aria-hidden="true" className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" showCloseButton={false} className="surface-forest w-[85%] max-w-sm gap-0 border-l-0 p-0 text-white">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <SheetTitle className="font-mono text-xs font-bold tracking-[0.14em] text-[#dce9df] uppercase">{t("nav.label")}</SheetTitle>
                <SheetClose asChild>
                  <button type="button" className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white" aria-label={t("common.close")}>
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </SheetClose>
              </div>
              <SheetDescription className="sr-only">{productName}</SheetDescription>
              <nav aria-label={t("nav.label")} className="relative flex-1 overflow-y-auto px-3 py-4">
                <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 text-white/10" />
                <ul className="relative flex flex-col gap-1">
                  {NAV_ITEMS.map((item, i) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.key} className="split-word block" style={{ ["--i" as string]: i }}>
                        <Link
                          href={item.href}
                          data-slot="nav-link"
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-12 items-center gap-3 rounded-xl px-4 font-heading text-lg font-bold text-white no-underline transition-colors ${
                            active ? "bg-white/12" : "hover:bg-white/8"
                          }`}
                        >
                          <span aria-hidden="true" className={`h-5 w-1 rounded-full ${active ? "bg-tri" : "bg-white/20"}`} />
                          {t(`nav.${item.key}`)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
