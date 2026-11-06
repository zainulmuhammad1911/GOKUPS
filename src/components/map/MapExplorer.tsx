"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { FeatureCollection, Geometry } from "geojson";

/**
 * Nilai per wilayah per jenis PS: [rekaman, luas ha, anggota L+P, rekaman yang dihitung untuk anggota,
 * laki-laki, perempuan, rekaman dengan perempuan 0]. Laki-laki + perempuan = anggota L+P.
 */
export type Values = [number, number, number, number, number, number, number];
export interface RegionData {
  name: string;
  parent: string | null;
  byType: Record<string, Values>;
}
export type Indicator = "records" | "area" | "members";

export interface MapState {
  indicator: Indicator;
  type: string;
  province: string | null;
  regency: string | null;
}

interface Props {
  geoBase: string;
  attribution: string;
  regions: Record<string, RegionData>;
  types: { code: string; label: string; color: string }[];
  initial: MapState;
  dataPath: string;
  sourceLine: string;
}

// DESIGN.md §3.3–3.4: skala hijau 5 kelas, netral untuk "tidak ada rekaman", arsir untuk "tidak tersedia".
const RAMP = ["#8fbb76", "#68a058", "#458343", "#276633", "#104524"];
const NO_RECORDS = "#e2ded5";
const SEA = "#e6eceb";
const EDGE = "#faf8f3";
const INK = "#1f2420";
const EARTH = "#8a4b1e";
const IDX: Record<Indicator, number> = { records: 0, area: 1, members: 2 };

type Feature = { type: "Feature"; properties: Record<string, unknown>; geometry: Geometry };
type FC = FeatureCollection<Geometry, Record<string, unknown>>;

function valueOf(r: RegionData | undefined, type: string, ind: Indicator): number | null | undefined {
  const v = r?.byType[type];
  if (!v || v[0] === 0) return undefined; // tidak ada rekaman
  if (ind === "members" && v[3] === 0) return null; // ada rekaman, tetapi anggota tidak dapat dihitung
  return v[IDX[ind]];
}

/** Batas kelas kuantil dari nilai > 0 (maksimal 5 kelas). */
function quantileBreaks(values: number[]): number[] {
  const sorted = [...values].filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const k = Math.min(5, new Set(sorted).size);
  const breaks: number[] = [];
  for (let i = 1; i <= k; i++) breaks.push(sorted[Math.min(sorted.length - 1, Math.ceil((i / k) * sorted.length) - 1)]!);
  return [...new Set(breaks)];
}

function classOf(v: number, breaks: number[]): number {
  for (let i = 0; i < breaks.length; i++) if (v <= breaks[i]!) return i;
  return breaks.length - 1;
}

function bbox(fc: FC, filter?: (f: Feature) => boolean): [[number, number], [number, number]] | null {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as [number, number];
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  for (const f of fc.features as Feature[]) {
    if (filter && !filter(f)) continue;
    if ("coordinates" in f.geometry) walk(f.geometry.coordinates);
  }
  return minX <= maxX ? [[minX, minY], [maxX, maxY]] : null;
}

export function MapExplorer({ geoBase, attribution, regions, types, initial, dataPath, sourceLine }: Props) {
  const t = useTranslations("map");
  const tc = useTranslations("charts");
  const tcom = useTranslations("common");
  const locale = useLocale();
  const fmt = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-GB" : "id-ID", { maximumFractionDigits: 0 }), [locale]);
  const [state, setState] = useState<MapState>(initial);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const provGeo = useRef<FC | null>(null);
  const regGeo = useRef<Record<string, FC>>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  const level: "province" | "regency" = state.province ? "regency" : "province";
  const unit = state.indicator === "area" ? "ha" : state.indicator === "members" ? tc("people") : t("records");
  const indicatorLabel = { records: tc("records"), area: tc("area"), members: tc("members") }[state.indicator];
  const typeLabel = types.find((x) => x.code === state.type)?.label ?? t("allTypes");

  // Wilayah pada tingkat yang sedang tampil.
  const levelCodes = useMemo(
    () =>
      Object.keys(regions).filter((c) =>
        level === "province" ? regions[c]!.parent === null : regions[c]!.parent === state.province,
      ),
    [regions, level, state.province],
  );
  const breaks = useMemo(
    () => quantileBreaks(levelCodes.map((c) => valueOf(regions[c], state.type, state.indicator)).filter((v): v is number => typeof v === "number")),
    [levelCodes, regions, state.type, state.indicator],
  );
  const hasInvalid = levelCodes.some((c) => valueOf(regions[c], state.type, state.indicator) === null);

  // Simpan state di URL tanpa memuat ulang halaman (tautan bisa dibagikan).
  useEffect(() => {
    const p = new URLSearchParams();
    if (state.indicator !== "records") p.set("indicator", state.indicator);
    if (state.type !== "all") p.set("type", state.type);
    if (state.province) p.set("province", state.province);
    if (state.regency) p.set("regency", state.regency);
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [state]);

  const paint = useCallback(() => {
    const map = mapRef.current;
    if (!map || !provGeo.current) return;
    const s = stateRef.current;
    const decorate = (fc: FC, codes: string[]): FC => {
      const vals = codes.map((c) => valueOf(regions[c], s.type, s.indicator)).filter((v): v is number => typeof v === "number");
      const br = quantileBreaks(vals);
      return {
        ...fc,
        features: fc.features.map((f) => {
          const code = String(f.properties?.code);
          const v = valueOf(regions[code], s.type, s.indicator);
          const cls = v === undefined ? -1 : v === null ? -2 : classOf(v, br);
          return { ...f, properties: { ...f.properties, cls, selected: code === s.province || code === s.regency } };
        }),
      };
    };
    const provCodes = Object.keys(regions).filter((c) => regions[c]!.parent === null);
    (map.getSource("prov") as import("maplibre-gl").GeoJSONSource | undefined)?.setData(decorate(provGeo.current, provCodes));
    const reg = s.province ? regGeo.current[s.province] : null;
    const regSrc = map.getSource("reg") as import("maplibre-gl").GeoJSONSource | undefined;
    if (reg && regSrc) {
      const codes = Object.keys(regions).filter((c) => regions[c]!.parent === s.province);
      regSrc.setData(decorate(reg, codes));
    } else regSrc?.setData({ type: "FeatureCollection", features: [] });
    // Saat drill-down, provinsi lain tetap terlihat samar sebagai konteks.
    map.setPaintProperty("prov-fill", "fill-opacity", s.province ? 0.3 : 1);
    map.setLayoutProperty("prov-hatch", "visibility", s.province ? "none" : "visible");
  }, [regions]);

  // Inisialisasi peta sekali.
  useEffect(() => {
    let disposed = false;
    const el = container.current;
    if (!el) return;
    (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        maplibre.setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${process.env.NEXT_PUBLIC_MAPLIBRE_VERSION}`);
        const prov = (await (await fetch(`${geoBase}/provinces.geojson`)).json()) as FC;
        if (disposed) return;
        provGeo.current = prov;
        const map = new maplibre.Map({
          container: el,
          style: { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": SEA } }] },
          bounds: bbox(prov) ?? [[95, -11], [141, 6]],
          fitBoundsOptions: { padding: 16 },
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          renderWorldCopies: false,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;
        map.on("error", () => undefined);
        map.on("load", () => {
          // Pola arsir untuk "data belum dapat ditampilkan" (DESIGN.md §3.4).
          const size = 8;
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#f1eee6";
          ctx.fillRect(0, 0, size, size);
          ctx.strokeStyle = "#8c8f87";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, size);
          ctx.lineTo(size, 0);
          ctx.stroke();
          map.addImage("hatch", ctx.getImageData(0, 0, size, size));

          const fill = ["match", ["get", "cls"], -1, NO_RECORDS, 0, RAMP[0], 1, RAMP[1], 2, RAMP[2], 3, RAMP[3], 4, RAMP[4], NO_RECORDS] as unknown as string;
          for (const [id, src] of [["prov", "prov"], ["reg", "reg"]] as const) {
            map.addSource(src, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addLayer({ id: `${id}-fill`, type: "fill", source: src, paint: { "fill-color": fill } });
            map.addLayer({ id: `${id}-hatch`, type: "fill", source: src, filter: ["==", ["get", "cls"], -2], paint: { "fill-pattern": "hatch" } });
            map.addLayer({ id: `${id}-line`, type: "line", source: src, paint: { "line-color": EDGE, "line-width": id === "prov" ? 0.75 : 0.5 } });
          }
          // Garis provinsi tetap tampil saat drill-down sebagai konteks.
          map.addLayer({ id: "prov-outline", type: "line", source: "prov", paint: { "line-color": "#8c8f87", "line-width": 0.6 } });
          map.addLayer({
            id: "selected", type: "line", source: "prov",
            filter: ["==", ["get", "selected"], true], paint: { "line-color": INK, "line-width": 2.5 },
          });
          map.addLayer({
            id: "reg-selected", type: "line", source: "reg",
            filter: ["==", ["get", "selected"], true], paint: { "line-color": INK, "line-width": 2.5 },
          });
          paint();
          setReady(true);

          for (const layer of ["prov-fill", "reg-fill"]) {
            map.on("mousemove", layer, (e: import("maplibre-gl").MapLayerMouseEvent) => {
              const code = e.features?.[0]?.properties?.code as string | undefined;
              map.getCanvas().style.cursor = code ? "pointer" : "";
              setHover(code ? { code, x: e.point.x, y: e.point.y } : null);
            });
            map.on("mouseleave", layer, () => {
              map.getCanvas().style.cursor = "";
              setHover(null);
            });
          }
          map.on("click", "prov-fill", (e: import("maplibre-gl").MapLayerMouseEvent) => {
            const code = e.features?.[0]?.properties?.code as string | undefined;
            // Saat drill-down, klik provinsi lain berpindah ke provinsi tersebut.
            const onRegency = map.queryRenderedFeatures(e.point, { layers: ["reg-fill"] }).length > 0;
            if (code && !onRegency && code !== stateRef.current.province) setState((s) => ({ ...s, province: code, regency: null }));
          });
          map.on("click", "reg-fill", (e: import("maplibre-gl").MapLayerMouseEvent) => {
            const code = e.features?.[0]?.properties?.code as string | undefined;
            if (code) setState((s) => ({ ...s, regency: code }));
          });
        });
      } catch {
        if (!disposed) setFailed(true);
      }
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [geoBase, paint]);

  // Muat batas kabupaten/kota saat provinsi dipilih, lalu arahkan kamera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const province = state.province;
    (async () => {
      if (province && !regGeo.current[province]) {
        try {
          regGeo.current[province] = (await (await fetch(`${geoBase}/regencies/${province}.geojson`)).json()) as FC;
        } catch {
          setFailed(true);
          return;
        }
      }
      paint();
      const target = province
        ? bbox(provGeo.current!, (f) => f.properties.code === province)
        : bbox(provGeo.current!);
      if (target) map.fitBounds(target, { padding: 24, duration: 600 });
    })();
  }, [state.province, ready, geoBase, paint]);

  useEffect(() => {
    if (ready) paint();
  }, [state.indicator, state.type, state.regency, ready, paint]);

  const focusCode = state.regency ?? state.province;
  const focus = focusCode ? regions[focusCode] : undefined;
  const panelValues = focus?.byType[state.type];
  const national = useMemo(() => {
    const sum: Values = [0, 0, 0, 0, 0, 0, 0];
    for (const c of Object.keys(regions)) {
      if (regions[c]!.parent !== null) continue;
      const v = regions[c]!.byType[state.type];
      if (v) for (let i = 0; i < sum.length; i++) sum[i]! += v[i]!;
    }
    return sum;
  }, [regions, state.type]);
  const shown = panelValues ?? (focus ? undefined : national);
  const dataQuery = (code: string | null) => {
    const q = new URLSearchParams();
    if (code) q.set(code.includes(".") ? "regency" : "province", code);
    if (state.type !== "all") q.set("type", state.type);
    const s = q.toString();
    return `${dataPath}${s ? `?${s}` : ""}`;
  };

  const tableRows = levelCodes
    .map((c) => ({ code: c, name: regions[c]!.name, v: valueOf(regions[c], state.type, state.indicator), r: regions[c]!.byType[state.type] }))
    .sort((a, b) => (typeof b.v === "number" ? b.v : -1) - (typeof a.v === "number" ? a.v : -1));

  const legend = breaks.map((b, i) => ({
    color: RAMP[Math.min(i, RAMP.length - 1)]!,
    label: t("range", { from: fmt.format(i === 0 ? Math.min(...tableRows.map((r) => (typeof r.v === "number" && r.v > 0 ? r.v : Infinity))) : breaks[i - 1]! + (state.indicator === "area" ? 0 : 1)), to: fmt.format(b) }),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div data-slot="card" className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5 text-small">
          <span id="peta-ukuran" className="font-bold">{tc("measure")}</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="lg"
            value={state.indicator}
            onValueChange={(v) => v && setState((s) => ({ ...s, indicator: v as Indicator }))}
            aria-labelledby="peta-ukuran"
            className="flex-wrap"
          >
            {(["records", "area", "members"] as const).map((k) => (
              <ToggleGroupItem
                key={k}
                value={k}
                className="h-10 px-3 text-small data-[state=on]:bg-primary data-[state=on]:font-bold data-[state=on]:text-primary-foreground"
              >
                {{ records: tc("records"), area: tc("area"), members: tc("members") }[k]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-1.5 text-small sm:w-auto">
          <Label htmlFor="peta-jenis" className="font-bold">{t("typeFilter")}</Label>
          <NativeSelect
            size="lg"
            id="peta-jenis"
            value={state.type}
            onChange={(e) => setState((s) => ({ ...s, type: e.target.value }))}
            className="w-full min-w-0 sm:w-72"
          >
            <option value="all">{t("allTypes")}</option>
            {types.map((x) => (
              <option key={x.code} value={x.code}>{x.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-1.5 text-small sm:w-auto">
          <Label htmlFor="peta-wilayah" className="font-bold">{t("provinceSelect")}</Label>
          <NativeSelect
            size="lg"
            id="peta-wilayah"
            value={state.province ?? ""}
            onChange={(e) => setState((s) => ({ ...s, province: e.target.value || null, regency: null }))}
            className="w-full min-w-0 sm:w-64"
          >
            <option value="">{t("indonesia")}</option>
            {Object.keys(regions)
              .filter((c) => regions[c]!.parent === null)
              .sort((a, b) => a.localeCompare(b))
              .map((c) => (
                <option key={c} value={c}>{regions[c]!.name}</option>
              ))}
          </NativeSelect>
        </div>
      </div>

      <nav aria-label={t("breadcrumb")} className="flex min-h-10 flex-wrap items-center gap-2 border-t pt-3 text-small">
        {state.province ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="-ml-2 h-10 px-2 text-small font-bold text-primary"
            onClick={() => setState((s) => ({ ...s, province: null, regency: null }))}
          >
            <ChevronLeft aria-hidden="true" />
            {t("backToIndonesia")}
          </Button>
        ) : (
          <span className="font-bold">{t("indonesia")}</span>
        )}
        {state.province && (
          <>
            <span aria-hidden="true" className="text-muted-foreground">›</span>
            <span className="font-bold">{regions[state.province]?.name}</span>
          </>
        )}
      </nav>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div data-slot="card" className="relative flex min-w-0 flex-col gap-3 rounded-xl bg-card p-2 ring-1 ring-border">
          {failed ? (
            <div className="flex h-[60vh] min-h-[320px] items-center justify-center rounded-lg bg-muted p-6 text-center text-small">
              {t("failed")}
            </div>
          ) : (
            <div
              ref={container}
              role="region"
              aria-label={t("mapLabel", { indicator: indicatorLabel, type: typeLabel })}
              className="h-[60vh] min-h-[320px] w-full overflow-hidden rounded-lg"
            />
          )}
          {hover && regions[hover.code] && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2 py-1 text-small text-popover-foreground shadow-md"
              style={{ left: Math.min(hover.x + 12, 9999), top: hover.y + 12 }}
            >
              <strong className="block">
                {(() => {
                  const v = valueOf(regions[hover.code], state.type, state.indicator);
                  return v === undefined ? t("noRecords") : v === null ? t("notAvailable") : `${fmt.format(v)} ${unit}`;
                })()}
              </strong>
              {regions[hover.code]!.name}
            </div>
          )}
          <div className="flex flex-col gap-2 px-2 pb-2 text-small" aria-label={t("legend")} role="group">
            <p className="font-bold">
              {indicatorLabel} ({unit}), {typeLabel}
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {legend.map((l) => (
                <li key={l.label} className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block h-3 w-5 rounded-[1px]" style={{ background: l.color }} />
                  <span className="tabular">{l.label}</span>
                </li>
              ))}
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-3 w-5 rounded-[1px] border border-border" style={{ background: NO_RECORDS }} />
                {t("noRecords")}
              </li>
              {hasInvalid && (
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block h-3 w-5 rounded-[1px]" style={{ background: "repeating-linear-gradient(135deg,#f1eee6 0 3px,#8c8f87 3px 4px)" }} />
                  {t("notAvailable")}
                </li>
              )}
            </ul>
            <p className="text-caption text-muted-foreground">{t("aggregateNote")} {attribution}</p>
            <p className="text-caption text-muted-foreground">{sourceLine}</p>
          </div>
        </div>

        <aside aria-live="polite" className="self-start rounded-xl bg-card p-5 text-small ring-1 ring-border">
          <h2 className="text-h3 font-bold">{focus?.name ?? t("indonesia")}</h2>
          <p className="text-muted-foreground">{typeLabel}</p>
          {!shown || shown[0] === 0 ? (
            <p className="mt-3">{t("panelEmpty")}</p>
          ) : (
            <>
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                <dt>{tc("records")}</dt>
                <dd className="text-right font-bold tabular">{fmt.format(shown[0])}</dd>
                <dt>{tc("area")}</dt>
                <dd className="text-right font-bold tabular">{fmt.format(shown[1])} ha</dd>
                <dt>{tc("members")}</dt>
                <dd className="text-right font-bold tabular">{fmt.format(shown[2])}</dd>
                <dt className="pl-3 text-muted-foreground">{tcom("male")}</dt>
                <dd className="text-right tabular">{fmt.format(shown[4])}</dd>
                <dt className="pl-3 text-muted-foreground">{tcom("female")}</dt>
                <dd className="text-right tabular">{fmt.format(shown[5])}</dd>
              </dl>
              <p className="mt-1 text-caption text-muted-foreground">
                {t("membersCoverage", { used: fmt.format(shown[3]), total: fmt.format(shown[0]) })}{" "}
                {t("femaleZero", { zero: shown[6], zeroText: fmt.format(shown[6]) })}
              </p>
              {state.type === "all" && focus && (
                <ul className="mt-3 flex flex-col gap-1" aria-label={t("composition")}>
                  {types.map((x) => {
                    const v = focus.byType[x.code];
                    if (!v) return null;
                    return (
                      <li key={x.code} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true" className="inline-block size-3 rounded-[1px]" style={{ background: x.color }} />
                          {x.label}
                        </span>
                        <span className="tabular">{fmt.format(v[0])}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button asChild size="lg" className="mt-4 h-10 w-full px-3 text-small">
                <Link href={dataQuery(focusCode)}>
                  {t("seeRecords", { count: fmt.format(shown[0]) })}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}
          <p className="mt-3 text-caption text-muted-foreground">{t("processedNote")}</p>
        </aside>
      </div>

      <section aria-labelledby="tabel-peta" className="mt-2 rounded-xl bg-card p-5 ring-1 ring-border">
        <h2 id="tabel-peta" className="text-h3 font-bold">
          {t("tableTitle", { level: level === "province" ? t("provinces") : t("regenciesOf", { name: regions[state.province!]?.name ?? "" }) })}
        </h2>
        <p className="mt-1 text-caption text-muted-foreground">{t("tableNote")}</p>
        <div className="relative mt-3 max-h-[520px] overflow-auto rounded-md border" role="region" aria-labelledby="tabel-peta" tabIndex={0}>
          <table className="w-full border-collapse text-small">
            <thead className="sticky top-0 bg-muted text-left">
              <tr>
                <th scope="col" className="px-3 py-2">{level === "province" ? t("province") : t("regency")}</th>
                <th scope="col" className="px-3 py-2 text-right">{tc("records")}</th>
                <th scope="col" className="px-3 py-2 text-right">{tc("area")} (ha)</th>
                <th scope="col" className="px-3 py-2 text-right">{tc("members")}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.code} className={`border-b hover:bg-muted/40 ${row.code === focusCode ? "bg-accent" : ""}`}>
                  <th scope="row" className="px-3 py-1 text-left font-normal">
                    <button
                      type="button"
                      className="min-h-10 text-left text-primary underline underline-offset-[0.18em]"
                      onClick={() =>
                        setState((s) => (level === "province" ? { ...s, province: row.code, regency: null } : { ...s, regency: row.code }))
                      }
                    >
                      {row.name}
                    </button>
                  </th>
                  {row.r && row.r[0] > 0 ? (
                    <>
                      <td className="px-3 py-1 text-right tabular">
                        <Link href={dataQuery(row.code)}>
                          {fmt.format(row.r[0])}
                          <span className="sr-only"> {t("recordsIn", { name: row.name })}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-1 text-right tabular">{fmt.format(row.r[1])}</td>
                      <td className="px-3 py-1 text-right tabular">{row.r[3] > 0 ? fmt.format(row.r[2]) : t("notAvailable")}</td>
                    </>
                  ) : (
                    <td colSpan={3} className="px-3 py-1 text-right text-muted-foreground">{t("noRecords")}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
