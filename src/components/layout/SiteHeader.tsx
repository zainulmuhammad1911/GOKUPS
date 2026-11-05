import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadSiteConfig } from "@/lib/data/release";
import { SiteNav } from "./SiteNav";

export async function SiteHeader() {
  const t = await getTranslations("home");
  const site = loadSiteConfig();
  return (
    <header className="relative border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-2 md:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-3 text-ink no-underline">
          {/* Logo institusi hanya tampil bila sudah ditetapkan di config/site.json (K9). */}
          <span className="text-h3 font-bold tracking-tight">{site.product.short_name}</span>
          <span className="hidden max-w-56 text-caption leading-tight text-ink-muted sm:block">{t("title")}</span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
