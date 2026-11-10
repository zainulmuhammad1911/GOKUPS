/** Menu utama, dipakai navbar (klien) dan footer (server). */
export const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/map", key: "map" },
  { href: "/statistics", key: "statistics" },
  { href: "/data", key: "data" },
  { href: "/organizations", key: "organizations" },
  { href: "/download", key: "download" },
  { href: "/about", key: "about" },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
