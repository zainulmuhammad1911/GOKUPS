import type { Metadata } from "next";
import { Fragment } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import { DataNote, JENIS_COLOR_HEX, PageHeading, SchemeSwatch, SectionCard } from "@/components/data/blocks";
import { DataFilters } from "@/components/data/DataFilters";
import { MetricChart, StackedChart } from "@/components/charts/ChartFigures";
import { loadExportSchema, loadRelease } from "@/lib/data/release";
import { loadOmsDirectory } from "@/lib/data/oms";
import { omsCountForProvince } from "@/lib/data/oms-query";
import { aggregate } from "@/lib/data/aggregate";
import { formatDateTime, formatNumber } from "@/lib/data/format";
import {
  activeFilterCount,
  applyQuery,
  EMPTY_QUERY,
  KK_SUB_CODES,
  MEMBER_FILTERS,
  memberFilterCounts,
  PENDAMPING_FILTERS,
  regionList,
  parseQuery,
  queryContext,
  toSearchParams,
  type DataQuery,
} from "@/lib/data/query";
import { JENIS_ORDER, jenisStats, regionStats } from "@/lib/data/stats";
import type { AggregateBlock } from "@/lib/data/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "statistics" });
  return { title: t("title") };
}

export default async function StatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { meta, approvals, schemes, adminAreas } = loadRelease();
  const ctx = queryContext(adminAreas, approvals, Object.keys(loadExportSchema().flag_docs));
  const parsed = parseQuery(await searchParams, ctx);
  // Statistik memakai filter wilayah, jenis PS, tahun, dan jumlah anggota tercatat (DataFilters mode minimal).
  const query: DataQuery = {
    ...EMPTY_QUERY,
    region: parsed.query.region,
    province: parsed.query.province,
    regency: parsed.query.regency,
    type: parsed.query.type,
    yearFrom: parsed.query.yearFrom,
    yearTo: parsed.query.yearTo,
    members: parsed.query.members,
    pendamping: parsed.query.pendamping,
  };
  const records = applyQuery(approvals, query);
  const n = (v: number) => formatNumber(v, locale);
  const nameOf = new Map(adminAreas.map((a) => [a.code, a.name]));
  const jenisLabel = (code: string) => {
    const s = schemes.find((x) => x.jenis_ps_code === code);
    return (locale === "en" ? s?.jenis_ps_label_en : s?.jenis_ps_label_id) ?? code;
  };
  const kkSub = KK_SUB_CODES.map((c) => ({ code: c, name: schemes.find((s) => s.scheme_code === c)?.scheme_original ?? c }));
  const dataHref = (extra: Partial<DataQuery>) =>
    getPathname({ href: { pathname: "/data", query: toSearchParams({ ...query, ...extra }) }, locale });

  const level: "province" | "regency" = query.province || query.regency ? "regency" : "province";
  const regionWord = level === "province" ? t("statistics.perProvince") : t("statistics.perRegency");
  const regions = regionStats(records, level, adminAreas);
  const regencies = regionStats(records, "regency", adminAreas);
  const scope =
    (query.regency
      ? nameOf.get(query.regency)
      : query.province
        ? nameOf.get(query.province)
        : query.region
          ? `${t("data.region")} ${query.region}`
          : t("statistics.indonesia")) ?? "";

  const metrics = [
    { key: "records", label: t("charts.records"), unit: t("common.records") },
    { key: "area", label: t("charts.area"), unit: t("common.hectare"), digits: 2 },
    { key: "members", label: t("charts.members"), unit: t("charts.people") },
  ];
  const toRow = (r: { name: string; records: number; area: number; members: number }, href: string) => ({
    label: r.name,
    href,
    values: { records: r.records, area: r.area, members: r.members },
  });
  const regionQuery = (code: string): Partial<DataQuery> => (level === "province" ? { province: code } : { regency: code });
  const caption = `${t("common.processed")} ${t("common.sourceLine", {
    date: formatDateTime(meta.source.extracted_at, locale),
    version: meta.version,
  })}`;

  const byJenis = new Map(JENIS_ORDER.map((c) => [c, aggregate(records.filter((r) => r.derived.jenis_ps_code === c))]));
  const bySub = new Map(KK_SUB_CODES.map((c) => [c, aggregate(records.filter((r) => r.derived.scheme_code === c))]));
  const total = aggregate(records);
  const statsPath = getPathname({ href: "/statistics", locale });

  const countLink = (count: number, extra: Partial<DataQuery>, context: string) =>
    count > 0 ? (
      <Link href={{ pathname: "/data", query: toSearchParams({ ...query, ...extra }) }} className="tabular">
        {n(count)}
        <span className="sr-only"> {t("statistics.recordsOf", { context })}</span>
      </Link>
    ) : (
      n(0)
    );
  const cells = (row: AggregateBlock, extra: Partial<DataQuery>, context: string) => (
    <>
      <td className="px-3 py-2 text-right">{countLink(row.records, extra, context)}</td>
      <td className="px-3 py-2 text-right tabular">{n(row.area_ha)}</td>
      <td className="px-3 py-2 text-right tabular">{n(row.members_male_plus_female)}</td>
      <td className="px-3 py-2 text-right tabular">{n(row.members_male)}</td>
      <td className="px-3 py-2 text-right tabular">{n(row.members_female)}</td>
    </>
  );
  // Cakupan kabupaten/kota: berapa kabupaten/kota (Kepmendagri 2025) yang punya SK, dari rekaman yang lolos filter.
  const regencyAreas = adminAreas.filter((a) => a.level === "regency");
  const regencyByCode = new Map(regencies.map((r) => [r.code, r]));
  const coverageProvince = query.province && !query.regency ? query.province : null;
  const coverageProvinces = adminAreas
    .filter((a) => a.level === "province")
    .filter((a) => !query.region || ctx.provinceRegion.get(a.code) === query.region)
    .map((p) => {
      const regs = regencyAreas.filter((r) => r.parent_code === p.code);
      const withSk = regs.filter((r) => regencyByCode.has(r.code));
      const area = withSk.reduce((sum, r) => sum + (regencyByCode.get(r.code)?.area ?? 0), 0);
      const sk = withSk.reduce((sum, r) => sum + (regencyByCode.get(r.code)?.records ?? 0), 0);
      return { code: p.code, name: p.name, total: regs.length, withSk: withSk.length, area, sk };
    });
  const coverageRegencies = coverageProvince
    ? regencyAreas
        .filter((r) => r.parent_code === coverageProvince)
        .map((r) => ({ code: r.code, name: r.name, stat: regencyByCode.get(r.code) }))
    : [];
  const coverageSummary = coverageProvince
    ? {
        total: coverageRegencies.length,
        withSk: coverageRegencies.filter((r) => r.stat).length,
        area: coverageRegencies.reduce((sum, r) => sum + (r.stat?.area ?? 0), 0),
      }
    : {
        total: coverageProvinces.reduce((sum, p) => sum + p.total, 0),
        withSk: coverageProvinces.reduce((sum, p) => sum + p.withSk, 0),
        area: coverageProvinces.reduce((sum, p) => sum + p.area, 0),
      };
  const regionKey = (code: string) => (r: (typeof records)[number]) =>
    (level === "province" ? r.derived.province_code : r.derived.regency_code) === code;

  return (
    <>
      <PageHeading title={t("statistics.title")} lead={t("statistics.lead")} />
      <DataNote>{t("statistics.unitNote")}</DataNote>

      <div className="mt-6">
        <DataFilters
          action={statsPath}
          resetHref={statsPath}
          values={{ ...query }}
          regions={regionList(ctx)}
          provinces={adminAreas
            .filter((a) => a.level === "province")
            .map((a) => ({ code: a.code, name: a.name, region: ctx.provinceRegion.get(a.code) }))}
          regencies={adminAreas.filter((a) => a.level === "regency").map((a) => ({ code: a.code, name: a.name, parent: a.parent_code }))}
          types={JENIS_ORDER.map((c) => ({ code: c, name: jenisLabel(c) }))}
          kkSubtypes={kkSub}
          flags={[]}
          years={Array.from({ length: ctx.years.max - ctx.years.min + 1 }, (_, i) => ctx.years.min + i)}
          memberOptions={(() => {
            const c = memberFilterCounts(approvals);
            return MEMBER_FILTERS.map((f) => ({ code: f, name: `${t(`data.membersOpt.${f}`)} (${n(c[f])})` }));
          })()}
          pendampingOptions={(() => {
            const ada = approvals.filter((r) => r.derived.pendamping_status === "tercatat").length;
            return PENDAMPING_FILTERS.map((f) => ({
              code: f,
              name: `${t(`data.pendampingOpt.${f}`)} (${n(f === "ada" ? ada : approvals.length - ada)})`,
            }));
          })()}
          activeCount={activeFilterCount(query)}
          minimal
        />
      </div>
      {query.province && (() => {
        // Tautan ke Direktori OMS (sumber terpisah); tidak memengaruhi angka di halaman ini.
        const count = omsCountForProvince(loadOmsDirectory().entries, query.province.slice(0, 2));
        return count > 0 ? (
          <p className="mt-4 text-small">
            <Link href={{ pathname: "/organizations", query: { province: query.province.slice(0, 2) } }}>
              {t("oms.provinceLink", { count: n(count) })}
            </Link>
          </p>
        ) : null;
      })()}
      {parsed.ignored.length > 0 && (
        <div className="mt-4">
          <DataNote>{t("data.ignored", { names: parsed.ignored.join(", ") })}</DataNote>
        </div>
      )}
      {query.pendamping && (
        <div className="mt-4">
          <DataNote>
            <strong>{t("data.pendamping")}: {t(`data.pendampingOpt.${query.pendamping}`)}.</strong> {t("data.pendampingNote")}
          </DataNote>
        </div>
      )}
      {query.members && (
        <div className="mt-4">
          <DataNote>
            <strong>{t("data.members")}: {t(`data.membersOpt.${query.members}`)}.</strong>{" "}
            {t("data.membersNote", {
              perorangan: n(approvals.filter((r) => r.source["Bentuk Lembaga"] === "PERORANGAN").length),
            })}
          </DataNote>
        </div>
      )}

      <p className="mt-6 text-h3 font-bold" aria-live="polite">
        {t("statistics.scopeLine", { count: n(records.length), scope })}
      </p>
      <p className="mt-1 text-small">
        <Link href={{ pathname: "/data", query: toSearchParams(query) }}>{t("statistics.toRecords", { count: n(records.length) })}</Link>
      </p>

      {!query.regency && (
        <SectionCard
          id="cakupan-kabupaten"
          title={t("statistics.coverage.title", { scope })}
          description={`${t("statistics.coverage.lead")} ${caption}`}
        >
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted px-5 py-4">
              <p className="text-small text-muted-foreground">{t("statistics.coverage.total")}</p>
              <p className="font-heading text-[1.75rem] leading-9 font-extrabold text-forest tabular">{n(coverageSummary.total)}</p>
            </div>
            <div className="rounded-xl bg-muted px-5 py-4">
              <p className="text-small text-muted-foreground">{t("statistics.coverage.withSk")}</p>
              <p className="font-heading text-[1.75rem] leading-9 font-extrabold text-forest tabular">
                {n(coverageSummary.withSk)}
                <span className="ml-2 text-h3 font-normal text-muted-foreground">
                  {t("statistics.coverage.ofTotal", { total: n(coverageSummary.total) })}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-muted px-5 py-4">
              <p className="text-small text-muted-foreground">{t("statistics.coverage.area")}</p>
              <p className="font-heading text-[1.75rem] leading-9 font-extrabold text-forest tabular">
                {n(coverageSummary.area)} <span className="text-h3 font-normal text-muted-foreground">{t("common.hectare")}</span>
              </p>
            </div>
          </div>
          <div className="relative overflow-x-auto rounded-md border" role="region" aria-labelledby="cakupan-kabupaten" tabIndex={0}>
            {coverageProvince ? (
              <table className="w-full min-w-[640px] border-collapse text-small">
                <thead className="bg-muted text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2">{t("data.regency")}</th>
                    <th scope="col" className="px-3 py-2 text-right">{t("columns.records")}</th>
                    <th scope="col" className="px-3 py-2 text-right">{t("columns.area")}</th>
                    <th scope="col" className="px-3 py-2 text-right">{t("columns.members")}</th>
                    <th scope="col" className="px-3 py-2">{t("statistics.coverage.groups")}</th>
                  </tr>
                </thead>
                <tbody>
                  {coverageRegencies.map((r) => (
                    <tr key={r.code} className="border-b border-border align-top hover:bg-muted/40">
                      <th scope="row" className="px-3 py-2 text-left font-normal">{r.name}</th>
                      {r.stat ? (
                        <>
                          <td className="px-3 py-2 text-right tabular">{n(r.stat.records)}</td>
                          <td className="px-3 py-2 text-right tabular">{n(r.stat.area)}</td>
                          <td className="px-3 py-2 text-right tabular">{n(r.stat.members)}</td>
                          <td className="px-3 py-2">
                            <Link href={{ pathname: "/data", query: toSearchParams({ ...query, province: null, regency: r.code }) }} className="font-bold">
                              {t("statistics.coverage.seeGroups", { count: n(r.stat.records) })}
                              <span className="sr-only">, {r.name}</span>
                            </Link>
                          </td>
                        </>
                      ) : (
                        <td colSpan={4} className="px-3 py-2 text-muted-foreground italic">{t("statistics.coverage.none")}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-small">
                <thead className="bg-muted text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2">{t("map.province")}</th>
                    <th scope="col" className="px-3 py-2 text-right">{t("statistics.coverage.colTotal")}</th>
                    <th scope="col" className="px-3 py-2 text-right">{t("statistics.coverage.colWithSk")}</th>
                    <th scope="col" className="px-3 py-2 text-right">{t("columns.records")}</th>
                    <th scope="col" className="px-3 py-2 text-right">{t("columns.area")}</th>
                  </tr>
                </thead>
                <tbody>
                  {coverageProvinces.map((p) => (
                    <tr key={p.code} className="border-b border-border hover:bg-muted/40">
                      <th scope="row" className="px-3 py-2 text-left font-normal">
                        <Link href={{ pathname: "/statistics", query: toSearchParams({ ...query, province: p.code, regency: null }), hash: "cakupan-kabupaten" }}>
                          {p.name}
                        </Link>
                      </th>
                      <td className="px-3 py-2 text-right tabular">{n(p.total)}</td>
                      <td className="px-3 py-2 text-right tabular font-bold">{n(p.withSk)}</td>
                      <td className="px-3 py-2 text-right tabular">{n(p.sk)}</td>
                      <td className="px-3 py-2 text-right tabular">{n(p.area)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!coverageProvince && <p className="mt-3 text-small text-muted-foreground">{t("statistics.coverage.pickProvince")}</p>}
        </SectionCard>
      )}

      {records.length === 0 ? (
        <div className="mt-6">
          <DataNote title={t("data.noResultsTitle")}>
            <p>
              {t("data.noResults")} <Link href="/statistics">{t("data.reset")}</Link>
            </p>
          </DataNote>
        </div>
      ) : (
        <>
          <MetricChart
            id="grafik-jenis"
            title={t("statistics.chartJenis", { scope })}
            caption={caption}
            metrics={metrics}
            categoryHeader={t("statistics.jenis")}
            color="#c4052f"
            rows={jenisStats(records)
              .filter((j) => j.records > 0)
              .map((j) => toRow({ ...j, name: jenisLabel(j.code) }, dataHref({ type: j.code })))}
          />
          {!query.regency && (
            <MetricChart
              id="grafik-top10"
              title={t("statistics.chartTop10", { scope })}
              caption={caption}
              metrics={metrics}
              categoryHeader={t("data.regency")}
              color="#c4052f"
              topN={10}
              rows={regencies.map((r) =>
                toRow(
                  { ...r, name: level === "province" ? `${r.name} (${nameOf.get(r.code.slice(0, 2))})` : r.name },
                  dataHref({ regency: r.code }),
                ),
              )}
            />
          )}
          <MetricChart
            id="grafik-wilayah"
            title={t("statistics.chartRegion", { level: regionWord, scope })}
            caption={caption}
            metrics={metrics}
            categoryHeader={level === "province" ? t("map.province") : t("data.regency")}
            color="#c4052f"
            rows={regions.map((r) => toRow(r, dataHref(regionQuery(r.code))))}
          />
          <StackedChart
            id="grafik-komposisi"
            title={t("statistics.chartComposition", { level: regionWord, scope })}
            caption={caption}
            unit={t("common.records")}
            categoryHeader={level === "province" ? t("map.province") : t("data.regency")}
            parts={JENIS_ORDER.map((c) => ({ code: c, label: jenisLabel(c), color: JENIS_COLOR_HEX[c]! }))}
            rows={regions.map((r) => ({ label: r.name, href: dataHref(regionQuery(r.code)), values: r.byJenis }))}
          />
        </>
      )}

      <SectionCard id="rekap-nasional" title={t("statistics.tableCaption", { scope })} description={caption}>
        <div className="relative overflow-x-auto rounded-md border" role="region" aria-labelledby="rekap-nasional" tabIndex={0}>
        <table className="w-full min-w-[820px] border-collapse text-small">
          <thead className="bg-muted text-left">
            <tr>
              <th scope="col" className="px-3 py-2">{t("statistics.jenis")}</th>
              <th scope="col" className="px-3 py-2">{t("statistics.kind")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.records")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.area")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.members")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.male")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("columns.female")}</th>
            </tr>
          </thead>
          <tbody>
            {JENIS_ORDER.map((code) => (
              <Fragment key={code}>
                <tr className="border-b border-border hover:bg-muted/40">
                  <th scope="row" className="px-3 py-2 text-left font-bold">
                    <span className="flex items-center gap-2">
                      <SchemeSwatch code={code} />
                      {jenisLabel(code)}
                    </span>
                  </th>
                  <td className="px-3 py-2">{t(`kind.${code === "HA" ? "penetapan" : "persetujuan"}`)}</td>
                  {cells(byJenis.get(code)!, { type: code }, jenisLabel(code))}
                </tr>
                {code === "KK" &&
                  kkSub.map((sub) => (
                    <tr key={sub.code} className="border-b border-border bg-muted/50">
                      <th scope="row" className="py-2 pr-3 pl-8 text-left font-normal">
                        <span className="flex items-center gap-2">
                          <SchemeSwatch code={sub.code} />
                          <span>
                            <span className="sr-only">{t("statistics.detailOf")} </span>
                            {sub.name}
                          </span>
                        </span>
                      </th>
                      <td className="px-3 py-2">{t("kind.persetujuan")}</td>
                      {cells(bySub.get(sub.code)!, { type: sub.code }, sub.name)}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <th scope="row" colSpan={2} className="px-3 py-2 text-left">{t("statistics.total")}</th>
              {cells(total, {}, t("statistics.total"))}
            </tr>
          </tfoot>
        </table>
        </div>
      </SectionCard>
      <p className="mt-3 max-w-[72ch] text-small">
        {t("common.femaleZeroNote", { zero: n(total.members_female_zero_records), used: n(total.members_records_used) })}
      </p>

      {records.length > 0 && (
        <>
          <SectionCard id="rekap-wilayah" title={t("statistics.regionTableCaption", { level: regionWord, scope })} description={caption}>
            <div className="relative overflow-x-auto rounded-md border" role="region" aria-labelledby="rekap-wilayah" tabIndex={0}>
            <table className="w-full min-w-[900px] border-collapse text-small">
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">{level === "province" ? t("map.province") : t("data.regency")}</th>
                  {JENIS_ORDER.map((c) => (
                    <th key={c} scope="col" className="px-3 py-2 text-right">{jenisLabel(c)}</th>
                  ))}
                  {kkSub.map((s) => (
                    <th key={s.code} scope="col" className="px-3 py-2 text-right font-normal text-muted-foreground">
                      {s.name.replace("KEMITRAAN KEHUTANAN", "KK")}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-2 text-right">{t("statistics.total")}</th>
                </tr>
              </thead>
              <tbody>
                {[...regions]
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((r) => {
                    const inRegion = records.filter(regionKey(r.code));
                    return (
                      <tr key={r.code} className="border-b border-border hover:bg-muted/40">
                        <th scope="row" className="px-3 py-2 text-left font-normal">{r.name}</th>
                        {JENIS_ORDER.map((c) => (
                          <td key={c} className="px-3 py-2 text-right">
                            {countLink(r.byJenis[c] ?? 0, { ...regionQuery(r.code), type: c }, `${jenisLabel(c)}, ${r.name}`)}
                          </td>
                        ))}
                        {kkSub.map((s) => (
                          <td key={s.code} className="px-3 py-2 text-right text-muted-foreground">
                            {countLink(
                              inRegion.filter((x) => x.derived.scheme_code === s.code).length,
                              { ...regionQuery(r.code), type: s.code },
                              `${s.name}, ${r.name}`,
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-bold">{countLink(r.records, regionQuery(r.code), r.name)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            </div>
          </SectionCard>

          <SectionCard id="rekap-anggota" title={t("statistics.sexTableCaption", { level: regionWord, scope })} description={caption}>
          <p className="mb-4 max-w-[72ch] text-small text-muted-foreground">{t("statistics.sexTableNote")}</p>
            <div className="relative overflow-x-auto rounded-md border" role="region" aria-labelledby="rekap-anggota" tabIndex={0}>
            <table className="w-full min-w-[820px] border-collapse text-small">
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">{level === "province" ? t("map.province") : t("data.regency")}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t("columns.membersUsed")}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t("columns.members")}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t("columns.male")}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t("columns.female")}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t("columns.femaleZero")}</th>
                </tr>
              </thead>
              <tbody>
                {[...regions]
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((r) => {
                    const b = aggregate(records.filter(regionKey(r.code)));
                    return (
                      <tr key={r.code} className="border-b border-border hover:bg-muted/40">
                        <th scope="row" className="px-3 py-2 text-left font-normal">{r.name}</th>
                        <td className="px-3 py-2 text-right tabular">{n(b.members_records_used)}</td>
                        <td className="px-3 py-2 text-right tabular">{n(b.members_male_plus_female)}</td>
                        <td className="px-3 py-2 text-right tabular">{n(b.members_male)}</td>
                        <td className="px-3 py-2 text-right tabular">{n(b.members_female)}</td>
                        <td className="px-3 py-2 text-right tabular">{n(b.members_female_zero_records)}</td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <th scope="row" className="px-3 py-2 text-left">{t("statistics.total")}</th>
                  <td className="px-3 py-2 text-right tabular">{n(total.members_records_used)}</td>
                  <td className="px-3 py-2 text-right tabular">{n(total.members_male_plus_female)}</td>
                  <td className="px-3 py-2 text-right tabular">{n(total.members_male)}</td>
                  <td className="px-3 py-2 text-right tabular">{n(total.members_female)}</td>
                  <td className="px-3 py-2 text-right tabular">{n(total.members_female_zero_records)}</td>
                </tr>
              </tfoot>
            </table>
            </div>
          </SectionCard>
        </>
      )}
      <p className="mt-3 text-small">{t("statistics.linkHint")}</p>
      <p className="mt-1 text-small">
        {t("statistics.regencyHint")} <Link href="/download">{t("statistics.toDownload")}</Link>
      </p>
    </>
  );
}
