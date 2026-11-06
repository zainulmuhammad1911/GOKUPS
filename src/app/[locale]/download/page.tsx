import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, FileArchive, FileSpreadsheet } from "lucide-react";
import { DataNote, PageHeading, SectionCard } from "@/components/data/blocks";
import { Button } from "@/components/ui/button";
import { loadRelease } from "@/lib/data/release";
import { formatBytes } from "@/lib/data/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "download" });
  return { title: t("title") };
}

const KINDS = ["rekap_jenis_ps", "rekaman_lengkap", "ringkasan_provinsi", "ringkasan_kabkota"] as const;

export default async function DownloadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { meta } = loadRelease();
  const files = meta.files.filter((f) => f.path.startsWith("downloads/"));

  return (
    <>
      <PageHeading title={t("download.title")} lead={t("download.lead", { version: meta.version })} />
      <div className="flex flex-col gap-3">
        {meta.status === "draft" && <DataNote>{t("download.draftNote")}</DataNote>}
        <DataNote>{t("download.notRaw")}</DataNote>
      </div>

      <div className="grid items-start gap-x-6 lg:grid-cols-2">
      {KINDS.map((kind) => {
        const group = files.filter((f) => f.path.includes(`_${kind}`));
        if (group.length === 0) return null;
        return (
          <SectionCard
            key={kind}
            id={`unduh-${kind}`}
            title={t(`download.f.${kind}`)}
            description={kind === "rekap_jenis_ps" ? t("download.rekapNote") : undefined}
          >
            <ul className="flex flex-col divide-y rounded-md border">
              {group.map((f) => {
                const name = f.path.replace("downloads/", "");
                const isZip = name.endsWith(".zip");
                const Icon = isZip ? FileArchive : FileSpreadsheet;
                return (
                  <li key={name} className="flex items-center gap-3 px-3 py-2.5">
                    <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-small font-bold break-all">{name}</span>
                      <span className="text-caption text-muted-foreground">
                        {isZip ? t("download.zip") : t("download.xlsx")} · {formatBytes(f.bytes, locale)}
                      </span>
                    </span>
                    <Button asChild variant="outline" size="icon-lg" className="size-10 shrink-0">
                      <a href={`/unduh-berkas/${name}`} download aria-label={`${t("nav.download")} ${name}`}>
                        <Download aria-hidden="true" />
                      </a>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        );
      })}
      </div>
      <p className="mt-6 text-caption text-muted-foreground">{t("download.csvNote")}</p>
    </>
  );
}
