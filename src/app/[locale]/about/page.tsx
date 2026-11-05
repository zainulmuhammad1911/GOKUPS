import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeading, SectionHeading } from "@/components/data/blocks";
import { loadRelease, loadSiteConfig } from "@/lib/data/release";
import { formatDateTime, formatNumber } from "@/lib/data/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title") };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { meta, totals } = loadRelease();
  const site = loadSiteConfig();
  const notSet = <span className="text-ink-muted">{t("common.notSet")}</span>;
  const institution = locale === "en" ? site.institution.name_en : site.institution.name_id;
  const d = totals.definitions;

  return (
    <article className="max-w-[68ch]">
      <PageHeading title={t("about.title")} />

      <SectionHeading>{t("about.fidelityTitle")}</SectionHeading>
      <p className="mt-3">{t("about.fidelityBody")}</p>

      <SectionHeading>{t("about.sourceTitle")}</SectionHeading>
      <p className="mt-3">
        {t("about.sourceBody", {
          date: formatDateTime(meta.source.extracted_at, locale),
          reported: formatNumber(meta.source.records_total_reported_by_source ?? 0, locale),
          rows: formatNumber(meta.counts.rows, locale),
        })}
      </p>

      <SectionHeading>{t("about.numbersTitle")}</SectionHeading>
      {/* Definisi diambil langsung dari control_totals.json agar sama persis dengan pipeline (bahasa Indonesia). */}
      <ul className="mt-3 flex list-disc flex-col gap-3 pl-5" lang="id">
        {(["label", "records", "area_ha", "members_male_plus_female", "members_source_total_column", "trace"] as const).map(
          (key) => d[key] && <li key={key}>{d[key]}</li>,
        )}
      </ul>

      <SectionHeading>{t("about.excludedTitle")}</SectionHeading>
      <p className="mt-3">{t("about.excludedBody")}</p>

      <SectionHeading>{t("about.managerTitle")}</SectionHeading>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <dt className="text-ink-muted">{t("about.institution")}</dt>
        <dd>{institution ?? notSet}</dd>
        <dt className="text-ink-muted">{t("about.license")}</dt>
        <dd>{site.data_license.name ?? notSet}</dd>
        <dt className="text-ink-muted">{t("about.contact")}</dt>
        <dd>{site.institution.contact_email ?? notSet}</dd>
      </dl>
    </article>
  );
}
