"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface Option {
  code: string;
  name: string;
  parent?: string | null;
}

export interface FilterValues {
  q: string;
  province: string | null;
  regency: string | null;
  type: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  flag: string | null;
  members: string | null;
  pendamping: string | null;
  sort: string;
  dir: "asc" | "desc";
}

/**
 * Form filter halaman Data. Memakai GET biasa: alamat hasil filter bisa dibagikan,
 * tombol kembali browser berfungsi, dan form tetap bekerja walau JavaScript gagal dimuat.
 * JavaScript hanya menyaring daftar kabupaten/kota sesuai provinsi terpilih dan
 * membuka/menutup panel di ponsel.
 */
export function DataFilters({
  action,
  resetHref,
  values,
  provinces,
  regencies,
  types,
  kkSubtypes,
  flags,
  years,
  memberOptions,
  pendampingOptions,
  activeCount,
  minimal = false,
}: {
  action: string;
  resetHref: string;
  values: FilterValues;
  provinces: Option[];
  regencies: Option[];
  types: Option[];
  kkSubtypes: Option[];
  flags: Option[];
  years: number[];
  /** Pilihan filter jumlah anggota tercatat, dengan jumlah rekaman pada label. */
  memberOptions: Option[];
  /** Pilihan filter pendamping (K11), dengan jumlah rekaman pada label. */
  pendampingOptions: Option[];
  activeCount: number;
  /** Tanpa pencarian, catatan pemeriksaan, dan urutan (dipakai halaman Statistik). */
  minimal?: boolean;
}) {
  const t = useTranslations("data");
  const [open, setOpen] = useState(false);
  const [province, setProvince] = useState(values.province ?? "");
  const [regency, setRegency] = useState(values.regency ?? "");
  const panelId = useId();

  const visibleRegencies = province ? regencies.filter((r) => r.parent === province) : regencies;
  const grouped = provinces
    .map((p) => ({ p, items: visibleRegencies.filter((r) => r.parent === p.code) }))
    .filter((g) => g.items.length > 0);

  const field = "flex min-w-0 flex-col gap-1.5 text-small";

  return (
    <div data-slot="card" className="rounded-xl bg-card ring-1 ring-border">
      <button
        type="button"
        className="flex min-h-12 w-full items-center gap-2 px-4 text-left font-bold text-primary lg:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        <span className="flex-1">{t("filters")}</span>
        {activeCount > 0 && (
          <Badge>
            <span className="sr-only">{t("filtersActive", { count: activeCount })}</span>
            <span aria-hidden="true">{activeCount}</span>
          </Badge>
        )}
        <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <p className="hidden items-center gap-2 px-5 pt-4 text-small font-bold lg:flex" aria-hidden="true">
        <SlidersHorizontal className="size-4 text-primary" />
        {t("filters")}
        {activeCount > 0 && <Badge>{activeCount}</Badge>}
      </p>
      <form
        id={panelId}
        action={action}
        method="get"
        role="search"
        aria-label={t("filters")}
        onSubmit={(e) => {
          const form = e.currentTarget;
          // Alamat lebih ringkas: kolom kosong dan urutan bawaan tidak ikut dikirim.
          for (const el of Array.from(form.elements)) {
            if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
            const isDefault = el.value === "" || (el.name === "sort" && el.value === "no") || (el.name === "dir" && el.value === "asc");
            if (el.name && isDefault) el.disabled = true;
          }
          // Aktifkan kembali setelah navigasi dimulai, untuk kasus kembali dengan bfcache.
          setTimeout(() => {
            for (const el of Array.from(form.elements)) {
              if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.disabled = false;
            }
          }, 0);
        }}
        className={`${open ? "grid" : "hidden"} gap-4 border-t p-4 lg:grid lg:grid-cols-4 lg:border-t-0 lg:px-5 lg:pb-5`}
      >
        {!minimal && (
        <div className={`${field} lg:col-span-2`}>
          <Label htmlFor={`${panelId}-q`} className="font-bold">{t("search")}</Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${panelId}-q`}
              type="search"
              name="q"
              defaultValue={values.q}
              maxLength={100}
              aria-describedby={`${panelId}-hint`}
              className="h-10 bg-card pl-9 text-[0.9375rem] md:text-[0.9375rem]"
            />
          </div>
          <span id={`${panelId}-hint`} className="text-caption text-muted-foreground">{t("searchHint")}</span>
        </div>
        )}

        <div className={field}>
          <Label htmlFor={`${panelId}-province`} className="font-bold">{t("province")}</Label>
          <NativeSelect size="lg" className="w-full"
            id={`${panelId}-province`}
            name="province"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              if (e.target.value && regency && !regency.startsWith(`${e.target.value}.`)) setRegency("");
            }}
           
          >
            <option value="">{t("allProvinces")}</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </NativeSelect>
        </div>

        <div className={field}>
          <Label htmlFor={`${panelId}-regency`} className="font-bold">{t("regency")}</Label>
          <NativeSelect size="lg" className="w-full"
            id={`${panelId}-regency`}
            name="regency" value={regency} onChange={(e) => setRegency(e.target.value)}>
            <option value="">{t("allRegencies")}</option>
            {grouped.map((g) => (
              <optgroup key={g.p.code} label={g.p.name}>
                {g.items.map((r) => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>

        <div className={field}>
          <Label htmlFor={`${panelId}-type`} className="font-bold">{t("type")}</Label>
          <NativeSelect size="lg" className="w-full"
            id={`${panelId}-type`}
            name="type" defaultValue={values.type ?? ""}>
            <option value="">{t("allTypes")}</option>
            {types.map((o) => (
              <option key={o.code} value={o.code}>{o.name}</option>
            ))}
            <optgroup label={t("kkDetail")}>
              {kkSubtypes.map((o) => (
                <option key={o.code} value={o.code}>{o.name}</option>
              ))}
            </optgroup>
          </NativeSelect>
        </div>

        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1.5 text-small font-bold">{t("year")}</legend>
          <div className={field}>
            <Label htmlFor={`${panelId}-year_from`} className="font-normal text-muted-foreground">{t("yearFrom")}</Label>
            <NativeSelect size="lg" className="w-full" id={`${panelId}-year_from`} name="year_from" defaultValue={values.yearFrom ?? ""}>
              <option value="">{t("anyYear")}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </NativeSelect>
          </div>
          <div className={field}>
            <Label htmlFor={`${panelId}-year_to`} className="font-normal text-muted-foreground">{t("yearTo")}</Label>
            <NativeSelect size="lg" className="w-full" id={`${panelId}-year_to`} name="year_to" defaultValue={values.yearTo ?? ""}>
              <option value="">{t("anyYear")}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </NativeSelect>
          </div>
        </fieldset>

        <div className={field}>
          <Label htmlFor={`${panelId}-members`} className="font-bold">{t("members")}</Label>
          <NativeSelect size="lg" className="w-full"
            id={`${panelId}-members`}
            name="members"
            defaultValue={values.members ?? ""}
            aria-describedby={`${panelId}-members-hint`}
          >
            <option value="">{t("membersAll")}</option>
            {memberOptions.map((o) => (
              <option key={o.code} value={o.code}>{o.name}</option>
            ))}
          </NativeSelect>
          <span id={`${panelId}-members-hint`} className="text-caption text-muted-foreground">{t("membersHint")}</span>
        </div>

        <div className={field}>
          <Label htmlFor={`${panelId}-pendamping`} className="font-bold">{t("pendamping")}</Label>
          <NativeSelect size="lg" className="w-full"
            id={`${panelId}-pendamping`}
            name="pendamping"
            defaultValue={values.pendamping ?? ""}
            aria-describedby={`${panelId}-pendamping-hint`}
          >
            <option value="">{t("pendampingAll")}</option>
            {pendampingOptions.map((o) => (
              <option key={o.code} value={o.code}>{o.name}</option>
            ))}
          </NativeSelect>
          <span id={`${panelId}-pendamping-hint`} className="text-caption text-muted-foreground">{t("pendampingHint")}</span>
        </div>

        {!minimal && (
        <div className={field}>
          <Label htmlFor={`${panelId}-flag`} className="font-bold">{t("flag")}</Label>
          <NativeSelect size="lg" className="w-full"
            id={`${panelId}-flag`}
            name="flag" defaultValue={values.flag ?? ""}>
            <option value="">{t("allFlags")}</option>
            {flags.map((o) => (
              <option key={o.code} value={o.code}>{o.name}</option>
            ))}
          </NativeSelect>
        </div>
        )}

        {!minimal && (
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1.5 text-small font-bold">{t("sortBy")}</legend>
          <div className={field}>
            <Label htmlFor={`${panelId}-sort`} className="sr-only">{t("sortBy")}</Label>
            <NativeSelect size="lg" className="w-full" id={`${panelId}-sort`} name="sort" defaultValue={values.sort}>
              {(["no", "sk", "name", "type", "province", "regency", "date", "area"] as const).map((k) => (
                <option key={k} value={k}>{t(`sortLabel.${k}`)}</option>
              ))}
            </NativeSelect>
          </div>
          <div className={field}>
            <Label htmlFor={`${panelId}-dir`} className="sr-only">{t("sortDir")}</Label>
            <NativeSelect size="lg" className="w-full" id={`${panelId}-dir`} name="dir" defaultValue={values.dir}>
              <option value="asc">{t("asc")}</option>
              <option value="desc">{t("desc")}</option>
            </NativeSelect>
          </div>
        </fieldset>
        )}

        <div className="flex flex-wrap items-end gap-3 lg:col-span-4">
          <Button type="submit" size="lg" className="h-10 px-5 text-small font-bold">
            {t("apply")}
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-10 px-3 text-small text-primary">
            <a href={resetHref}>{t("reset")}</a>
          </Button>
        </div>
      </form>
    </div>
  );
}
