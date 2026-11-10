import type { ReactNode } from "react";

/** Transisi masuk setiap pindah halaman (CSS .page-enter, mati bila gerak dikurangi). */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
