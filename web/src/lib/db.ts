// Type definitions for CVE data
// shared 패키지와 동일한 타입 (Next.js 번들링 이슈로 로컬 유지)
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
