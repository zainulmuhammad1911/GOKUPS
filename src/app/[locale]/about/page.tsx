import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DataNote, PageHeading, SchemeSwatch, SectionHeading } from "@/components/data/blocks";
import { loadExportSchema, loadRelease, loadSiteConfig } from "@/lib/data/release";
import { countFlag } from "@/lib/data/aggregate";
import { formatDateTime, formatNumber } from "@/lib/data/format";
import { KK_SUB_CODES } from "@/lib/data/query";
import { JENIS_ORDER } from "@/lib/data/stats";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title") };
}

/**
 * Angka capaian beranda GoKUPS dicatat di sheet Catatan workbook sumber (diambil 2026-11-04).
 * Angka ini bukan bagian dari rilis; perbarui bila workbook sumber berganti.
 */
const GOKUPS_HOMEPAGE = { institutions: 11352, areaHa: 8466567.7, date: "2026-11-04" };

const SECTIONS = [
  "purpose", "source", "unit", "schemes", "processing", "numbers", "duplicates", "checks", "limits", "map", "excluded", "manager",
] as const;

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { meta, totals, approvals, schemes } = loadRelease();
  const site = loadSiteConfig();
  const flagDocs = loadExportSchema().flag_docs;
  const n = (v: number, d = 0) => formatNumber(v, locale, d);
  const nat = totals.national;
  const notSet = <span className="text-ink-muted">{t("common.notSet")}</span>;
  const institution = locale === "en" ? site.institution.name_en : site.institution.name_id;
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", { dateStyle: "long", timeZone: "UTC" });
  const longDate = (iso: string) => dateFmt.format(new Date(iso));

  // Semua angka di halaman ini dihitung dari rilis aktif, bukan diketik manual.
  const byJenis = new Map(totals.by_jenis_ps.map((r) => [r.jenis_ps_code, r.records]));
  const byScheme = new Map(totals.by_scheme.map((r) => [r.scheme_code, r.records]));
  const dates = approvals.map((a) => a.source["Tanggal Surat Keputusan"]).filter((d): d is string => typeof d === "string").sort();
  const dupRecords = approvals.filter((a) => a.quality.duplicate);
  const dupGroups = new Set(dupRecords.map((a) => a.quality.duplicate!.approval_number)).size;
  const identical = dupRecords.filter((a) => a.quality.duplicate!.type === "identik").length;
  const femaleZero = approvals.filter((a) => a.source["Anggota Perempuan"] === 0).length;
  const yearCount = new Map(totals.by_year.map((y) => [y.approval_year, y.records]));
  const notUsedMembers = Object.values(nat.members_records_not_used).reduce((a, b) => a + b, 0);
  const flagCounts = Object.keys(flagDocs)
    .map((f) => ({ flag: f, count: countFlag(approvals, f) }))
    .filter((x) => x.count > 0);
  // Empat tahun terakhir sampai tahun pengambilan data (tanggal sesudah itu sudah diberi catatan tersendiri).
  const lastYear = new Date(meta.source.extracted_at).getUTCFullYear();
  const recentYears = [lastYear - 3, lastYear - 2, lastYear - 1, lastYear];

  const title = (s: (typeof SECTIONS)[number]) => t(`about.${s}Title`);

  return (
    <article className="max-w-[72ch]">
      <PageHeading title={t("about.title")} lead={t("about.lead")} />

      <nav aria-labelledby="isi" className="rounded-[var(--radius-panel)] border border-rule bg-surface-raised px-4 py-3">
        <h2 id="isi" className="text-small font-bold">{t("about.toc")}</h2>
        <ol className="mt-1 grid list-decimal gap-x-8 pl-5 text-small sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s}>
              <a href={`#${s}`} className="inline-flex min-h-11 items-center">{title(s)}</a>
            </li>
          ))}
        </ol>
      </nav>

      <SectionHeading id="purpose">{title("purpose")}</SectionHeading>
      <p className="mt-3">{t("about.purposeBody")}</p>

      <SectionHeading id="source">{title("source")}</SectionHeading>
      <p className="mt-3">
        {t("about.sourceBody", {
          date: formatDateTime(meta.source.extracted_at, locale),
          reported: n(meta.source.records_total_reported_by_source ?? 0),
          rows: n(meta.counts.rows),
        })}{" "}
        {dates.length > 0 && t("about.sourcePeriod", { from: longDate(dates[0]!), to: longDate(dates[dates.length - 1]!) })}
      </p>
      <p className="mt-3">
        {t("about.sourceUpdate", { version: meta.version, built: formatDateTime(meta.built_at, locale) })}
      </p>

      <SectionHeading id="unit">{title("unit")}</SectionHeading>
      <p className="mt-3">{t("about.unitBody")}</p>
      <p className="mt-3">{t("about.unitHtr")}</p>
      <p className="mt-3">{t("about.unitShared")}</p>

      <SectionHeading id="schemes">{title("schemes")}</SectionHeading>
      <p className="mt-3">{t("about.schemesLead")}</p>
      <dl className="mt-4 flex flex-col gap-4">
        {JENIS_ORDER.map((code) => {
          const s = schemes.find((x) => x.jenis_ps_code === code);
          return (
            <div key={code}>
              <dt className="flex flex-wrap items-center gap-x-3 font-bold">
                <span className="flex items-center gap-2">
                  <SchemeSwatch code={code} />
                  {locale === "en" ? s?.jenis_ps_label_en : s?.jenis_ps_label_id}
                </span>
                <Link href={{ pathname: "/data", query: { type: code } }} className="text-small font-normal">
                  {t("about.schemeCount", { count: n(byJenis.get(code) ?? 0) })}
                </Link>
              </dt>
              <dd className="mt-1">
                {t(`about.def.${code}`)}
                {code === "KK" && (
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                    {KK_SUB_CODES.map((sub) => (
                      <li key={sub}>
                        {t(`about.kkSub.${sub}`)}:{" "}
                        <Link href={{ pathname: "/data", query: { type: sub } }}>
                          {t("about.schemeCount", { count: n(byScheme.get(sub) ?? 0) })}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <SectionHeading id="processing">{title("processing")}</SectionHeading>
      <p className="mt-3">{t("about.processingFidelity")}</p>
      <p className="mt-3">{t("about.processingDerived")}</p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
        <li>{t("about.processingRegion", { pairs: n(totals.regencies_with_records) })}</li>
        <li>{t("about.processingJenis")}</li>
        <li>{t("about.processingYear")}</li>
        <li>{t("about.processingMembers")}</li>
        <li>{t("about.processingFlags")}</li>
      </ul>

      <SectionHeading id="numbers">{title("numbers")}</SectionHeading>
      <p className="mt-3">{t("about.numbersLabel")}</p>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
        <li>{t("about.numbersRecords", { records: n(nat.records) })}</li>
        <li>{t("about.numbersArea", { area: n(nat.area_ha, 2), used: n(nat.area_records_used) })}</li>
        <li>
          {t("about.numbersMembers", {
            members: n(nat.members_male_plus_female),
            used: n(nat.members_records_used),
            notUsed: notUsedMembers,
          })}
        </li>
        <li>
          {t("about.numbersSex", {
            male: n(nat.members_male),
            female: n(nat.members_female),
            members: n(nat.members_male_plus_female),
            zero: n(nat.members_female_zero_records),
          })}
        </li>
        <li>
          {t("about.numbersSourceTotal", {
            sourceTotal: n(nat.members_source_total_column ?? 0),
            mismatch: n(countFlag(approvals, "members_total_equals_female")),
          })}
        </li>
      </ul>

      <SectionHeading id="duplicates">{title("duplicates")}</SectionHeading>
      <p className="mt-3">{t("about.duplicatesBody", { groups: n(dupGroups), records: n(dupRecords.length) })}</p>
      <p className="mt-3">
        {t("about.duplicatesTypes", { identical: n(identical), differs: n(dupRecords.length - identical) })}
      </p>
      <p className="mt-3">{t("about.duplicatesSpacing", { count: n(countFlag(approvals, "sk_spacing_variant")) })}</p>
      <p className="mt-3">
        <Link href={{ pathname: "/data", query: { flag: "duplicate_sk" } }}>{t("about.duplicatesLink")}</Link>
      </p>

      <SectionHeading id="checks">{title("checks")}</SectionHeading>
      <p className="mt-3">{t("about.checksLead")}</p>
      <div className="relative mt-4 overflow-x-auto" role="region" aria-labelledby="checks" tabIndex={0}>
        <table className="w-full border-collapse text-small">
          <thead className="bg-surface-sunken text-left">
            <tr>
              <th scope="col" className="px-3 py-2">{t("about.checksNote")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("about.checksCount")}</th>
            </tr>
          </thead>
          <tbody>
            {flagCounts.map(({ flag, count }) => (
              <tr key={flag} className="border-b border-rule align-top">
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <span className="font-bold">{t(`flagLabel.${flag}`)}</span>
                  <span className="block text-ink-muted">{t(`flags.${flag}`)}</span>
                </th>
                <td className="px-3 py-2 text-right">
                  <Link href={{ pathname: "/data", query: { flag } }} className="tabular">
                    {n(count)}
                    <span className="sr-only"> {t("statistics.recordsOf", { context: t(`flagLabel.${flag}`) })}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeading id="limits">{title("limits")}</SectionHeading>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
        <li>
          {t("about.limitsHomepage", {
            homeDate: longDate(GOKUPS_HOMEPAGE.date),
            homeInstitutions: n(GOKUPS_HOMEPAGE.institutions),
            homeArea: n(GOKUPS_HOMEPAGE.areaHa, 0),
            records: n(nat.records),
            area: n(nat.area_ha, 0),
          })}
        </li>
        <li>{t("about.limitsRounding")}</li>
        <li>{t("about.limitsFemale", { pct: n((femaleZero / approvals.length) * 100, 0) })}</li>
        <li>
          {t("about.limitsRecent", {
            lastYears: t("about.yearPair", { a: lastYear - 1, b: lastYear }),
            recent: recentYears.map((y) => `${y}: ${n(yearCount.get(y) ?? 0)}`).join(", "),
          })}
        </li>
        <li>{t("about.limitsDistrict")}</li>
        <li>{t("about.limitsRegion")}</li>
      </ul>

      <SectionHeading id="map">{title("map")}</SectionHeading>
      <p className="mt-3">{t("about.mapBody")}</p>

      <SectionHeading id="excluded">{title("excluded")}</SectionHeading>
      <p className="mt-3">{t("about.excludedBody")}</p>

      <SectionHeading id="manager">{title("manager")}</SectionHeading>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <dt className="text-ink-muted">{t("about.institution")}</dt>
        <dd>{institution ?? notSet}</dd>
        <dt className="text-ink-muted">{t("about.license")}</dt>
        <dd>{site.data_license.name ?? notSet}</dd>
        <dt className="text-ink-muted">{t("about.contact")}</dt>
        <dd>{site.institution.contact_email ?? notSet}</dd>
      </dl>
      {meta.status === "draft" && (
        <div className="mt-6">
          <DataNote>{t("download.draftNote")}</DataNote>
        </div>
      )}
    </article>
  );
}
