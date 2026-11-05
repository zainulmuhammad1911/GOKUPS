"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { BarChart } from "./BarChart";

export interface Metric {
  key: string;
  label: string;
  unit: string;
  digits?: number;
}

export interface MetricRow {
  label: string;
  href?: string;
  values: Record<string, number>;
}

function useFormat() {
  const locale = useLocale();
  return (v: number, digits = 0) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "id-ID", { maximumFractionDigits: digits }).format(v);
}

function Figure({
  id,
  title,
  caption,
  controls,
  children,
  table,
}: {
  id: string;
  title: string;
  caption: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
  table: React.ReactNode;
}) {
  const t = useTranslations("charts");
  return (
    <figure aria-labelledby={`${id}-title`} className="rule-top mt-12 pt-3">
      <h2 id={`${id}-title`} className="text-h2 font-bold">{title}</h2>
      <figcaption className="mt-1 text-caption text-ink-muted">{caption}</figcaption>
      {controls}
      <div className="mt-4">{children}</div>
      <details className="mt-3 text-small">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold text-forest">{t("showTable")}</summary>
        <div className="relative mt-2 max-h-[480px] overflow-auto" role="region" aria-label={title} tabIndex={0}>
          {table}
        </div>
      </details>
    </figure>
  );
}

/** Grafik batang satu seri dengan pilihan ukuran (rekaman, luas, anggota) dan tabel. */
export function MetricChart({
  id,
  title,
  caption,
  metrics,
  rows,
  rank = true,
  topN,
  color,
  categoryHeader,
}: {
  id: string;
  title: string;
  caption: string;
  metrics: Metric[];
  rows: MetricRow[];
  rank?: boolean;
  topN?: number;
  color: string;
  categoryHeader: string;
}) {
  const t = useTranslations("charts");
  const format = useFormat();
  const [metricKey, setMetricKey] = useState(metrics[0]!.key);
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0]!;

  const shown = useMemo(() => {
    const sorted = rank ? [...rows].sort((a, b) => (b.values[metric.key] ?? 0) - (a.values[metric.key] ?? 0)) : rows;
    return topN ? sorted.slice(0, topN) : sorted;
  }, [rows, metric.key, rank, topN]);
  const categories = useMemo(() => shown.map((r) => ({ label: r.label, href: r.href })), [shown]);
  const series = useMemo(
    () => [{ name: metric.label, color, values: shown.map((r) => r.values[metric.key] ?? 0) }],
    [shown, metric, color],
  );
  const top = shown[0];
  const ariaLabel = top
    ? t("ariaRanked", { title, metric: metric.label, top: top.label, value: `${format(top.values[metric.key] ?? 0, metric.digits)} ${metric.unit}` })
    : title;

  const controls =
    metrics.length > 1 ? (
      <div role="group" aria-label={t("measure")} className="mt-3 inline-flex flex-wrap gap-1 rounded-[var(--radius-panel)] border border-rule bg-surface-raised p-1">
        {metrics.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={m.key === metric.key}
            onClick={() => setMetricKey(m.key)}
            className={`min-h-11 rounded-[var(--radius-control)] px-3 text-small ${
              m.key === metric.key ? "bg-forest font-bold text-white" : "text-forest hover:bg-surface-sunken"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    ) : null;

  const table = (
    <table className="w-full border-collapse text-small">
      <thead className="sticky top-0 bg-surface-sunken text-left">
        <tr>
          <th scope="col" className="px-3 py-2">{categoryHeader}</th>
          {metrics.map((m) => (
            <th key={m.key} scope="col" className="px-3 py-2 text-right">{m.label} ({m.unit})</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {shown.map((r) => (
          <tr key={r.label} className="border-b border-rule">
            <th scope="row" className="px-3 py-2 text-left font-normal">
              {r.href ? <Link href={r.href}>{r.label}</Link> : r.label}
            </th>
            {metrics.map((m) => (
              <td key={m.key} className="px-3 py-2 text-right tabular">{format(r.values[m.key] ?? 0, m.digits)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <Figure id={id} title={title} caption={caption} controls={controls} table={table}>
      {shown.length === 0 ? (
        <p className="py-4 text-small text-ink-muted">{t("empty")}</p>
      ) : (
        <BarChart categories={categories} series={series} unit={metric.unit} ariaLabel={ariaLabel} maxFractionDigits={metric.digits} />
      )}
    </Figure>
  );
}

/** Grafik batang bertumpuk komposisi jenis PS per wilayah, dengan legenda HTML dan tabel. */
export function StackedChart({
  id,
  title,
  caption,
  parts,
  rows,
  unit,
  categoryHeader,
}: {
  id: string;
  title: string;
  caption: string;
  parts: { code: string; label: string; color: string }[];
  rows: MetricRow[];
  unit: string;
  categoryHeader: string;
}) {
  const t = useTranslations("charts");
  const format = useFormat();
  const sorted = useMemo(
    () => [...rows].sort((a, b) => sum(b) - sum(a)).filter((r) => sum(r) > 0),
    [rows],
  );
  function sum(r: MetricRow) {
    return parts.reduce((a, p) => a + (r.values[p.code] ?? 0), 0);
  }
  const visibleParts = useMemo(
    () => parts.filter((p) => sorted.some((r) => (r.values[p.code] ?? 0) > 0)),
    [parts, sorted],
  );
  const categories = useMemo(() => sorted.map((r) => ({ label: r.label, href: r.href })), [sorted]);
  const series = useMemo(
    () => visibleParts.map((p) => ({ name: p.label, color: p.color, values: sorted.map((r) => r.values[p.code] ?? 0) })),
    [sorted, visibleParts],
  );

  const legend = (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-small" aria-label={t("legend")}>
      {visibleParts.map((p) => (
        <li key={p.code} className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block size-3 rounded-[1px]" style={{ background: p.color }} />
          {p.label}
        </li>
      ))}
    </ul>
  );

  const table = (
    <table className="w-full border-collapse text-small">
      <thead className="sticky top-0 bg-surface-sunken text-left">
        <tr>
          <th scope="col" className="px-3 py-2">{categoryHeader}</th>
          {visibleParts.map((p) => (
            <th key={p.code} scope="col" className="px-3 py-2 text-right">{p.label}</th>
          ))}
          <th scope="col" className="px-3 py-2 text-right">{t("total")}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.label} className="border-b border-rule">
            <th scope="row" className="px-3 py-2 text-left font-normal">
              {r.href ? <Link href={r.href}>{r.label}</Link> : r.label}
            </th>
            {visibleParts.map((p) => (
              <td key={p.code} className="px-3 py-2 text-right tabular">{format(r.values[p.code] ?? 0)}</td>
            ))}
            <td className="px-3 py-2 text-right font-bold tabular">{format(sum(r))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <Figure id={id} title={title} caption={caption} controls={legend} table={table}>
      {sorted.length === 0 ? (
        <p className="py-4 text-small text-ink-muted">{t("empty")}</p>
      ) : (
        <BarChart
          categories={categories}
          series={series}
          unit={unit}
          stacked
          ariaLabel={t("ariaStacked", { title, count: sorted.length, top: sorted[0]!.label })}
        />
      )}
    </Figure>
  );
}
