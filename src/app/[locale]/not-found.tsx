import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { House } from "lucide-react";
import { PageHeading } from "@/components/data/blocks";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <>
      <PageHeading title={t("title")} lead={t("body")} />
      <Button asChild size="lg" className="h-11 px-4 text-small">
        <Link href="/">
          <House aria-hidden="true" />
          {t("home")}
        </Link>
      </Button>
    </>
  );
}
