"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Angka yang menghitung naik saat pertama terlihat (gaya CountUp React Bits).
 * Server merender nilai akhir, jadi tanpa JavaScript atau dengan gerak dikurangi angkanya
 * langsung benar. Pembaca layar selalu membaca nilai akhir (teks sr-only); angka yang
 * bergerak disembunyikan dari pembaca layar.
 */
export function CountUp({ value, locale, digits = 0, duration = 1400 }: { value: number; locale: string; digits?: number; duration?: number }) {
  const fmt = (v: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v);
  const final = fmt(value);
  const [shown, setShown] = useState(final);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 4);
          setShown(p < 1 ? fmt(digits ? value * eased : Math.round(value * eased)) : final);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, locale]);

  return (
    <span ref={ref} className="tabular" data-countup={final}>
      <span className="sr-only">{final}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
