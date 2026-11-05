import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DuplicateBadge, EmptyValue, PageHeading } from "@/components/data/blocks";
import { loadRelease } from "@/lib/data/release";
import { AREA_COLUMN } from "@/lib/data/aggregate";
import { displaySourceValue, formatNumber } from "@/lib/data/format";
import type { ApprovalRecord } from "@/lib/data/types";

const PAGE_SIZE = 25;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "data" });
  return { title: t("title") };
}

function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d{1,6}$/.test(value)) return 1;
  return Math.max(1, Number(value));
}

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
  const { approvals } = loadRelease();
  const page = parsePage((await searchParams).page);
  const pages = Math.ceil(approvals.length / PAGE_SIZE);
  const rows = approvals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const n = (v: number) => formatNumber(v, locale);
  const empty = t("common.emptyInSource");

  const cell = (r: ApprovalRecord, col: string) => {
    const v = displaySourceValue(r.source[col] ?? null, locale);
    return v === null ? <EmptyValue>{empty}</EmptyValue> : v;
  };

  return (
    <>
      <PageHeading title={t("data.title")} lead={t("data.lead", { count: n(approvals.length) })} />
      <p className="mb-6 text-small text-ink-muted">{t("data.noFilters")}</p>

      {rows.length === 0 ? (
        <p>
          {t("data.emptyPage")} <Link href="/data">{t("data.backToFirst")}</Link>
        </p>
      ) : (
        <>
          {/* Tabel untuk layar ≥ 1024 px; di bawahnya 7 kolom tidak muat tanpa geser horizontal */}
          <div className="hidden lg:block">
            <table className="w-full border-collapse text-small">
              <caption className="sr-only">{t("data.tableCaption", { page: n(page), pages: n(pages) })}</caption>
              <thead className="bg-surface-sunken text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">{t("data.sk")}</th>
                  <th scope="col" className="px-3 py-2">{t("data.name")}</th>
                  <th scope="col" className="px-3 py-2">{t("data.scheme")}</th>
                  <th scope="col" className="px-3 py-2">{t("data.province")}</th>
                  <th scope="col" className="px-3 py-2">{t("data.regency")}</th>
                  <th scope="col" className="px-3 py-2">{t("data.date")}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t("data.area")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-rule align-top">
                    <td className="px-3 py-2">
                      <Link href={`/data/${r.id}`} className="break-all">
                        {cell(r, "Nomor Surat Keputusan")}
                      </Link>
                      {r.quality.duplicate && <span className="ml-2"><DuplicateBadge label={t("data.duplicate")} /></span>}
                    </td>
                    <td className="px-3 py-2">{cell(r, "Nama Lembaga")}</td>
                    <td className="px-3 py-2">{cell(r, "Skema")}</td>
                    <td className="px-3 py-2">{cell(r, "Provinsi")}</td>
                    <td className="px-3 py-2">{cell(r, "Kabupaten Kota")}</td>
                    <td className="px-3 py-2 whitespace-nowrap tabular">{cell(r, "Tanggal Surat Keputusan")}</td>
                    <td className="px-3 py-2 text-right tabular">{cell(r, AREA_COLUMN)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Daftar ringkas untuk ponsel (PRD §6.4) */}
          <ul className="flex flex-col lg:hidden" aria-label={t("data.tableCaption", { page: n(page), pages: n(pages) })}>
            {rows.map((r) => (
              <li key={r.id} className="rule-top flex flex-col gap-1 py-3 text-small">
                <span className="flex flex-wrap items-center gap-2">
                  <Link href={`/data/${r.id}`} className="break-all font-bold">
                    {cell(r, "Nomor Surat Keputusan")}
                  </Link>
                  {r.quality.duplicate && <DuplicateBadge label={t("data.duplicate")} />}
                </span>
                <span>{cell(r, "Nama Lembaga")}</span>
                <span className="text-ink-muted">
                  {cell(r, "Skema")} · {cell(r, "Kabupaten Kota")}, {cell(r, "Provinsi")}
                </span>
                <span className="tabular text-ink-muted">
                  {cell(r, "Tanggal Surat Keputusan")} · {cell(r, AREA_COLUMN)} {t("common.hectare")}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <nav aria-label={t("data.pagination")} className="rule-top mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 text-small">
        {page > 1 ? (
          <Link href={{ pathname: "/data", query: { page: page - 1 } }} className="inline-flex min-h-11 items-center">
            {t("data.prev")}
          </Link>
        ) : <span />}
        <span aria-current="page" className="tabular">{t("data.page", { page: n(page), pages: n(pages) })}</span>
        {page < pages ? (
          <Link href={{ pathname: "/data", query: { page: page + 1 } }} className="inline-flex min-h-11 items-center">
            {t("data.next")}
          </Link>
        ) : <span />}
      </nav>
    </>
  );
}
