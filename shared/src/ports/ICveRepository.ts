// ============================================================================
// 커네빈 Complicated 영역 — Repository 인터페이스
// 외부 모듈은 구체적인 구현이 아닌 '인터페이스'에만 의존
// 전략 패턴 + 의존성 주입 + 레이어드 아키텍처
// ============================================================================

import type { CveRow, CveStats, UpsertParams } from '../types';

/**
 * CVE 데이터 저장소 인터페이스
 *
 * 모든 모듈(crawler, web, cli, mcp-server)은 이 인터페이스에만 의존합니다.
 * 실제 SQLite 구현은 adapters/SqliteRepository.ts 에서 담당합니다.
 * 향후 PostgreSQL, REST API 등으로 교체 가능합니다.
 */
export interface ICveRepository {
  /** 전체 CVE 조회 (최신순) */
  findAll(limit: number): CveRow[];

  /** 특정 위험도 CVE 조회 */
  findBySeverity(severity: string, limit: number): CveRow[];

  /** 여러 위험도 CVE 조회 */
  findBySeverities(severities: string[], limit: number): CveRow[];

  /** CVE ID로 단건 조회 */
  findById(cveId: string): CveRow | undefined;

  /** 통계 조회 */
  getStats(): CveStats;

  /** 전체 건수 */
  count(): number;

  /** 단건 Upsert (신규 여부 반환) */
  upsert(item: UpsertParams): { isNew: boolean };

  /** 다건 Upsert (트랜잭션) */
  upsertMany(items: UpsertParams[]): { newCount: number; updateCount: number };

  /** 연결 종료 */
  close(): void;
}
