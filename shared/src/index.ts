// ============================================================================
// shared 패키지 공개 API
// ============================================================================

// --- 타입 ---
export type {
  CveRow,
  CisaCsvItem,
  SeverityStats,
  CveStats,
  UpsertParams,
} from './types';

// --- Clear 영역: 도메인 로직 ---
export { calcSeverity } from './domain/severity';
export { parseCsv } from './domain/csv-parser';

// --- Complicated 영역: 인터페이스 + 어댑터 ---
export type { ICveRepository } from './ports/ICveRepository';
export { SqliteRepository } from './adapters/SqliteRepository';

// --- Chaotic 영역: 장애 격리 ---
export { CircuitBreaker, CircuitBreakerOpenError } from './resilience/circuit-breaker';
export { withRetry } from './resilience/retry';

// --- Complex 영역: 이벤트 기반 분리 ---
export type { CveEventType, CveEvent, CveEventPayloads } from './events/types';
export type { IEventBus } from './events/event-bus';
export { InMemoryEventBus, EventBus } from './events/event-bus';

// --- 편의 팩토리 ---
import { SqliteRepository } from './adapters/SqliteRepository';
import type { ICveRepository } from './ports/ICveRepository';

/** 읽기 전용 Repository 생성 (web, cli, mcp-server용) */
export function createReadOnlyRepository(dbPath: string): ICveRepository {
  return new SqliteRepository(dbPath, { readonly: true });
}

/** 읽기/쓰기 Repository 생성 (crawler용) */
export function createRepository(dbPath: string): ICveRepository {
  return new SqliteRepository(dbPath);
}
