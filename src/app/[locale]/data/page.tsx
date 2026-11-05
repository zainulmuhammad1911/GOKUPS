import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import { DataFilters } from "@/components/data/DataFilters";
import { BreakableText, DataNote, DuplicateBadge, EmptyValue, PageHeading } from "@/components/data/blocks";
import { loadExportSchema, loadRelease } from "@/lib/data/release";
import { aggregate, AREA_COLUMN } from "@/lib/data/aggregate";
import { displaySourceValue, formatNumber } from "@/lib/data/format";
import {
  activeFilterCount,
  applyQuery,
  JENIS_CODES,
  KK_SUB_CODES,
  paginate,
  parseQuery,
  queryContext,
  type DataQuery,
  type SortKey,
  toSearchParams,
} from "@/lib/data/query";
import type { ApprovalRecord } from "@/lib/data/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "data" });
  return { title: t("title") };
}

const COLUMNS: { key: SortKey; source: string; className?: string }[] = [
  { key: "sk", source: "Nomor Surat Keputusan" },
  { key: "name", source: "Nama Lembaga" },
  { key: "type", source: "Skema" },
  { key: "province", source: "Provinsi" },
  { key: "regency", source: "Kabupaten Kota" },
  { key: "date", source: "Tanggal Surat Keputusan", className: "whitespace-nowrap tabular" },
  { key: "area", source: AREA_COLUMN, className: "text-right tabular" },
];

export default async function DataPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { approvals, adminAreas, schemes } = loadRelease();
  const schema = loadExportSchema();
  const ctx = queryContext(adminAreas, approvals, Object.keys(schema.flag_docs));
  const { query, ignored } = parseQuery(await searchParams, ctx);
  const filtered = applyQuery(approvals, query);
  const { rows, page, pages } = paginate(filtered, query.page);
  const summary = aggregate(filtered);
  const n = (v: number) => formatNumber(v, locale);
  const empty = t("common.emptyInSource");
  const active = activeFilterCount(query);

  const provinces = adminAreas.filter((a) => a.level === "province").map((a) => ({ code: a.code, name: a.name }));
  const regencies = adminAreas.filter((a) => a.level === "regency").map((a) => ({ code: a.code, name: a.name, parent: a.parent_code }));
  const nameOf = new Map(adminAreas.map((a) => [a.code, a.name]));
  const jenisLabel = (code: string) => schemes.find((s) => s.jenis_ps_code === code)?.jenis_ps_label_id ?? code;
  const types = JENIS_CODES.map((c) => ({ code: c, name: jenisLabel(c) }));
  const kkSubtypes = KK_SUB_CODES.map((c) => ({ code: c, name: schemes.find((s) => s.scheme_code === c)?.scheme_original ?? c }));
  const typeLabel = (code: string) => (code.startsWith("KK_") ? kkSubtypes.find((k) => k.code === code)?.name : jenisLabel(code)) ?? code;
  const flagCounts = new Map<string, number>();
  for (const r of approvals) for (const f of r.quality.flags) flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1);
  const flags = Object.keys(schema.flag_docs)
    .filter((f) => flagCounts.has(f))
    .map((f) => ({ code: f, name: `${t(`flagLabel.${f}`)} (${n(flagCounts.get(f) ?? 0)})` }));
  const years: number[] = [];
  for (let y = ctx.years.min; y <= ctx.years.max; y++) years.push(y);

  const dataPath = getPathname({ href: "/data", locale });
  const qs = (overrides: Partial<DataQuery> = {}) => toSearchParams(query, overrides);
  const exportHref = (format: "csv" | "xlsx") =>
    `/unduh-hasil?${new URLSearchParams({ ...toSearchParams(query, { page: 1 }), format }).toString()}`;

  const activeLabels = [
    query.q && `${t("data.search")}: “${query.q}”`,
    query.province && `${t("data.province")}: ${nameOf.get(query.province)}`,
    query.regency && `${t("data.regency")}: ${nameOf.get(query.regency)}`,
    query.type && `${t("data.type")}: ${typeLabel(query.type)}`,
    (query.yearFrom !== null || query.yearTo !== null) &&
      `${t("data.year")}: ${t("data.yearRange", { from: query.yearFrom ?? ctx.years.min, to: query.yearTo ?? ctx.years.max })}`,
    query.flag && `${t("data.flag")}: ${t(`flagLabel.${query.flag}`)}`,
  ].filter(Boolean) as string[];

  const cell = (r: ApprovalRecord, col: string) => {
    const v = displaySourceValue(r.source[col] ?? null, locale);
    if (v === null) return <EmptyValue>{empty}</EmptyValue>;
    return col === "Nomor Surat Keputusan" ? <BreakableText text={v} /> : v;
  };

  const sortLink = (key: SortKey) => {
    const isCurrent = query.sort === key;
    const nextDir = isCurrent && query.dir === "asc" ? "desc" : "asc";
    return { pathname: "/data" as const, query: qs({ sort: key, dir: nextDir, page: 1 }) };
  };

  return (
    <>
      <PageHeading title={t("data.title")} lead={t("data.lead", { count: n(approvals.length) })} />

      <DataFilters
        action={dataPath}
        resetHref={dataPath}
        values={{ ...query }}
        provinces={provinces}
        regencies={regencies}
        types={types}
        kkSubtypes={kkSubtypes}
        flags={flags}
        years={years}
        activeCount={active}
      />

      {ignored.length > 0 && (
        <div className="mt-4">
          <DataNote>{t("data.ignored", { names: ignored.join(", ") })}</DataNote>
        </div>
      )}

      <section aria-labelledby="hasil" className="mt-8">
        <h2 id="hasil" className="text-h3 font-bold" aria-live="polite">
          {active > 0 ? t("data.results", { count: n(filtered.length), total: n(approvals.length) }) : t("data.resultsAll", { count: n(filtered.length) })}
        </h2>
        {activeLabels.length > 0 && (
          <p className="mt-1 text-small">
            <span className="text-ink-muted">{t("data.activeFilters")} </span>
            {activeLabels.join(" · ")}{" "}
            <Link href="/data">{t("data.reset")}</Link>
          </p>
        )}
        {filtered.length > 0 && (
          <p className="mt-2 text-small text-ink">
            {t("data.summary", {
              area: n(summary.area_ha),
              members: n(summary.members_male_plus_female),
              membersUsed: n(summary.members_records_used),
            })}{" "}
            <span className="text-ink-muted">{t("common.processed")}</span>
          </p>
        )}
        {filtered.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-small">
            <a href={exportHref("xlsx")} download className="inline-flex min-h-11 items-center font-bold">
              {t("data.exportXlsx", { count: n(filtered.length) })}
            </a>
            <a href={exportHref("csv")} download className="inline-flex min-h-11 items-center font-bold">
              {t("data.exportCsv", { count: n(filtered.length) })}
            </a>
          </p>
        )}
      </section>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <DataNote title={t("data.noResultsTitle")}>
            <p>
              {t("data.noResults")} <Link href="/data">{t("data.reset")}</Link>
            </p>
          </DataNote>
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6">
          {t("data.emptyPage")} <Link href={{ pathname: "/data", query: qs({ page: 1 }) }}>{t("data.backToFirst")}</Link>
        </p>
      ) : (
        <>
          {/* Tabel untuk layar ≥ 1024 px; di bawahnya 7 kolom tidak muat tanpa geser horizontal */}
          <div className="mt-4 hidden lg:block">
            <table className="w-full border-collapse text-small">
              <caption className="sr-only">{t("data.tableCaption", { page: n(page), pages: n(pages) })}</caption>
              <thead className="bg-surface-sunken text-left">
                <tr>
                  {COLUMNS.map((c) => {
                    const isCurrent = query.sort === c.key;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        aria-sort={isCurrent ? (query.dir === "asc" ? "ascending" : "descending") : undefined}
                        className={`px-3 py-1 ${c.key === "area" ? "text-right" : ""}`}
                      >
                        <Link href={sortLink(c.key)} className="inline-flex min-h-11 items-center gap-1 text-ink no-underline hover:underline">
                          {t(`data.sortLabel.${c.key}`)}
                          <span aria-hidden="true" className="text-ink-muted">
                            {isCurrent ? (query.dir === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                          <span className="sr-only">
                            {isCurrent && query.dir === "asc" ? t("data.sortDescAction") : t("data.sortAscAction")}
                          </span>
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-rule align-top">
                    <td className="px-3 py-2">
                      <Link href={`/data/${r.id}`} className="whitespace-pre-wrap [overflow-wrap:anywhere]">{cell(r, "Nomor Surat Keputusan")}</Link>
                      {r.quality.duplicate && <span className="ml-2"><DuplicateBadge label={t("data.duplicate")} /></span>}
                    </td>
                    {COLUMNS.slice(1).map((c) => (
                      <td key={c.key} className={`px-3 py-2 whitespace-pre-wrap ${c.className ?? ""}`}>{cell(r, c.source)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Daftar ringkas untuk ponsel dan tablet (PRD §6.4) */}
          <ul className="mt-4 flex flex-col lg:hidden" aria-label={t("data.tableCaption", { page: n(page), pages: n(pages) })}>
            {rows.map((r) => (
              <li key={r.id} className="rule-top flex flex-col gap-1 py-3 text-small">
                <span className="flex flex-wrap items-center gap-2">
                  <Link href={`/data/${r.id}`} className="font-bold whitespace-pre-wrap [overflow-wrap:anywhere]">{cell(r, "Nomor Surat Keputusan")}</Link>
                  {r.quality.duplicate && <DuplicateBadge label={t("data.duplicate")} />}
                </span>
                <span className="whitespace-pre-wrap">{cell(r, "Nama Lembaga")}</span>
                <span className="text-ink-muted">
                  {cell(r, "Skema")} · {cell(r, "Kabupaten Kota")}, {cell(r, "Provinsi")}
                </span>
                <span className="tabular text-ink-muted">
                  {cell(r, "Tanggal Surat Keputusan")} · {cell(r, AREA_COLUMN)} {t("common.hectare")}
                </span>
              </li>
            ))}
          </ul>

          <nav aria-label={t("data.pagination")} className="rule-top mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 text-small">
            {page > 1 ? (
              <Link href={{ pathname: "/data", query: qs({ page: page - 1 }) }} className="inline-flex min-h-11 items-center">
                {t("data.prev")}
              </Link>
            ) : <span />}
            <span className="tabular">{t("data.page", { page: n(page), pages: n(pages) })}</span>
            {page < pages ? (
              <Link href={{ pathname: "/data", query: qs({ page: page + 1 }) }} className="inline-flex min-h-11 items-center">
                {t("data.next")}
              </Link>
            ) : <span />}
          </nav>
        </>
      )}
    </>
  );
}
