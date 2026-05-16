// Type definitions for CVE data
export interface CveRow {
  id: number;
  cve_id: string;
  title: string;
  severity: string;
  published_at: string;
  detail_url: string;
  raw_solution: string;
  kor_summary: string | null;
  created_at: string;
  // Extended fields (added in schema v2)
  vendor_project?: string;
  product?: string;
  due_date?: string;
  description?: string;
  ransomware_use?: string;
  notes?: string;
  cwes?: string;
}

export interface SeverityStats {
  severity: string;
  count: number;
}
