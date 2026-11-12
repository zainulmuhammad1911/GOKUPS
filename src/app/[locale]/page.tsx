import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, ArrowUpRight, ChartColumnBig, Download, Info, Map as MapIcon, Table2, UsersRound } from "lucide-react";
import { DataSheetStat, SectionCard } from "@/components/data/blocks";
import { Button } from "@/components/ui/button";
import { MetricChart } from "@/components/charts/ChartFigures";
import { MiniMap } from "@/components/map/MiniMap";
import { CountUp } from "@/components/motion/CountUp";
import { SplitWords } from "@/components/motion/SplitWords";
import { getPathname } from "@/i18n/navigation";
import { jenisStats, regionStats } from "@/lib/data/stats";
import { loadRelease, loadSiteConfig } from "@/lib/data/release";
import { loadOmsDirectory } from "@/lib/data/oms";
import { countFlag } from "@/lib/data/aggregate";
import { formatDateTime, formatNumber } from "@/lib/data/format";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { meta, totals, approvals, adminAreas, schemes } = loadRelease();
  const site = loadSiteConfig();
  const oms = loadOmsDirectory();
  const nat = totals.national;
  const n = (v: number) => formatNumber(v, locale);

  const provinces = adminAreas.filter((a) => a.level === "province");
  const regencyTotal = adminAreas.filter((a) => a.level === "regency").length;
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
  const byProvince = regionStats(approvals, "province", adminAreas);
  const ticker = [...byProvince].sort((a, b) => b.records - a.records);

  const explore = [
    { href: "/map", icon: MapIcon, key: "map" },
    { href: "/statistics", icon: ChartColumnBig, key: "statistics" },
    { href: "/data", icon: Table2, key: "data" },
    { href: "/organizations", icon: UsersRound, key: "organizations" },
    { href: "/download", icon: Download, key: "download" },
    { href: "/about", icon: Info, key: "about" },
  ] as const;

  return (
    <>
      {/* Hero: permukaan hijau hutan, grid titik, dua cahaya yang bergerak pelan, dan tanda Data KUPS dengan cincin radar. */}
      <section aria-labelledby="hero-title" className="surface-forest relative isolate overflow-hidden rounded-[1.75rem] px-6 pt-12 pb-28 md:px-12 md:pt-16 md:pb-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="aurora-blob absolute -top-24 -left-16 size-[26rem] rounded-full bg-tri/30 blur-3xl" />
          <div className="aurora-blob absolute -right-20 -bottom-32 size-[30rem] rounded-full bg-deep/60 blur-3xl" />
          <div className="bg-dots absolute inset-0 text-white/15" />
        </div>
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col gap-5">
            <p className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[0.6875rem] font-bold tracking-[0.06em] uppercase sm:text-xs sm:tracking-[0.12em]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-tri" />
              <span className="shiny-text text-[#ffe3ea]">{t("home.eyebrow")}</span>
            </p>
            <h1 id="hero-title" className="font-heading text-[2.25rem] leading-[2.75rem] font-extrabold tracking-tight md:text-[3.5rem] md:leading-[4rem]">
              <SplitWords text={t("home.title")} />
            </h1>
            <p className="max-w-[58ch] text-[1.0625rem] leading-7 text-[#ffe3ea]">{t("home.lead")}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-5 text-[0.9375rem]">
                <Link href="/map">
                  <MapIcon aria-hidden="true" />
                  {t("home.openMap")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/30 bg-white/5 px-5 text-[0.9375rem] text-white hover:bg-white/15 hover:text-white">
                <Link href="/download">
                  <Download aria-hidden="true" />
                  {t("home.toDownload")}
                </Link>
              </Button>
            </div>
          </div>
          <div aria-hidden="true" className="relative mx-auto hidden aspect-square w-full max-w-[22rem] lg:block">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="absolute rounded-full border border-white/10" style={{ inset: `${i * 12}%` }} />
            ))}
            <span className="radar-sweep absolute inset-0 rounded-full" />
            <span className="absolute inset-[36%] flex items-center justify-center rounded-[1.75rem] bg-white p-3 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.6)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={site.product.mark_path} alt="" width={235} height={235} className="h-full w-auto" />
            </span>
          </div>
        </div>
      </section>

      {/* Lembar data: angka utama dengan satuan, keterangan, dan baris sumber, menumpuk di bawah hero. */}
      <div className="relative z-10 -mt-20 grid gap-4 px-2 md:grid-cols-2 md:px-6 2xl:grid-cols-4">
        <DataSheetStat label={t("home.recordsLabel")} value={<CountUp value={nat.records} locale={locale} />} unit={t("common.records")} source={source}>
          {t("home.recordsNote")}
        </DataSheetStat>
        <DataSheetStat
          label={t("home.provincesLabel")}
          value={t("home.provincesValue", { count: totals.provinces_with_records, total: provinces.length })}
          unit={t("home.provincesUnit")}
          source={source}
        >
          <span className="flex items-baseline gap-2">
            <span className="font-heading text-[1.75rem] leading-8 font-extrabold tracking-tight text-forest tabular">
              {t("home.provincesValue", { count: n(totals.regencies_with_records), total: n(regencyTotal) })}
            </span>
            <span className="text-muted-foreground">{t("home.regenciesUnit")}</span>
          </span>
          {missing.length > 0 && <span className="block">{t("home.provincesNote", { names: missing.join(", ") })}</span>}
          <Link href={{ pathname: "/statistics", hash: "cakupan-kabupaten" }} className="inline-flex min-h-10 items-center gap-1.5 font-bold">
            {t("home.regenciesLink")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </DataSheetStat>
        <DataSheetStat label={t("home.areaLabel")} value={<CountUp value={nat.area_ha} locale={locale} digits={2} />} unit={t("common.hectare")} source={`${processed} ${source}`}>
          {t("home.areaNote", { used: n(nat.area_records_used), flagged: n(countFlag(approvals, "area_component_mismatch")) })}
        </DataSheetStat>
        <DataSheetStat label={t("home.membersLabel")} value={<CountUp value={nat.members_male_plus_female} locale={locale} />} source={`${processed} ${source}`}>
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
      </div>

      {/* Pita provinsi berjalan (gaya marquee). Salinan kedua hanya hiasan dan disembunyikan dari pembaca layar. */}
      <section aria-labelledby="pita-provinsi" className="mt-12">
        <h2 id="pita-provinsi" className="font-mono text-xs font-bold tracking-[0.14em] text-deep uppercase">
          {t("home.tickerTitle")}
        </h2>
        <div className="marquee relative mt-3 overflow-hidden motion-reduce:overflow-x-auto rounded-2xl border bg-card py-3 [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
          <div className="marquee-track flex w-max gap-2">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 gap-2 pr-2" aria-hidden={copy === 1 ? true : undefined}>
                {ticker.map((r, i) => (
                  <li key={r.code}>
                    <Link
                      href={{ pathname: "/data", query: { province: r.code } }}
                      tabIndex={copy === 1 ? -1 : undefined}
                      data-slot="ticker"
                      className="flex h-10 items-center gap-2 rounded-full border bg-background px-4 text-small whitespace-nowrap text-foreground no-underline transition-colors hover:border-forest hover:bg-accent"
                    >
                      <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-bold">{r.name}</span>
                      <span className="tabular text-deep">{t("home.tickerCount", { count: n(r.records) })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-x-6 xl:grid-cols-2">
        <SectionCard
          id="peta-mini"
          title={t("home.miniMapTitle")}
          description={`${processed} ${source}`}
          footer={
            <Link href="/map" className="inline-flex min-h-11 items-center gap-1.5 font-bold">
              {t("home.openMap")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          }
        >
          <MiniMap
            values={Object.fromEntries(totals.by_province.map((p) => [p.province_code, p.records]))}
            label={t("home.miniMapLabel", { count: totals.provinces_with_records })}
            legendLabels={(from, to) => t("map.range", { from: n(from), to: n(to) })}
            noRecordsLabel={t("map.noRecords")}
          />
        </SectionCard>
        <MetricChart
          id="beranda-jenis"
          title={t("home.chartJenis")}
          caption={`${processed} ${source}`}
          metrics={metrics}
          categoryHeader={t("statistics.jenis")}
          color="#c4052f"
          rows={jenisStats(approvals).map((j) => ({
            label: jenisLabel(j.code),
            href: getPathname({ href: { pathname: "/data", query: { type: j.code } }, locale }),
            values: { records: j.records, area: j.area, members: j.members },
          }))}
        />
      </div>
      <MetricChart
        id="beranda-provinsi"
        title={t("home.chartTopProvinces")}
        caption={`${processed} ${source}`}
        metrics={metrics}
        categoryHeader={t("map.province")}
        color="#c4052f"
        topN={10}
        rows={byProvince.map((r) => ({
          label: r.name,
          href: getPathname({ href: { pathname: "/data", query: { province: r.code } }, locale }),
          values: { records: r.records, area: r.area, members: r.members },
        }))}
      />

      {/* Bento: pintu masuk ke setiap bagian, dengan sorot kursor. */}
      <nav aria-labelledby="lanjut" className="mt-14">
        <p className="font-mono text-xs font-bold tracking-[0.14em] text-deep uppercase">{t("home.nextEyebrow")}</p>
        <h2 id="lanjut" className="mt-2 font-heading text-[1.75rem] leading-9 font-extrabold tracking-tight text-forest">
          {t("home.next")}
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {explore.map((item, i) => {
            const wide = i < 2;
            return (
              <li key={item.key} data-reveal="" style={{ ["--i" as string]: i }} className={wide ? "lg:col-span-6" : "lg:col-span-3"}>
                <Link
                  href={item.href}
                  data-slot="bento"
                  data-spotlight=""
                  className={`group flex h-full flex-col gap-4 overflow-hidden rounded-2xl border p-6 no-underline transition-colors ${
                    i === 0 ? "surface-forest on-dark border-transparent" : "bg-card text-foreground hover:border-forest/40"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className={`flex size-11 items-center justify-center rounded-xl ${i === 0 ? "bg-white/10 text-white" : "bg-accent text-forest"}`}>
                      <item.icon aria-hidden="true" className="size-5" />
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className={`size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${i === 0 ? "text-[#ffe3ea]" : "text-tri-ink"}`}
                    />
                  </span>
                  <span className="mt-auto flex flex-col gap-1">
                    <span className={`font-heading text-xl font-bold ${i === 0 ? "text-white" : "text-forest"}`}>{t(`nav.${item.key}`)}</span>
                    <span className={`text-small ${i === 0 ? "text-[#ffe3ea]" : "text-muted-foreground"}`}>
                      {t(`home.explore.${item.key}`, { records: n(nat.records), orgs: n(oms.counts.published) })}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
