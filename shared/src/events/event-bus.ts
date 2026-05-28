// ============================================================================
// 커네빈 Complex 영역 — 이벤트 버스
// 호출 주체와 수행 주체 간의 시공간적 의존성을 완전히 끊어냄
// ============================================================================

import type { CveEvent, CveEventType } from './types';

type EventHandler = (event: CveEvent) => void;

/**
 * 심플 이벤트 버스
 *
 * 모듈 간 직접 호출 대신 이벤트로 소통합니다.
 * 향후 Redis Pub/Sub, Kafka 등으로 교체 가능합니다.
 *
 * 사용 예:
 * ```ts
 * const bus = new EventBus();
 * bus.on('crawl:completed', (e) => console.log('완료:', e.data));
 * bus.emit('crawl:completed', { newCount: 5, updateCount: 10 });
 * ```
 */
export class EventBus {
  private handlers = new Map<CveEventType, EventHandler[]>();

  on(eventType: CveEventType, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  off(eventType: CveEventType, handler: EventHandler): void {
    const existing = this.handlers.get(eventType);
    if (existing) {
      this.handlers.set(
        eventType,
        existing.filter(h => h !== handler),
      );
    }
  }

  emit(eventType: CveEventType, data?: any): void {
    const event: CveEvent = { type: eventType, timestamp: new Date(), data };
    const handlers = this.handlers.get(eventType) ?? [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] handler error on "${eventType}":`, error);
      }
    }
  }

  /** 등록된 핸들러 전체 제거 */
  clear(): void {
    this.handlers.clear();
  }
}
