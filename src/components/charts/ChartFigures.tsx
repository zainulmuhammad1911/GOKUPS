"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { BarChart } from "./BarChart";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  legend,
  children,
  table,
}: {
  id: string;
  title: string;
  caption: string;
  controls?: React.ReactNode;
  legend?: React.ReactNode;
  children: React.ReactNode;
  table: React.ReactNode;
}) {
  const t = useTranslations("charts");
  return (
    <Card className="mt-6 gap-4">
      <figure aria-labelledby={`${id}-title`} aria-describedby={`${id}-caption`} className="contents">
        <CardHeader className="gap-1">
          <h2 id={`${id}-title`} className="text-h3 font-bold tracking-tight">{title}</h2>
          <CardDescription id={`${id}-caption`} className="text-caption">{caption}</CardDescription>
          {controls && <div className="mt-2">{controls}</div>}
        </CardHeader>
        <CardContent>
          {legend}
          {children}
        </CardContent>
        <CardFooter className="mt-auto block bg-transparent py-1">
          <Collapsible>
            <CollapsibleTrigger className="group/trigger inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-small font-bold text-primary">
              <ChevronDown aria-hidden="true" className="size-4 transition-transform group-data-[state=open]/trigger:rotate-180" />
              {t("showTable")}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="relative mb-3 max-h-[480px] overflow-auto rounded-md border bg-card" role="region" aria-label={title} tabIndex={0}>
                {table}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardFooter>
      </figure>
    </Card>
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
      <ToggleGroup
        type="single"
        variant="outline"
        size="lg"
        value={metric.key}
        onValueChange={(v) => v && setMetricKey(v)}
        aria-label={t("measure")}
        className="flex-wrap"
      >
        {metrics.map((m) => (
          <ToggleGroupItem
            key={m.key}
            value={m.key}
            className="px-3 text-small data-[state=on]:bg-primary data-[state=on]:font-bold data-[state=on]:text-primary-foreground"
          >
            {m.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    ) : null;

  const table = (
    <Table className="text-small">
      <TableHeader className="sticky top-0 bg-muted">
        <TableRow>
          <TableHead scope="col">{categoryHeader}</TableHead>
          {metrics.map((m) => (
            <TableHead key={m.key} scope="col" className="text-right">{m.label} ({m.unit})</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {shown.map((r) => (
          <TableRow key={r.label}>
            <TableHead scope="row" className="font-normal text-foreground">
              {r.href ? <Link href={r.href}>{r.label}</Link> : r.label}
            </TableHead>
            {metrics.map((m) => (
              <TableCell key={m.key} className="text-right tabular">{format(r.values[m.key] ?? 0, m.digits)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Figure id={id} title={title} caption={caption} controls={controls} table={table}>
      {shown.length === 0 ? (
        <p className="py-4 text-small text-muted-foreground">{t("empty")}</p>
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
    <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-small" aria-label={t("legend")}>
      {visibleParts.map((p) => (
        <li key={p.code} className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block size-3 rounded-[1px]" style={{ background: p.color }} />
          {p.label}
        </li>
      ))}
    </ul>
  );

  const table = (
    <Table className="text-small">
      <TableHeader className="sticky top-0 bg-muted">
        <TableRow>
          <TableHead scope="col">{categoryHeader}</TableHead>
          {visibleParts.map((p) => (
            <TableHead key={p.code} scope="col" className="text-right">{p.label}</TableHead>
          ))}
          <TableHead scope="col" className="text-right">{t("total")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.label}>
            <TableHead scope="row" className="font-normal text-foreground">
              {r.href ? <Link href={r.href}>{r.label}</Link> : r.label}
            </TableHead>
            {visibleParts.map((p) => (
              <TableCell key={p.code} className="text-right tabular">{format(r.values[p.code] ?? 0)}</TableCell>
            ))}
            <TableCell className="text-right font-bold tabular">{format(sum(r))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Figure id={id} title={title} caption={caption} legend={legend} table={table}>
      {sorted.length === 0 ? (
        <p className="py-4 text-small text-muted-foreground">{t("empty")}</p>
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
