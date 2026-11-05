import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadRelease, loadSiteConfig } from "@/lib/data/release";
import { formatDateTime } from "@/lib/data/format";

export async function SiteFooter() {
  const t = await getTranslations();
  const locale = await getLocale();
  const { meta } = loadRelease();
  const site = loadSiteConfig();
  const institution = (locale === "en" ? site.institution.name_en : site.institution.name_id) ?? null;

  return (
    <footer className="mt-24 border-t border-rule bg-surface-sunken">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 md:grid-cols-[3fr_2fr] md:px-6">
        <p className="max-w-[60ch] text-small text-ink-muted">{t("footer.about")}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
          <dt className="text-ink-muted">{t("footer.source")}</dt>
          <dd>
            {meta.source.url ? <a href={meta.source.url} rel="noopener">{meta.source.name}</a> : meta.source.name}
          </dd>
          <dt className="text-ink-muted">{t("footer.extracted")}</dt>
          <dd className="tabular">{formatDateTime(meta.source.extracted_at, locale)}</dd>
          <dt className="text-ink-muted">{t("footer.release")}</dt>
          <dd className="tabular">{meta.version} ({meta.status})</dd>
          <dt className="text-ink-muted">{t("footer.institution")}</dt>
          <dd className={institution ? "" : "text-ink-muted"}>{institution ?? t("common.notSet")}</dd>
        </dl>
        <p className="text-small md:col-start-2">
          <Link href="/about">{t("footer.methodology")}</Link>
        </p>
      </div>
    </footer>
  );
}
