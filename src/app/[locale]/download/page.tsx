import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataNote, PageHeading } from "@/components/data/blocks";
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

      {KINDS.map((kind) => {
        const group = files.filter((f) => f.path.includes(`_${kind}`));
        if (group.length === 0) return null;
        return (
          <section key={kind} aria-labelledby={`unduh-${kind}`} className="rule-top mt-10 pt-3">
            <h2 id={`unduh-${kind}`} className="text-h3 font-bold">{t(`download.f.${kind}`)}</h2>
            {kind === "rekap_jenis_ps" && <p className="mt-1 text-small text-ink-muted">{t("download.rekapNote")}</p>}
            <ul className="mt-2 flex flex-col">
              {group.map((f) => {
                const name = f.path.replace("downloads/", "");
                const isZip = name.endsWith(".zip");
                return (
                  <li key={name} className="flex flex-col gap-0.5 border-b border-rule py-2 md:flex-row md:items-baseline md:gap-6">
                    <a href={`/unduh-berkas/${name}`} download className="inline-flex min-h-11 items-center break-all font-bold">
                      {name}
                    </a>
                    <span className="text-small text-ink-muted">
                      {isZip ? t("download.zip") : t("download.xlsx")} · {formatBytes(f.bytes, locale)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="mt-6 text-caption text-ink-muted">{t("download.csvNote")}</p>
    </>
  );
}
