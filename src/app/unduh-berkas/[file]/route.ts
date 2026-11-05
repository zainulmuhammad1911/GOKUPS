import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadRelease } from "@/lib/data/release";

/**
 * Menyajikan file unduhan rilis aktif. Hanya nama file yang tercantum di manifes
 * release.json (folder downloads/) yang dilayani; folder internal/ tidak pernah bisa dibaca.
 */
const TYPES: Record<string, string> = {
  ".zip": "application/zip",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const { meta, dir } = loadRelease();
  const entry = meta.files.find((f) => f.path === `downloads/${file}`);
  const type = TYPES[path.extname(file)];
  if (!entry || !type || file.includes("/") || file.includes("..")) {
    return new Response("Not found", { status: 404 });
  }
  const body = await readFile(path.join(dir, "downloads", file));
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${file}"`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
