"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChartColumnBig, Download, House, Info, Map as MapIcon, Table2, UsersRound } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const EXPLORE = [
  { href: "/", key: "home", icon: House },
  { href: "/map", key: "map", icon: MapIcon },
  { href: "/statistics", key: "statistics", icon: ChartColumnBig },
  { href: "/data", key: "data", icon: Table2 },
  { href: "/organizations", key: "organizations", icon: UsersRound },
] as const;
const INFO = [
  { href: "/download", key: "download", icon: Download },
  { href: "/about", key: "about", icon: Info },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  productName,
  shortName,
  version,
  draft,
  extracted,
  extractedLabel,
}: {
  productName: string;
  shortName: string;
  version: string;
  draft: boolean;
  extracted: string;
  extractedLabel: string;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  // Menu laci di ponsel/tablet ditutup setelah pindah halaman.
  useEffect(() => setOpenMobile(false), [pathname, setOpenMobile]);

  const group = (label: string, items: typeof EXPLORE | typeof INFO) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton asChild isActive={active} size="lg" className="h-10 text-[0.9375rem]">
                  <Link href={item.href} aria-current={active ? "page" : undefined}>
                    <item.icon aria-hidden="true" />
                    <span>{t(`nav.${item.key}`)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar mobileTitle={t("nav.label")}>
      <SidebarHeader className="px-4 pt-5 pb-3">
        <Link href="/" className="flex flex-col gap-0.5 text-sidebar-foreground no-underline" data-slot="brand">
          {/* Logo institusi hanya tampil bila sudah ditetapkan di config/site.json (K9). */}
          <span className="text-xl font-bold tracking-tight text-primary">{shortName}</span>
          <span className="text-xs leading-snug text-muted-foreground">{productName}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={t("nav.label")}>
          {group(t("nav.groupExplore"), EXPLORE)}
          {group(t("nav.groupInfo"), INFO)}
        </nav>
      </SidebarContent>
      <SidebarFooter className="gap-1 px-4 pb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="tabular">{t("common.releaseShort", { version })}</span>
          {draft && <Badge variant="outline" className="border-earth text-earth">{t("common.draftBadge")}</Badge>}
        </span>
        <span>
          {extractedLabel}: {extracted}
        </span>
      </SidebarFooter>
    </Sidebar>
  );
}
