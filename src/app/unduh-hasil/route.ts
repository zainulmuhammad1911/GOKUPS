import { loadExportSchema, loadRelease, loadSiteConfig } from "@/lib/data/release";
import { applyQuery, parseQuery, queryContext } from "@/lib/data/query";
import { buildCsvZip, buildXlsx, describeQuery, dictionaryRows, exportTable, metadataLines } from "@/lib/data/export";

/**
 * Unduhan rekaman sesuai filter halaman Data (PRD §6.6). Parameter filter sama dengan /data;
 * rekaman diambil dengan fungsi applyQuery yang sama, jadi isi file = isi tabel.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  if (format !== "csv" && format !== "xlsx") return new Response("format harus csv atau xlsx", { status: 400 });

  const { meta, approvals, adminAreas, schemes } = loadRelease();
  const schema = loadExportSchema();
  const site = loadSiteConfig();
  const ctx = queryContext(adminAreas, approvals, Object.keys(schema.flag_docs));
  const params = new URLSearchParams(url.searchParams);
  params.delete("format");
  params.delete("page");
  const { query } = parseQuery(params, ctx);
  const records = applyQuery(approvals, { ...query, page: 1 });
  const table = exportTable(records, meta, schema);
  const dictionary = dictionaryRows(meta, schema);
  const filter = describeQuery(query, adminAreas, schemes, schema);
  const base = `datakups_${meta.version}_hasil_filter`;

  if (format === "csv") {
    const body = buildCsvZip(
      table,
      (neutralized) => metadataLines(meta, site, schema, filter, records.length, neutralized),
      dictionary,
      schema.texts.csv_format,
      `${base}.csv`,
    );
    return new Response(body.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${base}_csv.zip"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const body = await buildXlsx(table, metadataLines(meta, site, schema, filter, records.length, 0), dictionary);
  return new Response(body.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
