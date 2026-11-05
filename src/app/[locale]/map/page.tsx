import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataNote, PageHeading, SectionHeading } from "@/components/data/blocks";
import { loadRelease } from "@/lib/data/release";
import { formatDateTime, formatNumber } from "@/lib/data/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "map" });
  return { title: t("title") };
}

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { meta, totals, adminAreas } = loadRelease();
  const n = (v: number) => formatNumber(v, locale);
  const byCode = new Map(totals.by_province.map((p) => [p.province_code, p]));
  const provinces = adminAreas.filter((a) => a.level === "province");

  return (
    <>
      <PageHeading title={t("map.title")} />
      {/* K6: geometri batas wilayah belum boleh dimuat sebelum lisensinya jelas. */}
      <DataNote title={t("map.unavailableTitle")}>{t("map.unavailableBody")}</DataNote>

      <SectionHeading id="tabel-provinsi">{t("map.tableCaption")}</SectionHeading>
      <p className="mt-2 text-caption text-ink-muted">
        {t("common.processed")} {t("common.sourceLine", { date: formatDateTime(meta.source.extracted_at, locale), version: meta.version })}
      </p>
      <div className="mt-4 overflow-x-auto" role="region" aria-labelledby="tabel-provinsi" tabIndex={0}>
        <table className="w-full min-w-[560px] border-collapse text-small">
          <thead className="bg-surface-sunken text-left">
            <tr>
              <th scope="col" className="px-3 py-2">{t("map.code")}</th>
              <th scope="col" className="px-3 py-2">{t("map.province")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.records")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.area")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.members")}</th>
            </tr>
          </thead>
          <tbody>
            {provinces.map((p) => {
              const row = byCode.get(p.code);
              return (
                <tr key={p.code} className="border-b border-rule">
                  <td className="px-3 py-2 tabular text-ink-muted">{p.code}</td>
                  <th scope="row" className="px-3 py-2 text-left font-normal">{p.name}</th>
                  {row ? (
                    <>
                      <td className="px-3 py-2 text-right">{n(row.records)}</td>
                      <td className="px-3 py-2 text-right">{n(row.area_ha)}</td>
                      <td className="px-3 py-2 text-right">{n(row.members_male_plus_female)}</td>
                    </>
                  ) : (
                    <td colSpan={3} className="px-3 py-2 text-right text-ink-muted">{t("map.noRecords")}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
