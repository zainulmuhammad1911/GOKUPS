import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink, Search } from "lucide-react";
import { getPathname, Link } from "@/i18n/navigation";
import { DataNote, EmptyValue, PageHeading, SchemeSwatch } from "@/components/data/blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { loadRelease } from "@/lib/data/release";
import { loadOmsDirectory } from "@/lib/data/oms";
import { filterOms, NATIONAL, OMS_ROLES, omsActiveCount, parseOmsQuery, type OmsEntry } from "@/lib/data/oms-query";
import { formatNumber } from "@/lib/data/format";
import { JENIS_CODES, queryContext, regionList } from "@/lib/data/query";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "oms" });
  return { title: t("title") };
}

export default async function OrganizationsPage({
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
  const directory = loadOmsDirectory();
  const ctx = queryContext(adminAreas, approvals, []);
  const query = parseOmsQuery(await searchParams, ctx);
  const results = filterOms(directory.entries, query, ctx.provinceRegion);
  const n = (v: number) => formatNumber(v, locale);
  const active = omsActiveCount(query);

  const regions = regionList(ctx);
  const provinces = adminAreas.filter((a) => a.level === "province");
  const nameOf = new Map(provinces.map((a) => [a.code, a.name]));
  const usedProvinces = new Set(directory.entries.flatMap((e) => e.province_codes));
  const jenisLabel = (code: string) => {
    const s = schemes.find((x) => x.jenis_ps_code === code);
    return (locale === "en" ? s?.jenis_ps_label_en : s?.jenis_ps_label_id) ?? code;
  };
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", { dateStyle: "long", timeZone: "UTC" });
  const longDate = (iso: string) => dateFmt.format(new Date(iso));
  const verified = directory.entries.filter((e) => e.verification.status === "verified").length;

  const action = getPathname({ href: "/organizations", locale });
  const field = "flex min-w-0 flex-col gap-1.5 text-small";
  const where = (e: OmsEntry) =>
    [...e.province_codes.map((c) => nameOf.get(c) ?? c), ...(e.national ? [t("oms.national")] : [])].join(", ");

  const activeLabels = [
    query.q && `${t("data.search")}: “${query.q}”`,
    query.region && `${t("data.region")}: ${query.region}`,
    query.province && `${t("data.province")}: ${query.province === NATIONAL ? t("oms.national") : nameOf.get(query.province)}`,
    query.type && `${t("data.type")}: ${jenisLabel(query.type)}`,
    query.role && `${t("oms.role")}: ${t(`oms.roles.${query.role}`)}`,
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeading
        title={t("oms.title")}
        lead={t("oms.lead", { count: n(directory.counts.published), date: longDate(directory.source.directory_date) })}
      />

      <DataNote title={t("oms.noteTitle")}>
        <span className="flex flex-col gap-2">
          <span>{t("oms.noteSeparate")}</span>
          <span>
            {t("oms.noteChecked", {
              date: longDate(directory.source.checked_date),
              verified: n(verified),
              partial: n(directory.counts.published - verified),
              withheld: n(directory.counts.withheld),
            })}
          </span>
          {locale === "en" && <span>{t("oms.noteLanguage")}</span>}
        </span>
      </DataNote>

      <form
        action={action}
        method="get"
        role="search"
        aria-label={t("oms.filters")}
        data-slot="card"
        className="mt-6 grid gap-4 rounded-xl bg-card p-4 ring-1 ring-border md:grid-cols-2 lg:grid-cols-4 lg:p-5"
      >
        <div className={`${field} md:col-span-2 lg:col-span-4`}>
          <Label htmlFor="oms-q" className="font-bold">{t("data.search")}</Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="oms-q"
              type="search"
              name="q"
              defaultValue={query.q}
              maxLength={100}
              aria-describedby="oms-q-hint"
              className="h-10 bg-card pl-9 text-[0.9375rem] md:text-[0.9375rem]"
            />
          </div>
          <span id="oms-q-hint" className="text-caption text-muted-foreground">{t("oms.searchHint")}</span>
        </div>
        <div className={field}>
          <Label htmlFor="oms-region" className="font-bold">{t("data.region")}</Label>
          <NativeSelect size="lg" className="w-full" id="oms-region" name="region" defaultValue={query.region ?? ""}>
            <option value="">{t("data.allRegions")}</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </NativeSelect>
        </div>
        <div className={field}>
          <Label htmlFor="oms-province" className="font-bold">{t("data.province")}</Label>
          <NativeSelect size="lg" className="w-full" id="oms-province" name="province" defaultValue={query.province ?? ""}>
            <option value="">{t("data.allProvinces")}</option>
            <option value={NATIONAL}>{t("oms.national")}</option>
            {regions.map((r) => (
              <optgroup key={r} label={r}>
                {provinces
                  .filter((p) => ctx.provinceRegion.get(p.code) === r && usedProvinces.has(p.code))
                  .map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>
        <div className={field}>
          <Label htmlFor="oms-type" className="font-bold">{t("data.type")}</Label>
          <NativeSelect size="lg" className="w-full" id="oms-type" name="type" defaultValue={query.type ?? ""}>
            <option value="">{t("data.allTypes")}</option>
            {JENIS_CODES.map((c) => (
              <option key={c} value={c}>{jenisLabel(c)}</option>
            ))}
          </NativeSelect>
        </div>
        <div className={field}>
          <Label htmlFor="oms-role" className="font-bold">{t("oms.role")}</Label>
          <NativeSelect size="lg" className="w-full" id="oms-role" name="role" defaultValue={query.role ?? ""}>
            <option value="">{t("oms.allRoles")}</option>
            {OMS_ROLES.map((r) => (
              <option key={r} value={r}>{t(`oms.roles.${r}`)}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-4">
          <Button type="submit" size="lg">{t("oms.apply")}</Button>
          {active > 0 && (
            <Button asChild variant="outline" size="lg">
              <Link href="/organizations">{t("oms.reset")}</Link>
            </Button>
          )}
        </div>
      </form>

      <p className="mt-6 font-bold" role="status">
        {t("oms.resultCount", { count: n(results.length), total: n(directory.counts.published) })}
        {activeLabels.length > 0 && <span className="block font-normal text-muted-foreground text-small">{activeLabels.join(" · ")}</span>}
      </p>

      {results.length === 0 ? (
        <p className="mt-4">
          {t("oms.empty")} <Link href="/organizations">{t("oms.reset")}</Link>
        </p>
      ) : (
        <ul className="mt-4 grid gap-4" aria-label={t("oms.listLabel")}>
          {results.map((e) => (
            <li key={e.id}>
              <OrgCard e={e} where={where(e)} jenisLabel={jenisLabel} t={t} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-small text-muted-foreground">
        {t("oms.sourceLine", {
          name: directory.source.name,
          date: longDate(directory.source.directory_date),
          checked: longDate(directory.source.checked_date),
          version: directory.version,
        })}
      </p>
    </>
  );
}

function OrgCard({
  e,
  where,
  jenisLabel,
  t,
}: {
  e: OmsEntry;
  where: string;
  jenisLabel: (code: string) => string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const v = e.verification;
  const showShort = e.short_name && !e.name.includes(e.short_name);
  const titleId = `org-${e.id}`;
  const row = (label: string, value: string | null) => (
    <div className="grid gap-0.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value ?? <EmptyValue>{t("oms.notStated")}</EmptyValue>}</dd>
    </div>
  );
  return (
    <Card aria-labelledby={titleId} className="gap-4">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h2 id={titleId} className="min-w-0 text-h3 font-bold tracking-tight">
            {e.name}
            {showShort && <span className="font-normal text-muted-foreground"> ({e.short_name})</span>}
          </h2>
          <Badge variant="outline" className={v.status === "verified" ? "border-deep bg-accent text-forest" : "border-earth text-earth"}>
            {t(`oms.status.${v.status}`)}
          </Badge>
        </div>
        <p className="text-small text-muted-foreground">
          {[e.org_type, where].filter(Boolean).join(" · ")}
        </p>
        {e.scheme_codes.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-small" aria-label={t("data.type")}>
            {e.scheme_codes.map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <SchemeSwatch code={c} />
                {jenisLabel(c)}
              </li>
            ))}
          </ul>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-small">
        <dl className="flex flex-col gap-2">
          {row(t("oms.roleLabel"), e.roles.length ? e.roles.map((r) => t(`oms.roles.${r}`)).join(", ") : null)}
          {row(t("oms.schemeText"), e.scheme_text)}
          {row(t("oms.locations"), e.locations)}
          {row(t("oms.activity"), e.activity)}
          {row(t("oms.partners"), e.partners)}
          {row(t("oms.period"), e.period)}
        </dl>
        {v.note && (
          <p className="border-l-2 border-rule-strong pl-3">
            <span className="font-bold">{t("oms.checkNote")}: </span>
            {v.note}
          </p>
        )}
        <details className="rounded-lg bg-muted/50 px-4 py-2 [&[open]]:pb-4">
          <summary className="flex min-h-10 cursor-pointer items-center font-bold text-deep">{t("oms.evidenceTitle")}</summary>
          <div className="mt-2 flex flex-col gap-3">
            {v.website && (
              <p>
                <span className="text-muted-foreground">{t("oms.website")}: </span>
                <a href={v.website} rel="noopener noreferrer" className="break-all">{v.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
              </p>
            )}
            {v.evidence.length > 0 ? (
              <ul className="flex list-disc flex-col gap-1.5 pl-5">
                {v.evidence.map((x) => (
                  <li key={x.url}>
                    <a href={x.url} rel="noopener noreferrer" className="break-words">
                      {x.title}
                      <ExternalLink aria-hidden="true" className="ml-1 inline size-3.5 align-[-2px]" />
                    </a>
                    {x.year && <span className="text-muted-foreground"> ({x.year})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{t("oms.noEvidence")}</p>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
