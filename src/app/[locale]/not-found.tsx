import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeading } from "@/components/data/blocks";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <>
      <PageHeading title={t("title")} lead={t("body")} />
      <Link href="/">{t("home")}</Link>
    </>
  );
}
