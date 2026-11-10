import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { geoIdentity, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";

/**
 * Peta mini Beranda (PRD §6.1): SVG statis yang dirender di server dari batas provinsi
 * yang sangat disederhanakan. Tidak memuat MapLibre, jadi Beranda tetap ringan.
 * Warna memakai skala yang sama dengan peta interaktif (DESIGN.md §3.3).
 */
const RAMP = ["#8fbb76", "#68a058", "#458343", "#276633", "#104524"];
const NO_RECORDS = "#dde3dd";
const W = 640;
const H = 250;

export function MiniMap({
  values,
  label,
  legendLabels,
  noRecordsLabel,
}: {
  values: Record<string, number>;
  label: string;
  legendLabels: (from: number, to: number) => string;
  noRecordsLabel: string;
}) {
  const root = path.join(process.cwd(), "public", "geo");
  const { version } = JSON.parse(readFileSync(path.join(root, "current.json"), "utf-8")) as { version: string };
  const fc = JSON.parse(readFileSync(path.join(root, version, "provinces-mini.geojson"), "utf-8")) as FeatureCollection<
    Geometry,
    { code: string; name: string }
  >;
  // Proyeksi planar: d3-geo menafsirkan cincin poligon secara sferis (urutan putar terbalik dari
  // GeoJSON RFC 7946), sehingga proyeksi sferis menggambar "seluruh bola kecuali provinsi".
  // Di sekitar khatulistiwa, bentuk planar hampir sama dengan Mercator.
  const projection = geoIdentity().reflectY(true).fitSize([W, H], fc);
  const pathGen = geoPath(projection);

  const sorted = Object.values(values).filter((v) => v > 0).sort((a, b) => a - b);
  const k = Math.min(5, new Set(sorted).size);
  const breaks = [...new Set(Array.from({ length: k }, (_, i) => sorted[Math.min(sorted.length - 1, Math.ceil(((i + 1) / k) * sorted.length) - 1)]!))];
  const color = (v: number | undefined) => {
    if (!v) return NO_RECORDS;
    const i = breaks.findIndex((b) => v <= b);
    return RAMP[i === -1 ? breaks.length - 1 : i]!;
  };

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full">
        <rect width={W} height={H} fill="#e6eceb" rx={4} />
        {fc.features.map((f) => (
          <path key={f.properties.code} d={pathGen(f) ?? ""} fill={color(values[f.properties.code])} stroke="#f4f6f2" strokeWidth={0.6}>
            <title>{f.properties.name}</title>
          </path>
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground" aria-hidden="true">
        {breaks.map((b, i) => (
          <li key={b} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-[1px]" style={{ background: RAMP[i] }} />
            {legendLabels(i === 0 ? sorted[0]! : breaks[i - 1]! + 1, b)}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-[1px] border border-border" style={{ background: NO_RECORDS }} />
          {noRecordsLabel}
        </li>
      </ul>
    </div>
  );
}
