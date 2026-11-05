/** Format angka dan tanggal per bahasa. Tidak mengubah nilai, hanya cara menulisnya. */

const intlLocale = (locale: string) => (locale === "en" ? "en-GB" : "id-ID");

export function formatNumber(value: number, locale: string, maxFractionDigits = 2, grouping = true): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: maxFractionDigits,
    useGrouping: grouping,
  }).format(value);
}

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso)) + " UTC";
}

export function formatBytes(bytes: number, locale: string): string {
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, locale, 0)} KB`;
  return `${formatNumber(bytes / (1024 * 1024), locale, 1)} MB`;
}

/**
 * Nilai sumber untuk tampilan: teks persis seperti sumber; angka hanya diberi tanda desimal
 * sesuai bahasa. `grouping` false dipakai di tabel data sumber agar nomor baris dan kode tidak
 * tampak seperti ribuan.
 */
export function displaySourceValue(value: string | number | null, locale: string, grouping = true): string | null {
  if (value === null) return null;
  if (typeof value === "number") return formatNumber(value, locale, 4, grouping);
  return value;
}
