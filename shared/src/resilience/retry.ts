// ============================================================================
// 커네빈 Chaotic 영역 — 재시도 로직
// 일시적 장애에 대한 지수 백오프 재시도
// ============================================================================

/**
 * 지수 백오프 재시도
 *
 * @param fn 실행할 비동기 함수
 * @param maxRetries 최대 재시도 횟수
 * @param baseDelayMs 첫 재시도 대기 시간 (ms). 이후 지수 증가
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error('Retry failed with unknown error');
}
