// ============================================================================
// CISA KEV CSV Fetcher
// 커네빈 Chaotic 영역: 네트워크 호출 → 서킷 브레이커 + 재시도로 장애 격리
// ============================================================================

import https from 'https';
import http from 'http';
import { CircuitBreaker, withRetry } from 'shared';

const CSV_URL =
  'https://www.cisa.gov/sites/default/files/csv/known_exploited_vulnerabilities.csv';

/** CISA CSV 다운로드 서킷 브레이커 (3회 연속 실패 시 60초 차단) */
const breaker = new CircuitBreaker(3, 60000);

/**
 * CISA KEV CSV를 다운로드합니다.
 * 서킷 브레이커와 재시도 로직으로 네트워크 장애를 격리합니다.
 */
export async function fetchCisaCsv(): Promise<string> {
  return breaker.execute(
    () => withRetry(fetchCsvOverHttp, 3, 2000),
    () => {
      console.warn('[CVE-Agent] CISA CSV 서킷 브레이커 OPEN — 빈 데이터 반환');
      return '';
    },
  );
}

/** 내부: HTTP(S) 요청으로 CSV 다운로드 (리다이렉트 처리) */
function fetchCsvOverHttp(): Promise<string> {
  return new Promise((resolve, reject) => {
    const doRequest = (url: string, redirectCount = 0) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));

      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const location = res.headers.location;
          if (location) {
            res.resume();
            return doRequest(location, redirectCount + 1);
          }
        }
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    };
    doRequest(CSV_URL);
  });
}
