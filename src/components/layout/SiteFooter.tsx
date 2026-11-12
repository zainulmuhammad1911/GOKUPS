import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadRelease, loadSiteConfig } from "@/lib/data/release";
import { formatDateTime } from "@/lib/data/format";
import { NAV_ITEMS } from "./nav-items";

export async function SiteFooter() {
  const t = await getTranslations();
  const locale = await getLocale();
  const { meta } = loadRelease();
  const site = loadSiteConfig();
  const institution = (locale === "en" ? site.institution.name_en : site.institution.name_id) ?? null;

  return (
    <footer className="surface-forest relative mt-20 overflow-hidden">
      <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 text-white/[0.06]" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-24 size-[28rem] rounded-full bg-tri/25 blur-3xl" />
      <div className="relative mx-auto grid w-full max-w-[1400px] gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-6 lg:px-8">
        <div className="flex flex-col gap-5">
          <div className="flex w-fit flex-wrap items-center gap-4">
            {site.institution.logo_path && institution && (
              <span className="rounded-2xl bg-white px-5 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={site.institution.logo_path} alt={institution} width={631} height={234} className="h-11 w-auto" />
              </span>
            )}
            <span className="font-heading text-2xl font-extrabold tracking-tight text-white">{site.product.short_name}</span>
          </div>
          <p className="max-w-[52ch] text-small text-[#ffe3ea]">{t("footer.about")}</p>
          <p className="text-small">
            <Link href="/about">{t("footer.methodology")}</Link>
          </p>
        </div>
        <nav aria-labelledby="footer-nav">
          <h2 id="footer-nav" className="font-mono text-xs font-bold tracking-[0.14em] text-[#ffd0db] uppercase">
            {t("footer.explore")}
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-small md:grid-cols-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="inline-flex min-h-9 items-center no-underline hover:underline">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-mono text-xs font-bold tracking-[0.14em] text-[#ffd0db] uppercase">{t("footer.dataTitle")}</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-small">
            <dt className="text-[#ffd0db]">{t("footer.source")}</dt>
            <dd>{meta.source.url ? <a href={meta.source.url} rel="noopener">{meta.source.name}</a> : meta.source.name}</dd>
            <dt className="text-[#ffd0db]">{t("footer.extracted")}</dt>
            <dd className="tabular">{formatDateTime(meta.source.extracted_at, locale)}</dd>
            <dt className="text-[#ffd0db]">{t("footer.release")}</dt>
            <dd className="tabular">
              {meta.version} ({meta.status})
            </dd>
            <dt className="text-[#ffd0db]">{t("footer.institution")}</dt>
            <dd className={institution ? "" : "text-[#ffd0db]"}>{institution ?? t("common.notSet")}</dd>
          </dl>
        </div>
      </div>
    </footer>
  );
}
