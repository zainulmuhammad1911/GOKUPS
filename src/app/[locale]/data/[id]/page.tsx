import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DataNote, DuplicateBadge, EmptyValue, PageHeading, SectionCard } from "@/components/data/blocks";
import { loadSkLinks } from "@/lib/data/sk-links";
import { ChevronLeft, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadRelease } from "@/lib/data/release";
import { displaySourceValue, formatNumber } from "@/lib/data/format";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "detail" });
  return { title: t("title", { id }) };
}

const DERIVED_FIELDS = [
  "scheme_code",
  "record_kind",
  "approval_year",
  "province_code",
  "province_name_official",
  "regency_code",
  "regency_name_official",
  "members_male_plus_female",
  "members_calc_status",
  "area_calc_status",
] as const;

export default async function RecordPage({ params }: { params: Params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { byId, meta } = loadRelease();
  const record = /^[0-9a-f]{12}(-\d+)?$/.test(id) ? byId.get(id) : undefined;
  if (!record) notFound();

  const columns = meta.source_fidelity.published_source_columns;
  const dup = record.quality.duplicate;
  const otherFlags = record.quality.flags.filter((f) => !f.startsWith("duplicate_") && f !== "sk_spacing_variant");

  const derivedValue = (key: (typeof DERIVED_FIELDS)[number]) => {
    const v = record.derived[key];
    if (v === null || v === undefined) return <EmptyValue>{t("common.notAvailable")}</EmptyValue>;
    if (key === "members_calc_status" || key === "area_calc_status") return t(`detail.status.${v}`);
    if (key === "record_kind") return t(`kind.${v}`);
    if (typeof v === "number") return formatNumber(v, locale, 2, key !== "approval_year");
    return v;
  };

  return (
    <>
      <Button asChild variant="ghost" size="lg" className="mb-3 -ml-2 h-10 px-2 text-small text-deep">
        <Link href="/data">
          <ChevronLeft aria-hidden="true" />
          {t("detail.back")}
        </Link>
      </Button>
      <PageHeading title={t("detail.title", { id: record.id })} />
      <div className="-mt-4 mb-2 flex flex-wrap items-center gap-3 text-small">
        <span className="break-all whitespace-pre-wrap">{record.source["Nomor Surat Keputusan"]}</span>
        {dup && <DuplicateBadge label={t("data.duplicate")} />}
      </div>
      <p className="text-caption text-muted-foreground">{t("detail.release")} {record.release_version}</p>
      {(() => {
        const link = loadSkLinks()?.links[record.id];
        if (!link) return null;
        return (
          <div className="mt-4 flex flex-wrap gap-2">
            {link.pdf.map((url, i) => (
              <Button key={url} asChild size="lg" className="h-11 rounded-full px-4 text-small">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <FileText aria-hidden="true" />
                  {link.pdf.length > 1 ? t("detail.skPdfN", { n: i + 1 }) : t("detail.skPdf")}
                </a>
              </Button>
            ))}
            {link.detail && (
              <Button asChild variant="outline" size="lg" className="h-11 rounded-full px-4 text-small">
                <a href={link.detail} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  {t("detail.skGokups")}
                </a>
              </Button>
            )}
          </div>
        );
      })()}

      {(dup || record.quality.sk_spacing_variant_ids.length > 0) && (
        <section aria-labelledby="duplikat" className="mt-6 flex flex-col gap-4">
          {dup && (
            <DataNote>
              <h2 id="duplikat" className="mb-1 font-bold">{t("detail.duplicateTitle")}</h2>
              <p>
                {t("detail.duplicateCount", { sk: dup.approval_number, count: formatNumber(dup.record_count, locale) })}{" "}
                {dup.type === "identik" ? t("detail.duplicateIdentical") : t("detail.duplicateDiffers")}
              </p>
              <p className="mt-2 font-bold">{t("detail.duplicateList")}</p>
              <ul className="mt-1 flex flex-wrap gap-x-4">
                {dup.related_ids.map((rid) => (
                  <li key={rid}>
                    <Link href={`/data/${rid}`} className="inline-flex min-h-11 items-center tabular">{rid}</Link>
                  </li>
                ))}
              </ul>
            </DataNote>
          )}
          {record.quality.sk_spacing_variant_ids.length > 0 && (
            <DataNote title={t("detail.spacingTitle")}>
              <p>{t("detail.spacingBody")}</p>
              <ul className="mt-1 flex flex-wrap gap-x-4">
                {record.quality.sk_spacing_variant_ids.map((rid) => (
                  <li key={rid}>
                    <Link href={`/data/${rid}`} className="inline-flex min-h-11 items-center tabular">{rid}</Link>
                  </li>
                ))}
              </ul>
            </DataNote>
          )}
        </section>
      )}

      <div className="grid items-start gap-x-6 xl:grid-cols-[3fr_2fr]">
      <SectionCard id="sumber" title={t("detail.sourceTitle")} description={t("detail.sourceLead")} footer={<span className="text-caption text-muted-foreground">{t("detail.excluded")}</span>}>
      <table className="w-full border-collapse text-small" aria-labelledby="sumber">
        <thead className="sr-only">
          <tr><th scope="col">{t("detail.column")}</th><th scope="col">{t("detail.value")}</th></tr>
        </thead>
        <tbody>
          {columns.map((col) => {
            const v = displaySourceValue(record.source[col] ?? null, locale, false);
            return (
              <tr key={col} className="border-b align-top last:border-0">
                <th scope="row" className="w-2/5 py-2 pr-4 text-left font-normal text-muted-foreground md:w-1/3">{col}</th>
                <td className="py-2 break-words whitespace-pre-wrap">{v === null ? <EmptyValue>{t("common.emptyInSource")}</EmptyValue> : v}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </SectionCard>

      <div>
      <SectionCard id="olahan" title={t("detail.derivedTitle")} description={t("detail.derivedLead")}>
      <table className="w-full border-collapse text-small" aria-labelledby="olahan">
        <thead className="sr-only">
          <tr><th scope="col">{t("detail.column")}</th><th scope="col">{t("detail.value")}</th></tr>
        </thead>
        <tbody>
          {DERIVED_FIELDS.map((key) => (
            <tr key={key} className="border-b align-top last:border-0">
              <th scope="row" className="w-2/5 py-2 pr-4 text-left font-normal text-muted-foreground md:w-1/3">{t(`detail.d.${key}`)}</th>
              <td className="py-2">{derivedValue(key)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </SectionCard>

      <SectionCard id="pemeriksaan" title={t("detail.checksTitle")} description={t("detail.checksLead")}>
      {otherFlags.length === 0 && !dup ? (
        <p className="text-small">{t("detail.noChecks")}</p>
      ) : (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-small">
          {record.quality.flags.map((f) => (
            <li key={f}>{t(`flags.${f}`)}</li>
          ))}
        </ul>
      )}
      </SectionCard>
      </div>
      </div>
    </>
  );
}
