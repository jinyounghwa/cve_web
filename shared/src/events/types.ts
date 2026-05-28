// ============================================================================
// 커네빈 Complex 영역 — 이벤트 타입
// 실행 후 피드백으로 수정 → 완전한 격리 및 비동기 분리
// ============================================================================

export type CveEventType =
  | 'crawl:started'
  | 'crawl:csv_downloaded'
  | 'cve:upserted'
  | 'crawl:completed'
  | 'crawl:error'
  | 'report:generated';

export interface CveEvent {
  type: CveEventType;
  timestamp: Date;
  data?: any;
}
