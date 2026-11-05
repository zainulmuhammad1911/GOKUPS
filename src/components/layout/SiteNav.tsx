"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { href: "/", key: "home" },
  { href: "/map", key: "map" },
  { href: "/statistics", key: "statistics" },
  { href: "/data", key: "data" },
  { href: "/download", key: "download" },
  { href: "/about", key: "about" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Tutup menu ponsel saat pindah halaman, dan dengan tombol Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const links = ITEMS.map((item) => {
    const active = isActive(pathname, item.href);
    return (
      <li key={item.key}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-11 items-center px-3 no-underline text-ink hover:text-forest ${
            active ? "font-bold text-forest underline decoration-2 underline-offset-[0.4em]" : ""
          }`}
        >
          {t(`nav.${item.key}`)}
        </Link>
      </li>
    );
  });

  const languages = (
    <ul className="flex items-center" aria-label={t("common.language")}>
      {(["id", "en"] as const).map((l, i) => (
        <li key={l} className="flex items-center">
          {i > 0 && <span aria-hidden="true" className="text-ink-muted">|</span>}
          <Link
            href={pathname}
            locale={l}
            lang={l}
            hrefLang={l}
            aria-current={locale === l ? "true" : undefined}
            className={`flex min-h-11 min-w-11 items-center justify-center px-2 no-underline ${
              locale === l ? "font-bold text-ink" : "text-forest underline"
            }`}
          >
            {l.toUpperCase()}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <nav aria-label={t("nav.label")} className="flex items-center gap-2">
      <ul className="hidden items-center lg:flex">{links}</ul>
      <div className="hidden lg:block">{languages}</div>
      <button
        ref={buttonRef}
        type="button"
        className="min-h-11 rounded-[var(--radius-control)] border border-rule-strong px-4 text-small font-bold text-forest lg:hidden"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? t("common.closeMenu") : t("common.menu")}
      </button>
      <div
        id={menuId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-20 border-b border-rule bg-surface-raised px-4 pb-4 lg:hidden"
      >
        <ul className="flex flex-col py-2">{links}</ul>
        <div className="rule-top pt-2">{languages}</div>
      </div>
    </nav>
  );
}
