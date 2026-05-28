// ============================================================================
// Web 타입 정의 — shared 패키지에서 재export
// Next.js 번들링 특성상 shared를 정적 import하면 빌드 오류가 발생할 수 있어
// API 라우트에서는 getRepository()로 간접 사용, 프론트엔드 컴포넌트에서는
// 이 로컬 타입을 사용합니다.
//
// ⚠️ shared/src/types.ts 와 항상 동기화되어야 합니다.
// ============================================================================

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
