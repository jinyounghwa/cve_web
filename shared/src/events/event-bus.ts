// ============================================================================
// 커네빈 Complex 영역 — 이벤트 버스 인터페이스 + 구현
// 호출 주체와 수행 주체 간의 시공간적 의존성을 완전히 끊어냄
// ============================================================================

import type { CveEvent, CveEventType, CveEventPayloads } from './types';

/**
 * 이벤트 버스 인터페이스
 *
 * Complex 영역에서는 구체 구현이 아닌 이 인터페이스에만 의존합니다.
 * 향후 Redis Pub/Sub, Kafka 등으로 교체 가능합니다.
 */
export interface IEventBus {
  on<T extends CveEventType>(eventType: T, handler: (event: CveEvent<T>) => void): void;
  off<T extends CveEventType>(eventType: T, handler: (event: CveEvent<T>) => void): void;
  emit<T extends CveEventType>(eventType: T, data: CveEventPayloads[T]): void;
  clear(): void;
}

// ============================================================================
// 구현체: 심플 인메모리 이벤트 버스
// ============================================================================

type AnyHandler = (event: CveEvent<any>) => void;

/**
 * 인메모리 이벤트 버스
 *
 * 모듈 간 직접 호출 대신 이벤트로 소통합니다.
 * 단일 프로세스 내에서만 동작합니다.
 *
 * 사용 예:
 * ```ts
 * const bus: IEventBus = new InMemoryEventBus();
 * bus.on('crawl:completed', (e) => console.log('완료:', e.data.newCount));
 * bus.emit('crawl:completed', { total: 100, newCount: 5, updateCount: 10 });
 * ```
 */
export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<CveEventType, AnyHandler[]>();

  on<T extends CveEventType>(eventType: T, handler: (event: CveEvent<T>) => void): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler as AnyHandler);
    this.handlers.set(eventType, existing);
  }

  off<T extends CveEventType>(eventType: T, handler: (event: CveEvent<T>) => void): void {
    const existing = this.handlers.get(eventType);
    if (existing) {
      this.handlers.set(
        eventType,
        existing.filter(h => h !== handler),
      );
    }
  }

  emit<T extends CveEventType>(eventType: T, data: CveEventPayloads[T]): void {
    const event: CveEvent<T> = { type: eventType, timestamp: new Date(), data };
    const handlers = this.handlers.get(eventType) ?? [];
    for (const handler of handlers) {
      try {
        handler(event as CveEvent<any>);
      } catch (error) {
        console.error(`[EventBus] handler error on "${eventType}":`, error);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

/** @deprecated InMemoryEventBus를 사용하세요. 향후 제거 예정. */
export class EventBus extends InMemoryEventBus {}
