// ============================================================================
// CVE Security Agent — 공유 타입 정의
// 커네빈 Clear 영역: 인과관계 명확, 타이트 커플링 허용
// ============================================================================

/** DB에서 조회된 CVE 레코드 */
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

/** CISA KEV CSV 원본 항목 */
export interface CisaCsvItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  notes: string;
  cwes: string;
}

/** 위험도별 통계 */
export interface SeverityStats {
  severity: string;
  count: number;
}

/** CVE 전체 통계 */
export interface CveStats {
  total: number;
  stats: SeverityStats[];
}

/** 크롤링 Upsert 파라미터 */
export interface UpsertParams {
  cveId: string;
  title: string;
  severity: string;
  publishedAt: string;
  detailUrl: string;
  rawSolution: string;
  korSummary: string;
  vendorProject: string;
  product: string;
  dueDate: string;
  description: string;
  ransomwareUse: string;
  notes: string;
  cwes: string;
}
