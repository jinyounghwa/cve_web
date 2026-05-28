// ============================================================================
// 커네빈 Chaotic 영역 — 서킷 브레이커
// 인과관계 파악 불가 → 의존성 차단 (Circuit Breaker / Fallback)
// ============================================================================

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * 서킷 브레이커 패턴
 *
 * 연속 실패가 임계치를 초과하면 회로를 열어(open) 외부 호출을 차단합니다.
 * 쿨다운 이후 반열림(half-open) 상태에서 단일 시도로 복구 여부를 확인합니다.
 *
 * 사용 예:
 * ```ts
 * const breaker = new CircuitBreaker(3, 30000);
 * const data = await breaker.execute(
 *   () => fetchFromExternalApi(),
 *   () => getLocalFallback(),
 * );
 * ```
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: State = 'CLOSED';

  constructor(
    /** 연속 실패 허용 횟수 (초과 시 OPEN) */
    private readonly threshold: number = 3,
    /** OPEN 상태 유지 시간 (ms) */
    private readonly cooldownMs: number = 30000,
  ) {}

  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    // OPEN 상태 → 쿨다운 체크
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = 'HALF_OPEN';
      } else if (fallback) {
        return fallback();
      } else {
        throw new CircuitBreakerOpenError('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  getState(): State {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
