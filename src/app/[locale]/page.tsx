import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DataSheetStat, PageHeading } from "@/components/data/blocks";
import { MetricChart } from "@/components/charts/ChartFigures";
import { MiniMap } from "@/components/map/MiniMap";
import { getPathname } from "@/i18n/navigation";
import { jenisStats, regionStats } from "@/lib/data/stats";
import { loadRelease } from "@/lib/data/release";
import { countFlag } from "@/lib/data/aggregate";
import { formatDateTime, formatNumber } from "@/lib/data/format";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { meta, totals, approvals, adminAreas, schemes } = loadRelease();
  const nat = totals.national;
  const n = (v: number) => formatNumber(v, locale);

  const provinces = adminAreas.filter((a) => a.level === "province");
  const covered = new Set(totals.by_province.map((p) => p.province_code));
  const missing = provinces.filter((p) => !covered.has(p.code)).map((p) => p.name);
  const notUsedMembers = Object.values(nat.members_records_not_used).reduce((a, b) => a + b, 0);
  const reasonEntries = Object.entries(nat.members_records_not_used);
  const reasons = reasonEntries
    .map(([k, v]) => (reasonEntries.length > 1 ? `${t(`common.reason.${k}`)}: ${n(v)}` : t(`common.reason.${k}`)))
    .join("; ");
  const source = t("common.sourceLine", { date: formatDateTime(meta.source.extracted_at, locale), version: meta.version });
  const processed = t("common.processed");
  const jenisLabel = (code: string) => {
    const s = schemes.find((x) => x.jenis_ps_code === code);
    return (locale === "en" ? s?.jenis_ps_label_en : s?.jenis_ps_label_id) ?? code;
  };
  const metrics = [
    { key: "records", label: t("charts.records"), unit: t("common.records") },
    { key: "area", label: t("charts.area"), unit: t("common.hectare"), digits: 2 },
    { key: "members", label: t("charts.members"), unit: t("charts.people") },
  ];

  return (
    <>
      <PageHeading title={t("home.title")} lead={t("home.lead")} />

      <dl className="grid gap-x-10 gap-y-10 md:grid-cols-2">
        <DataSheetStat label={t("home.recordsLabel")} value={n(nat.records)} unit={t("common.records")} source={source}>
          {t("home.recordsNote")}
        </DataSheetStat>
        <DataSheetStat
          label={t("home.provincesLabel")}
          value={t("home.provincesValue", { count: totals.provinces_with_records, total: provinces.length })}
          source={source}
        >
          {missing.length > 0 && t("home.provincesNote", { names: missing.join(", ") })}
        </DataSheetStat>
        <DataSheetStat label={t("home.areaLabel")} value={n(nat.area_ha)} unit={t("common.hectare")} source={`${processed} ${source}`}>
          {t("home.areaNote", { used: n(nat.area_records_used), flagged: n(countFlag(approvals, "area_component_mismatch")) })}
        </DataSheetStat>
        <DataSheetStat label={t("home.membersLabel")} value={n(nat.members_male_plus_female)} source={`${processed} ${source}`}>
          <span className="block font-bold">
            {t("common.membersSplit", { male: n(nat.members_male), female: n(nat.members_female) })}
          </span>
          <span className="mt-1 block">
            {t("common.femaleZeroNote", { zero: n(nat.members_female_zero_records), used: n(nat.members_records_used) })}
          </span>
          <span className="mt-1 block">
            {t("home.membersNote", { used: n(nat.members_records_used), notUsed: n(notUsedMembers), notUsedCount: notUsedMembers, reasons })}{" "}
            {nat.members_source_total_column !== null &&
              t("home.membersCompare", {
                sourceTotal: n(nat.members_source_total_column),
                mismatch: n(countFlag(approvals, "members_total_equals_female")),
              })}
          </span>
        </DataSheetStat>
      </dl>

      <section aria-labelledby="peta-mini" className="rule-top mt-12 pt-3">
        <h2 id="peta-mini" className="text-h2 font-bold">{t("home.miniMapTitle")}</h2>
        <p className="mt-1 text-caption text-ink-muted">{`${processed} ${source}`}</p>
        <div className="mt-4">
          <MiniMap
            values={Object.fromEntries(totals.by_province.map((p) => [p.province_code, p.records]))}
            label={t("home.miniMapLabel", { count: totals.provinces_with_records })}
            legendLabels={(from, to) => t("map.range", { from: n(from), to: n(to) })}
            noRecordsLabel={t("map.noRecords")}
          />
        </div>
        <p className="mt-2 text-small">
          <Link href="/map" className="inline-flex min-h-11 items-center font-bold">{t("home.openMap")}</Link>
        </p>
      </section>

      <MetricChart
        id="beranda-jenis"
        title={t("home.chartJenis")}
        caption={`${processed} ${source}`}
        metrics={metrics}
        categoryHeader={t("statistics.jenis")}
        color="#1e5a3a"
        rows={jenisStats(approvals).map((j) => ({
          label: jenisLabel(j.code),
          href: getPathname({ href: { pathname: "/data", query: { type: j.code } }, locale }),
          values: { records: j.records, area: j.area, members: j.members },
        }))}
      />
      <MetricChart
        id="beranda-provinsi"
        title={t("home.chartTopProvinces")}
        caption={`${processed} ${source}`}
        metrics={metrics}
        categoryHeader={t("map.province")}
        color="#1e5a3a"
        topN={10}
        rows={regionStats(approvals, "province", adminAreas).map((r) => ({
          label: r.name,
          href: getPathname({ href: { pathname: "/data", query: { province: r.code } }, locale }),
          values: { records: r.records, area: r.area, members: r.members },
        }))}
      />

      <nav aria-labelledby="lanjut" className="rule-top mt-14 pt-4">
        <h2 id="lanjut" className="text-small font-bold text-ink-muted">
          {t("home.next")}
        </h2>
        <ul className="mt-2 flex flex-col gap-1 text-h3 md:flex-row md:gap-8">
          <li><Link href="/statistics" className="inline-flex min-h-11 items-center">{t("home.toStatistics")}</Link></li>
          <li><Link href="/map" className="inline-flex min-h-11 items-center">{t("home.toMap")}</Link></li>
          <li><Link href="/data" className="inline-flex min-h-11 items-center">{t("home.toData", { count: n(nat.records) })}</Link></li>
          <li><Link href="/download" className="inline-flex min-h-11 items-center">{t("home.toDownload")}</Link></li>
        </ul>
      </nav>
    </>
  );
}
