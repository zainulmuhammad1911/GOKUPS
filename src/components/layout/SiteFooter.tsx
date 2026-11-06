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
    <footer className="mt-16 border-t bg-muted/60">
      <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-4 py-8 text-sm md:grid-cols-[3fr_2fr] md:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <p className="max-w-[60ch] text-muted-foreground">{t("footer.about")}</p>
          <p>
            <Link href="/about">{t("footer.methodology")}</Link>
          </p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">{t("footer.source")}</dt>
          <dd>{meta.source.url ? <a href={meta.source.url} rel="noopener">{meta.source.name}</a> : meta.source.name}</dd>
          <dt className="text-muted-foreground">{t("footer.extracted")}</dt>
          <dd className="tabular">{formatDateTime(meta.source.extracted_at, locale)}</dd>
          <dt className="text-muted-foreground">{t("footer.release")}</dt>
          <dd className="tabular">
            {meta.version} ({meta.status})
          </dd>
          <dt className="text-muted-foreground">{t("footer.institution")}</dt>
          <dd className={institution ? "" : "text-muted-foreground"}>{institution ?? t("common.notSet")}</dd>
        </dl>
      </div>
    </footer>
  );
}
