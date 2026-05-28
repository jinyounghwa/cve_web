import { describe, it, expect, vi } from 'vitest';
import { InMemoryEventBus } from './event-bus';

describe('Complex Domain — InMemoryEventBus', () => {
  it('should deliver event payloads to subscribed handlers', () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    bus.on('crawl:csv_downloaded', handler);
    bus.emit('crawl:csv_downloaded', { size: 1024 });

    expect(handler).toHaveBeenCalledTimes(1);
    const deliveredEvent = handler.mock.calls[0][0];
    expect(deliveredEvent.type).toBe('crawl:csv_downloaded');
    expect(deliveredEvent.data.size).toBe(1024);
    expect(deliveredEvent.timestamp).toBeInstanceOf(Date);
  });

  it('should unsubscribe handlers when off is called', () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    bus.on('crawl:started', handler);
    bus.emit('crawl:started', undefined);
    expect(handler).toHaveBeenCalledTimes(1);

    bus.off('crawl:started', handler);
    bus.emit('crawl:started', undefined);
    expect(handler).toHaveBeenCalledTimes(1); // 여전히 1회
  });

  it('should isolate handler errors and execute subsequent handlers', () => {
    const bus = new InMemoryEventBus();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const buggyHandler = () => {
      throw new Error('Something went wrong in handler');
    };
    const fineHandler = vi.fn();

    bus.on('crawl:completed', buggyHandler);
    bus.on('crawl:completed', fineHandler);

    // 실행 시 buggyHandler가 에러를 던져도 fineHandler는 실행되어야 하며, emit 호출처에 에러가 전파되지 않아야 함
    expect(() => {
      bus.emit('crawl:completed', { total: 10, newCount: 2, updateCount: 1 });
    }).not.toThrow();

    expect(fineHandler).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  it('should record event history as telemetry', () => {
    const bus = new InMemoryEventBus();
    expect(bus.getHistory()).toHaveLength(0);

    bus.emit('crawl:started', undefined);
    bus.emit('crawl:csv_downloaded', { size: 500 });

    const history = bus.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].type).toBe('crawl:started');
    expect(history[1].type).toBe('crawl:csv_downloaded');
  });

  it('should cap event history size at max limit (100)', () => {
    const bus = new InMemoryEventBus();
    
    // 110개 이벤트 발행
    for (let i = 0; i < 110; i++) {
      bus.emit('crawl:started', undefined);
    }

    // 히스토리 크기는 100개로 캡핑
    expect(bus.getHistory()).toHaveLength(100);
  });

  it('should clear history and subscribers on clear/clearHistory', () => {
    const bus = new InMemoryEventBus();
    bus.emit('crawl:started', undefined);
    expect(bus.getHistory()).toHaveLength(1);

    bus.clearHistory();
    expect(bus.getHistory()).toHaveLength(0);

    const handler = vi.fn();
    bus.on('crawl:started', handler);
    bus.emit('crawl:started', undefined);
    expect(handler).toHaveBeenCalledTimes(1);

    bus.clear();
    expect(bus.getHistory()).toHaveLength(0);
    bus.emit('crawl:started', undefined);
    expect(handler).toHaveBeenCalledTimes(1); // clear 이후이므로 실행되지 않음
  });
});
