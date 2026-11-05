/**
 * Struktur rilis data PDPSI (dihasilkan pipeline Python, lihat docs/TECHNICAL_PLAN.md §4.2).
 *
 * `source`  : nilai kolom sumber apa adanya, nama kolom asli. Jangan diubah untuk tampilan.
 * `derived` : hasil pengolahan PDPSI; selalu diberi label "olahan PDPSI" di UI.
 * `quality` : hasil pemeriksaan sistem (penanda, referensi duplikat).
 */

export type SourceValue = string | number | null;

export type CalcStatus = "dihitung" | "nilai_negatif" | "komponen_kosong" | "kosong";

export interface ApprovalRecord {
  id: string;
  source: Record<string, SourceValue>;
  derived: {
    sk_normalized: string | null;
    approval_year: number | null;
    scheme_code: string;
    scheme_label_id: string;
    scheme_parent: string | null;
    jenis_ps_code: "HD" | "HKM" | "HTR" | "HA" | "KK";
    jenis_ps_label_id: string;
    record_kind: "persetujuan" | "penetapan";
    province_code: string;
    province_name_official: string;
    regency_code: string;
    regency_name_official: string;
    regency_type: string;
    members_male_plus_female: number | null;
    members_calc_status: CalcStatus;
    area_calc_status: CalcStatus;
  };
  quality: {
    flags: string[];
    duplicate: null | {
      approval_number: string;
      record_count: number;
      type: "identik" | "atribut_berbeda";
      related_ids: string[];
    };
    sk_spacing_variant_ids: string[];
  };
  release_version: string;
}

export interface AggregateBlock {
  records: number;
  area_ha: number;
  area_records_used: number;
  area_records_not_used: Record<string, number>;
  members_male_plus_female: number;
  members_records_used: number;
  members_records_not_used: Record<string, number>;
  members_source_total_column: number | null;
  members_source_total_column_records: number;
}

export interface ControlTotals {
  definitions: Record<string, string>;
  national: AggregateBlock;
  by_jenis_ps: (AggregateBlock & { jenis_ps_code: string })[];
  by_scheme: (AggregateBlock & { scheme_code: string })[];
  by_province_jenis_ps: (AggregateBlock & { province_code: string; jenis_ps_code: string })[];
  by_province: (AggregateBlock & { province_code: string })[];
  by_regency: (AggregateBlock & { province_code: string; regency_code: string })[];
  by_province_scheme: (AggregateBlock & { province_code: string; scheme_code: string })[];
  by_year: (AggregateBlock & { approval_year: number | null })[];
  provinces_with_records: number;
  regencies_with_records: number;
}

export interface AdminArea {
  code: string;
  level: "province" | "regency";
  type: string;
  name: string;
  short_name: string;
  parent_code: string | null;
  slug: string;
}

export interface SchemeInfo {
  scheme_original: string;
  scheme_code: string;
  scheme_label_id: string;
  scheme_label_en: string;
  scheme_parent: string;
  record_kind: "persetujuan" | "penetapan";
  sort_order: string;
  jenis_ps_code: string;
  jenis_ps_label_id: string;
  jenis_ps_label_en: string;
  jenis_ps_order: string;
}

export interface ReleaseMeta {
  version: string;
  status: "draft" | "published";
  built_at: string;
  source: {
    name: string;
    description: string | null;
    url: string | null;
    file_name: string;
    extracted_at: string;
    records_total_reported_by_source: number | null;
  };
  source_fidelity: {
    published_source_columns: string[];
    excluded_columns: string[];
    exclusion_reason: string;
    is_full_raw_copy: boolean;
  };
  counts: { rows: number };
  files: { path: string; bytes: number; sha256: string }[];
}

export interface SiteConfig {
  product: { name_id: string; name_en: string; short_name: string };
  institution: {
    name_id: string | null;
    name_en: string | null;
    logo_path: string | null;
    website_url: string | null;
    contact_email: string | null;
    address: string | null;
  };
  data_license: { name: string | null; url: string | null; terms_id: string | null; terms_en: string | null };
  boundary_data: { publication_allowed: boolean; source_name: string | null; license: string | null };
}

export interface Release {
  meta: ReleaseMeta;
  approvals: ApprovalRecord[];
  byId: Map<string, ApprovalRecord>;
  totals: ControlTotals;
  adminAreas: AdminArea[];
  schemes: SchemeInfo[];
  dir: string;
}
