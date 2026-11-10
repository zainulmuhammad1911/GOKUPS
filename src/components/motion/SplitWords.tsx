import { Fragment } from "react";

/**
 * Teks dipecah per kata dan dimunculkan berurutan (gaya SplitText/BlurText React Bits).
 * Spasi tetap teks biasa, sehingga pembaca layar dan salin-tempel membaca kalimat utuh.
 * Animasi hanya lewat CSS (.split-word) dan mati bila gerak dikurangi.
 */
export function SplitWords({ text, offset = 0 }: { text: string; offset?: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="split-word" style={{ ["--i" as string]: i + offset }}>
            {w}
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </>
  );
}
