"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export interface BarSeries {
  name: string;
  color: string;
  values: number[];
}

export interface BarChartProps {
  /** Kategori dari atas ke bawah (grafik batang horizontal). */
  categories: { label: string; href?: string }[];
  series: BarSeries[];
  unit: string;
  stacked?: boolean;
  /** Ringkasan untuk pembaca layar; tabel tetap tersedia di bawah grafik. */
  ariaLabel: string;
  maxFractionDigits?: number;
}

// Token DESIGN.md: teks tidak pernah memakai warna data (dataviz: text wears text tokens).
const INK = "#1f2420";
const INK_MUTED = "#575e58";
const RULE = "#dad5ca";
const SURFACE = "#faf8f3";
const ROW = 28;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/**
 * Grafik batang horizontal (dataviz: batang <= 24 px, ujung data membulat 4 px, celah 2 px
 * antar-segmen, grid samar, satu sumbu). Dimuat di klien setelah halaman tampil; ruangnya
 * dipesan lebih dulu agar tata letak tidak bergeser.
 */
export function BarChart({ categories, series, unit, stacked = false, ariaLabel, maxFractionDigits = 0 }: BarChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const locale = useLocale();
  const t = useTranslations("charts");
  const router = useRouter();
  const height = Math.max(120, categories.length * ROW + 48);

  useEffect(() => {
    let disposed = false;
    let chart: { dispose: () => void; resize: () => void } | null = null;
    let observer: ResizeObserver | null = null;
    const el = ref.current;
    if (!el) return;
    const fmt = new Intl.NumberFormat(locale === "en" ? "en-GB" : "id-ID", { maximumFractionDigits: maxFractionDigits });
    const fontFamily = getComputedStyle(document.body).fontFamily;

    import("./echarts-setup")
      .then(({ echarts }) => {
        if (disposed) return;
        const narrow = el.clientWidth < 520;
        const inst = echarts.init(el, null, { renderer: "svg" });
        chart = inst;
        const last = series.length - 1;
        inst.setOption({
          animation: false,
          textStyle: { fontFamily, color: INK },
          aria: { enabled: true, label: { description: ariaLabel } },
          grid: { left: 8, right: stacked ? 16 : 64, top: 8, bottom: 24, containLabel: true },
          xAxis: {
            type: "value",
            splitLine: { lineStyle: { color: RULE, width: 1, type: "solid" } },
            axisLabel: { color: INK_MUTED, fontSize: 13, formatter: (v: number) => fmt.format(v), hideOverlap: true },
          },
          yAxis: {
            type: "category",
            inverse: true,
            data: categories.map((c) => c.label),
            axisTick: { show: false },
            axisLine: { lineStyle: { color: RULE } },
            axisLabel: { color: INK, fontSize: 13, width: narrow ? 104 : 190, overflow: "break", lineHeight: 15, interval: 0 },
          },
          tooltip: {
            trigger: "item",
            confine: true,
            borderColor: RULE,
            textStyle: { color: INK, fontFamily },
            // Nilai lebih dulu, lalu label (dataviz: values lead). Teks di-escape.
            formatter: (p: { name: string; seriesName: string; value: number; color: string }) =>
              `<strong style="font-size:15px">${escapeHtml(fmt.format(p.value))} ${escapeHtml(unit)}</strong><br/>` +
              `<span style="display:inline-block;width:10px;height:2px;margin-right:6px;vertical-align:middle;background:${p.color}"></span>` +
              `${escapeHtml(p.name)}${series.length > 1 ? ` · ${escapeHtml(p.seriesName)}` : ""}`,
          },
          series: series.map((s, i) => ({
            type: "bar",
            name: s.name,
            stack: stacked ? "total" : undefined,
            data: s.values,
            barMaxWidth: 20,
            cursor: categories.some((c) => c.href) ? "pointer" : "default",
            itemStyle: {
              color: s.color,
              // Celah 2 px warna latar antar-segmen; ujung data membulat, pangkal persegi.
              borderColor: stacked ? SURFACE : undefined,
              borderWidth: stacked ? 1 : 0,
              borderRadius: !stacked || i === last ? [0, 4, 4, 0] : 0,
            },
            emphasis: { itemStyle: { opacity: 0.85 } },
            label: {
              show: !stacked && categories.length <= 12,
              position: "right",
              color: INK,
              fontSize: 13,
              formatter: (p: { value: number }) => fmt.format(p.value),
            },
          })),
        });
        inst.on("click", (p: { dataIndex?: number }) => {
          const href = p.dataIndex !== undefined ? categories[p.dataIndex]?.href : undefined;
          if (href) router.push(href);
        });
        observer = new ResizeObserver(() => inst.resize());
        observer.observe(el);
      })
      .catch(() => !disposed && setFailed(true));

    return () => {
      disposed = true;
      observer?.disconnect();
      chart?.dispose();
    };
  }, [categories, series, unit, stacked, ariaLabel, locale, maxFractionDigits, router]);

  if (failed) {
    return <p className="py-4 text-small text-ink-muted">{t("failed")}</p>;
  }
  return <div ref={ref} role="img" aria-label={ariaLabel} style={{ height }} className="w-full" />;
}
