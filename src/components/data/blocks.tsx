import type { ReactNode } from "react";

/**
 * Blok "lembar data" (DESIGN.md §1, motif identitas): angka + satuan + keterangan + baris sumber.
 * Dipisahkan garis rambut, tanpa kartu berbayang.
 */
export function DataSheetStat({
  label,
  value,
  unit,
  children,
  source,
}: {
  label: string;
  value: string;
  unit?: string;
  children?: ReactNode;
  source?: ReactNode;
}) {
  return (
    <div className="rule-top flex flex-col gap-2 pt-4">
      <dt className="text-small font-bold text-ink">{label}</dt>
      <dd className="flex flex-col gap-2">
        <span className="text-[2.25rem] leading-[2.5rem] font-bold tracking-tight md:text-display md:leading-[var(--text-display--line-height)]">
          {value}
          {unit && <span className="ml-2 text-h3 font-normal text-ink-muted">{unit}</span>}
        </span>
        {children && <span className="max-w-[48ch] text-small text-ink">{children}</span>}
        {source && <span className="text-caption text-ink-muted">{source}</span>}
      </dd>
    </div>
  );
}

/** Catatan data: blok tenang, tanpa warna status merah/hijau (DESIGN.md §6). */
export function DataNote({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div role="note" className="rounded-[var(--radius-panel)] border border-rule bg-surface-sunken px-4 py-3 text-small">
      {title && <p className="mb-1 font-bold">{title}</p>}
      <div className="text-ink">{children}</div>
    </div>
  );
}

export function PageHeading({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 pb-8">
      <h1 className="text-[1.75rem] leading-9 font-bold tracking-tight md:text-h1 md:leading-[var(--text-h1--line-height)]">
        {title}
      </h1>
      {lead && <p className="max-w-[68ch] text-body text-ink">{lead}</p>}
    </div>
  );
}

export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="rule-top mt-12 pt-3 text-h2 font-bold">
      {children}
    </h2>
  );
}

/** Warna 5 jenis PS (DESIGN.md §3.2). Subskema KK memakai warna KK. */
export const JENIS_COLOR_HEX: Record<string, string> = {
  HD: "#2f8f5b",
  HKM: "#2f6fb0",
  HTR: "#cf5f3a",
  HA: "#9a5aa8",
  KK: "#d08a1a",
};
const SWATCH_CLASS: Record<string, string> = {
  HD: "bg-jenis-hd",
  HKM: "bg-jenis-hkm",
  HTR: "bg-jenis-htr",
  HA: "bg-jenis-ha",
  KK: "bg-jenis-kk",
};

/** Tanda warna jenis PS. Selalu disertai teks; warna bukan satu-satunya pembeda. */
export function SchemeSwatch({ code }: { code: string }) {
  const key = code.startsWith("KK") ? "KK" : code;
  return <span aria-hidden="true" className={`inline-block size-3 shrink-0 rounded-[1px] ${SWATCH_CLASS[key] ?? "bg-rule-strong"}`} />;
}

/** Penanda "Duplikat" dengan teks, bukan hanya warna. */
export function DuplicateBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-[var(--radius-control)] border border-earth px-1.5 text-caption font-bold text-earth">
      {label}
    </span>
  );
}

export function EmptyValue({ children }: { children: ReactNode }) {
  return <span className="text-ink-muted italic">{children}</span>;
}

/**
 * Teks panjang tanpa spasi (mis. nomor SK) diberi titik patah setelah "/" agar tidak terpotong
 * di tengah kata. <wbr> tidak menambah karakter, jadi teks yang disalin tetap sama dengan sumber.
 */
export function BreakableText({ text }: { text: string }) {
  const parts = text.split("/");
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <>
              /<wbr />
            </>
          )}
        </span>
      ))}
    </>
  );
}
