// ============================================================================
// 커네빈 Complex 영역 — 이벤트 타입 (타입 안전)
// 실행 후 피드백으로 수정 → 완전한 격리 및 비동기 분리
// ============================================================================

export type CveEventType =
  | 'crawl:started'
  | 'crawl:csv_downloaded'
  | 'cve:upserted'
  | 'crawl:completed'
  | 'crawl:error'
  | 'report:generated';

/** 이벤트별 페이로드 타입 맵 */
export interface CveEventPayloads {
  'crawl:started': undefined;
  'crawl:csv_downloaded': { size: number };
  'cve:upserted': { newCount: number; updateCount: number };
  'crawl:completed': { total: number; newCount: number; updateCount: number };
  'crawl:error': { error?: Error; reason?: string };
  'report:generated': { path: string };
}

/** 타입 안전 이벤트 */
export interface CveEvent<T extends CveEventType = CveEventType> {
  type: T;
  timestamp: Date;
  data: CveEventPayloads[T];
}
