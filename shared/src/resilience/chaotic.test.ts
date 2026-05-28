import { describe, it, expect, vi } from 'vitest';
import { CircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker';
import { withRetry } from './retry';

describe('Chaotic Domain — CircuitBreaker', () => {
  it('should execute successfully and remain CLOSED under normal conditions', async () => {
    const breaker = new CircuitBreaker(3, 100); // threshold: 3, cooldown: 100ms
    const fn = vi.fn().mockResolvedValue('success');

    const result = await breaker.execute(fn);
    expect(result).toBe('success');
    expect(breaker.getState()).toBe('CLOSED');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should transition to OPEN after threshold failures and trigger fallback', async () => {
    const breaker = new CircuitBreaker(2, 100); // threshold: 2
    const errorFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const fallbackFn = vi.fn().mockReturnValue('fallback');

    // 1st failure
    await expect(breaker.execute(errorFn)).rejects.toThrow('Network error');
    expect(breaker.getState()).toBe('CLOSED');

    // 2nd failure -> transitions to OPEN
    await expect(breaker.execute(errorFn)).rejects.toThrow('Network error');
    expect(breaker.getState()).toBe('OPEN');

    // 3rd call -> should trigger fallback immediately without calling errorFn
    const result = await breaker.execute(errorFn, fallbackFn);
    expect(result).toBe('fallback');
    expect(breaker.getState()).toBe('OPEN');
    expect(errorFn).toHaveBeenCalledTimes(2); // Only called twice during the failures
    expect(fallbackFn).toHaveBeenCalledTimes(1);
  });

  it('should throw CircuitBreakerOpenError in OPEN state if no fallback is provided', async () => {
    const breaker = new CircuitBreaker(1, 100);
    const errorFn = () => Promise.reject(new Error('Fail'));

    await expect(breaker.execute(errorFn)).rejects.toThrow('Fail');
    expect(breaker.getState()).toBe('OPEN');

    await expect(breaker.execute(errorFn)).rejects.toThrow(CircuitBreakerOpenError);
  });

  it('should transition to HALF_OPEN after cooldown and CLOSED on success', async () => {
    const breaker = new CircuitBreaker(1, 50); // cooldown: 50ms
    const errorFn = vi.fn().mockRejectedValue(new Error('Fail'));
    const successFn = vi.fn().mockResolvedValue('recovered');

    await expect(breaker.execute(errorFn)).rejects.toThrow('Fail');
    expect(breaker.getState()).toBe('OPEN');

    // Wait for cooldown
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Next call should run in HALF_OPEN. If it succeeds, circuit resets to CLOSED.
    const result = await breaker.execute(successFn);
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should transition back to OPEN if execution fails in HALF_OPEN', async () => {
    const breaker = new CircuitBreaker(1, 50);
    const errorFn = vi.fn().mockRejectedValue(new Error('Fail'));

    await expect(breaker.execute(errorFn)).rejects.toThrow('Fail');
    expect(breaker.getState()).toBe('OPEN');

    // Wait for cooldown
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Next call runs in HALF_OPEN. It fails, so state returns to OPEN.
    await expect(breaker.execute(errorFn)).rejects.toThrow('Fail');
    expect(breaker.getState()).toBe('OPEN');
  });
});

describe('Chaotic Domain — withRetry', () => {
  it('should return result if fn succeeds immediately', async () => {
    const fn = vi.fn().mockResolvedValue('data');
    const result = await withRetry(fn, 3, 5);
    expect(result).toBe('data');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed if subsequent attempt works', async () => {
    let attempts = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Transient error');
      }
      return 'recovered-data';
    });

    const result = await withRetry(fn, 3, 5); // delay base: 5ms
    expect(result).toBe('recovered-data');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw last error when all retries are exhausted', async () => {
    const errorFn = vi.fn().mockRejectedValue(new Error('Persistent error'));

    await expect(withRetry(errorFn, 3, 5)).rejects.toThrow('Persistent error');
    expect(errorFn).toHaveBeenCalledTimes(3);
  });
});
