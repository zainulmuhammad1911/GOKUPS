"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

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
  activeCount,
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
  activeCount: number;
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

  const field = "flex flex-col gap-1 text-small";
  const control =
    "min-h-11 w-full rounded-[var(--radius-control)] border border-rule-strong bg-surface-raised px-3 text-body text-ink";

  return (
    <div className="rounded-[var(--radius-panel)] border border-rule bg-surface-raised">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between px-4 text-left font-bold text-forest lg:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{activeCount > 0 ? t("filtersActive", { count: activeCount }) : t("filters")}</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <form
        id={panelId}
        action={action}
        method="get"
        role="search"
        aria-label={t("filters")}
        onSubmit={(e) => {
          // Alamat lebih ringkas: kolom kosong dan urutan bawaan tidak ikut dikirim.
          for (const el of Array.from(e.currentTarget.elements)) {
            if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
            const isDefault = el.value === "" || (el.name === "sort" && el.value === "no") || (el.name === "dir" && el.value === "asc");
            if (el.name && isDefault) el.disabled = true;
          }
          // Aktifkan kembali setelah navigasi dimulai, untuk kasus kembali dengan bfcache.
          setTimeout(() => {
            for (const el of Array.from(e.currentTarget?.elements ?? [])) {
              if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.disabled = false;
            }
          }, 0);
        }}
        className={`${open ? "grid" : "hidden"} gap-4 border-t border-rule p-4 lg:grid lg:border-t-0 lg:grid-cols-4`}
      >
        <div className={`${field} lg:col-span-2`}>
          <label htmlFor={`${panelId}-q`} className="font-bold">{t("search")}</label>
          <input
            id={`${panelId}-q`}
            type="search"
            name="q"
            defaultValue={values.q}
            maxLength={100}
            aria-describedby={`${panelId}-hint`}
            className={control}
          />
          <span id={`${panelId}-hint`} className="text-caption text-ink-muted">{t("searchHint")}</span>
        </div>

        <div className={field}>
          <label htmlFor={`${panelId}-province`} className="font-bold">{t("province")}</label>
          <select
            id={`${panelId}-province`}
            name="province"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              if (e.target.value && regency && !regency.startsWith(`${e.target.value}.`)) setRegency("");
            }}
            className={control}
          >
            <option value="">{t("allProvinces")}</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className={field}>
          <label htmlFor={`${panelId}-regency`} className="font-bold">{t("regency")}</label>
          <select
            id={`${panelId}-regency`}
            name="regency" value={regency} onChange={(e) => setRegency(e.target.value)} className={control}>
            <option value="">{t("allRegencies")}</option>
            {grouped.map((g) => (
              <optgroup key={g.p.code} label={g.p.name}>
                {g.items.map((r) => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className={field}>
          <label htmlFor={`${panelId}-type`} className="font-bold">{t("type")}</label>
          <select
            id={`${panelId}-type`}
            name="type" defaultValue={values.type ?? ""} className={control}>
            <option value="">{t("allTypes")}</option>
            {types.map((o) => (
              <option key={o.code} value={o.code}>{o.name}</option>
            ))}
            <optgroup label={t("kkDetail")}>
              {kkSubtypes.map((o) => (
                <option key={o.code} value={o.code}>{o.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-small font-bold">{t("year")}</legend>
          <div className={field}>
            <label htmlFor={`${panelId}-year_from`}>{t("yearFrom")}</label>
            <select id={`${panelId}-year_from`} name="year_from" defaultValue={values.yearFrom ?? ""} className={control}>
              <option value="">{t("anyYear")}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className={field}>
            <label htmlFor={`${panelId}-year_to`}>{t("yearTo")}</label>
            <select id={`${panelId}-year_to`} name="year_to" defaultValue={values.yearTo ?? ""} className={control}>
              <option value="">{t("anyYear")}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </fieldset>

        <div className={field}>
          <label htmlFor={`${panelId}-flag`} className="font-bold">{t("flag")}</label>
          <select
            id={`${panelId}-flag`}
            name="flag" defaultValue={values.flag ?? ""} className={control}>
            <option value="">{t("allFlags")}</option>
            {flags.map((o) => (
              <option key={o.code} value={o.code}>{o.name}</option>
            ))}
          </select>
        </div>

        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-small font-bold">{t("sortBy")}</legend>
          <div className={field}>
            <label htmlFor={`${panelId}-sort`} className="sr-only">{t("sortBy")}</label>
            <select id={`${panelId}-sort`} name="sort" defaultValue={values.sort} className={control}>
              {(["no", "sk", "name", "type", "province", "regency", "date", "area"] as const).map((k) => (
                <option key={k} value={k}>{t(`sortLabel.${k}`)}</option>
              ))}
            </select>
          </div>
          <div className={field}>
            <label htmlFor={`${panelId}-dir`} className="sr-only">{t("sortDir")}</label>
            <select id={`${panelId}-dir`} name="dir" defaultValue={values.dir} className={control}>
              <option value="asc">{t("asc")}</option>
              <option value="desc">{t("desc")}</option>
            </select>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-end gap-3 lg:col-span-4">
          <button
            type="submit"
            className="min-h-11 rounded-[var(--radius-control)] bg-forest px-5 font-bold text-white hover:bg-forest-hover"
          >
            {t("apply")}
          </button>
          <a href={resetHref} className="inline-flex min-h-11 items-center px-2">
            {t("reset")}
          </a>
        </div>
      </form>
    </div>
  );
}
