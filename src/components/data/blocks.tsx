import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

/**
 * Kartu angka (motif "lembar data", DESIGN.md §1): label, angka + satuan, keterangan, baris sumber.
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
    <Card className="gap-3">
      <CardHeader>
        <CardDescription className="text-sm font-bold text-foreground">{label}</CardDescription>
        <p className="text-[2rem] leading-[2.375rem] font-bold tracking-tight tabular md:text-[2.5rem] md:leading-[2.75rem]">
          {value}
          {unit && <span className="ml-2 text-h3 font-normal text-muted-foreground">{unit}</span>}
        </p>
      </CardHeader>
      {children && <CardContent className="flex flex-col gap-1 text-small">{children}</CardContent>}
      {source && <CardFooter className="mt-auto bg-transparent py-3 text-caption text-muted-foreground">{source}</CardFooter>}
    </Card>
  );
}

/** Catatan data: blok tenang, tanpa warna status merah/hijau (DESIGN.md §6). */
export function DataNote({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Alert role="note" className="border-border bg-muted/60 px-4 py-3 text-small">
      <Info aria-hidden="true" />
      {title && <AlertTitle className="font-bold">{title}</AlertTitle>}
      <AlertDescription className="text-small text-foreground">{children}</AlertDescription>
    </Alert>
  );
}

export function PageHeading({ title, lead, actions }: { title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.75rem] leading-9 font-bold tracking-tight md:text-h1 md:leading-[var(--text-h1--line-height)]">
          {title}
        </h1>
        {lead && <p className="max-w-[72ch] text-muted-foreground">{lead}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-10 scroll-mt-20 text-h2 font-bold tracking-tight">
      {children}
    </h2>
  );
}

/**
 * Bagian berbingkai kartu: judul (h2), keterangan, aksi opsional di kanan, isi, dan kaki.
 * Dipakai untuk tabel rekap, grafik, dan panel.
 */
export function SectionCard({
  id,
  title,
  description,
  action,
  children,
  footer,
  className = "",
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`mt-6 ${className}`}>
      <CardHeader>
        <h2 id={id} className="scroll-mt-20 text-h3 font-bold tracking-tight">{title}</h2>
        {description && <CardDescription className="text-caption">{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
      {footer && <CardFooter className="mt-auto bg-transparent py-2 text-small">{footer}</CardFooter>}
    </Card>
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
    <Badge variant="outline" className="border-earth font-bold text-earth">
      {label}
    </Badge>
  );
}

export function EmptyValue({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground italic">{children}</span>;
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
