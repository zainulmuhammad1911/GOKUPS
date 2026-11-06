import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { PageHeading } from "@/components/data/blocks";
import { JENIS_COLOR_HEX } from "@/components/data/blocks";
import { MapExplorer, type Indicator, type RegionData, type Values } from "@/components/map/MapExplorer";
import { loadRelease } from "@/lib/data/release";
import { aggregate } from "@/lib/data/aggregate";
import { formatDateTime } from "@/lib/data/format";
import { JENIS_ORDER } from "@/lib/data/stats";
import type { ApprovalRecord } from "@/lib/data/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "map" });
  return { title: t("title") };
}

function boundaryMeta(): { version: string; attribution_id: string; attribution_en: string } {
  const root = path.join(process.cwd(), "public", "geo");
  const { version } = JSON.parse(readFileSync(path.join(root, "current.json"), "utf-8")) as { version: string };
  if (!/^[0-9A-Za-z.\-]+$/.test(version)) throw new Error("Versi batas wilayah tidak valid");
  const meta = JSON.parse(readFileSync(path.join(root, version, "boundary_release.json"), "utf-8"));
  return { version, attribution_id: meta.source.attribution_id, attribution_en: meta.source.attribution_en };
}

function values(records: ApprovalRecord[]): Values {
  const b = aggregate(records);
  return [
    b.records,
    b.area_ha,
    b.members_male_plus_female,
    b.members_records_used,
    b.members_male,
    b.members_female,
    b.members_female_zero_records,
  ];
}

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { meta, approvals, adminAreas, schemes } = loadRelease();
  const boundary = boundaryMeta();

  // Agregat per wilayah per jenis PS, dihitung dengan fungsi aggregate() yang sama dengan halaman lain.
  const regions: Record<string, RegionData> = {};
  for (const a of adminAreas) {
    regions[a.code] = { name: a.name, parent: a.level === "province" ? null : a.parent_code, byType: {} };
  }
  const groups = new Map<string, ApprovalRecord[]>();
  for (const r of approvals) {
    for (const key of [r.derived.province_code, r.derived.regency_code]) {
      for (const type of ["all", r.derived.jenis_ps_code]) {
        const k = `${key}|${type}`;
        const list = groups.get(k);
        if (list) list.push(r);
        else groups.set(k, [r]);
      }
    }
  }
  for (const [k, list] of groups) {
    const [code, type] = k.split("|") as [string, string];
    regions[code]!.byType[type] = values(list);
  }

  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const indicator = (["records", "area", "members"] as const).includes(one("indicator") as Indicator) ? (one("indicator") as Indicator) : "records";
  const type = (JENIS_ORDER as readonly string[]).includes(one("type") ?? "") ? one("type")! : "all";
  const provinceParam = one("province");
  const province = provinceParam && regions[provinceParam]?.parent === null ? provinceParam : null;
  const regencyParam = one("regency");
  const regency = province && regencyParam && regions[regencyParam]?.parent === province ? regencyParam : null;

  const jenisLabel = (code: string) => {
    const s = schemes.find((x) => x.jenis_ps_code === code);
    return (locale === "en" ? s?.jenis_ps_label_en : s?.jenis_ps_label_id) ?? code;
  };

  return (
    <>
      <PageHeading title={t("map.title")} lead={t("map.lead")} />
      <MapExplorer
        geoBase={`/geo/${boundary.version}`}
        attribution={locale === "en" ? boundary.attribution_en : boundary.attribution_id}
        regions={regions}
        types={JENIS_ORDER.map((c) => ({ code: c, label: jenisLabel(c), color: JENIS_COLOR_HEX[c]! }))}
        initial={{ indicator, type, province, regency }}
        dataPath={getPathname({ href: "/data", locale })}
        sourceLine={`${t("common.processed")} ${t("common.sourceLine", { date: formatDateTime(meta.source.extracted_at, locale), version: meta.version })}`}
      />
    </>
  );
}
