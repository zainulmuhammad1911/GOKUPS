import type { Metadata } from "next";
import { Fragment } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DataNote, PageHeading, SchemeSwatch, SectionHeading } from "@/components/data/blocks";
import { loadRelease } from "@/lib/data/release";
import { formatDateTime, formatNumber } from "@/lib/data/format";
import type { AggregateBlock } from "@/lib/data/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "statistics" });
  return { title: t("title") };
}

/** 5 jenis PS menurut instruksi rekap; KK selalu dengan rincian 3 subskema sumber (DECISIONS.md K8). */
const JENIS = ["HD", "HKM", "HTR", "HA", "KK"] as const;
const KK_SUB = ["KK_KULIN", "KK_KONSERVASI", "KK_IPHPS"] as const;

export default async function StatisticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { meta, totals, schemes, adminAreas } = loadRelease();
  const n = (v: number) => formatNumber(v, locale);
  const byJenis = new Map(totals.by_jenis_ps.map((s) => [s.jenis_ps_code, s]));
  const byScheme = new Map(totals.by_scheme.map((s) => [s.scheme_code, s]));
  const scheme = new Map(schemes.map((s) => [s.scheme_code, s]));
  const jenisLabel = (code: string) => {
    const s = schemes.find((x) => x.jenis_ps_code === code);
    return (locale === "en" ? s?.jenis_ps_label_en : s?.jenis_ps_label_id) ?? code;
  };
  const provJenis = new Map(totals.by_province_jenis_ps.map((r) => [`${r.province_code}|${r.jenis_ps_code}`, r.records]));
  const provScheme = new Map(totals.by_province_scheme.map((r) => [`${r.province_code}|${r.scheme_code}`, r.records]));
  const provTotal = new Map(totals.by_province.map((r) => [r.province_code, r.records]));
  const provinces = adminAreas.filter((a) => a.level === "province");
  const source = `${t("common.processed")} ${t("common.sourceLine", {
    date: formatDateTime(meta.source.extracted_at, locale),
    version: meta.version,
  })}`;

  const cells = (row: AggregateBlock | undefined) => (
    <>
      <td className="px-3 py-2 text-right">{n(row?.records ?? 0)}</td>
      <td className="px-3 py-2 text-right">{n(row?.area_ha ?? 0)}</td>
      <td className="px-3 py-2 text-right">{n(row?.members_male_plus_female ?? 0)}</td>
    </>
  );

  return (
    <>
      <PageHeading title={t("statistics.title")} lead={t("statistics.lead")} />
      <DataNote>{t("statistics.unitNote")}</DataNote>

      <SectionHeading id="rekap-nasional">{t("statistics.tableCaption")}</SectionHeading>
      <p className="mt-2 text-caption text-ink-muted">{source}</p>
      <div className="mt-4 overflow-x-auto" role="region" aria-labelledby="rekap-nasional" tabIndex={0}>
        <table className="w-full min-w-[640px] border-collapse text-small">
          <thead className="bg-surface-sunken text-left">
            <tr>
              <th scope="col" className="px-3 py-2">{t("statistics.jenis")}</th>
              <th scope="col" className="px-3 py-2">{t("statistics.kind")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.records")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.area")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.members")}</th>
            </tr>
          </thead>
          <tbody>
            {JENIS.map((code) => (
              <Fragment key={code}>
                <tr className="border-b border-rule">
                  <th scope="row" className="px-3 py-2 text-left font-bold">
                    <span className="flex items-center gap-2">
                      {code !== "KK" && <SchemeSwatch code={code} />}
                      {jenisLabel(code)}
                    </span>
                  </th>
                  <td className="px-3 py-2">{t(`kind.${code === "HA" ? "penetapan" : "persetujuan"}`)}</td>
                  {cells(byJenis.get(code))}
                </tr>
                {code === "KK" &&
                  KK_SUB.map((sub) => (
                    <tr key={sub} className="border-b border-rule bg-surface-sunken/50 text-ink">
                      <th scope="row" className="py-2 pr-3 pl-8 text-left font-normal">
                        <span className="flex items-center gap-2">
                          <SchemeSwatch code={sub} />
                          <span>
                            <span className="sr-only">{t("statistics.detailOf")} </span>
                            {scheme.get(sub)?.scheme_original}
                          </span>
                        </span>
                      </th>
                      <td className="px-3 py-2">{t("kind.persetujuan")}</td>
                      {cells(byScheme.get(sub))}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <th scope="row" colSpan={2} className="px-3 py-2 text-left">{t("statistics.total")}</th>
              {cells(totals.national)}
            </tr>
          </tfoot>
        </table>
      </div>

      <SectionHeading id="rekap-provinsi">{t("statistics.provinceCaption")}</SectionHeading>
      <p className="mt-2 text-caption text-ink-muted">{source}</p>
      <div className="mt-4 overflow-x-auto" role="region" aria-labelledby="rekap-provinsi" tabIndex={0}>
        <table className="w-full min-w-[900px] border-collapse text-small">
          <thead className="bg-surface-sunken text-left">
            <tr>
              <th scope="col" className="px-3 py-2">{t("map.province")}</th>
              {JENIS.map((c) => (
                <th key={c} scope="col" className="px-3 py-2 text-right">{jenisLabel(c)}</th>
              ))}
              {KK_SUB.map((c) => (
                <th key={c} scope="col" className="px-3 py-2 text-right font-normal text-ink-muted">
                  {scheme.get(c)?.scheme_original.replace("KEMITRAAN KEHUTANAN", "KK")}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right">{t("statistics.total")}</th>
            </tr>
          </thead>
          <tbody>
            {provinces.map((p) => (
              <tr key={p.code} className="border-b border-rule">
                <th scope="row" className="px-3 py-2 text-left font-normal">{p.name}</th>
                {JENIS.map((c) => (
                  <td key={c} className="px-3 py-2 text-right">{n(provJenis.get(`${p.code}|${c}`) ?? 0)}</td>
                ))}
                {KK_SUB.map((c) => (
                  <td key={c} className="px-3 py-2 text-right text-ink-muted">{n(provScheme.get(`${p.code}|${c}`) ?? 0)}</td>
                ))}
                <td className="px-3 py-2 text-right font-bold">{n(provTotal.get(p.code) ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-small">
        {t("statistics.regencyHint")} <Link href="/download">{t("statistics.toDownload")}</Link>
      </p>
    </>
  );
}
