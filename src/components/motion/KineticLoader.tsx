"use client";

import { useTranslations } from "next-intl";

/**
 * Penanda memuat (gaya kinetic loader): lima batang warna jenis PS yang naik-turun.
 * Komponen klien, jadi bahasa diambil dari penyedia pesan dan tidak menyentuh locale permintaan.
 * Hanya dipakai di halaman yang berat (Peta, Statistik); halaman rekaman tidak memakainya
 * agar status 404 tetap terkirim.
 */
export function KineticLoader() {
  const t = useTranslations("common");
  return (
    <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div aria-hidden="true" className="flex h-12 items-end gap-1.5">
        {["bg-jenis-hd", "bg-jenis-hkm", "bg-jenis-htr", "bg-jenis-ha", "bg-jenis-kk"].map((c, i) => (
          <span key={c} className={`kinetic-bar h-full w-2.5 rounded-full ${c}`} style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <p className="font-mono text-xs text-muted-foreground">{t("loading")}</p>
    </div>
  );
}
