// ============================================================================
// 크롤러 스케줄러
// 커네빈 Complex 영역: 이벤트 기반 분리, 헥사고날 아키텍처
// ============================================================================

import path from 'path';
import cron from 'node-cron';
import {
  createRepository,
  calcSeverity,
  parseCsv,
  EventBus,
  type ICveRepository,
  type UpsertParams,
  type CisaCsvItem,
} from 'shared';
import { fetchCisaCsv } from './cisa-scraper';
import { generateReport } from './report-generator';

export interface SchedulerDeps {
  eventBus: EventBus;
  /** 테스트/단독 실행 시 주입 가능 (기본: shared SqliteRepository) */
  repository?: ICveRepository;
}

export function startScheduler(deps: SchedulerDeps) {
  const { eventBus } = deps;
  const interval = process.env.CRAWL_INTERVAL_HOURS || '2';
  const cronExpr = `0 */${interval} * * *`;

  console.log(`[CVE-Agent] 크롤러 스케줄러 시작 (${interval}시간 간격)`);

  cron.schedule(cronExpr, () => runCrawl(deps));

  // 초기 실행 (1초 후)
  setTimeout(() => runCrawl(deps), 1000);
}

export async function runCrawl(deps: SchedulerDeps) {
  const { eventBus } = deps;

  console.log('[CVE-Agent] 크롤링 시작:', new Date().toISOString());
  eventBus.emit('crawl:started');

  try {
    // 1. CSV 다운로드 (Chaotic 영역 — 서킷 브레이커 보호)
    console.log('[CVE-Agent] CISA KEV CSV 다운로드 중...');
    const csvText = await fetchCisaCsv();

    if (!csvText) {
      console.warn('[CVE-Agent] CSV 데이터 없음 (서킷 브레이커 또는 네트워크 장애)');
      eventBus.emit('crawl:error', { reason: 'empty_csv' });
      return;
    }

    console.log(`[CVE-Agent] CSV 다운로드 완료 (${(csvText.length / 1024).toFixed(0)} KB)`);
    eventBus.emit('crawl:csv_downloaded', { size: csvText.length });

    // 2. CSV 파싱 (Clear 영역 — 순수 함수)
    const items = parseCsv(csvText);
    console.log(`[CVE-Agent] ${items.length}개 CVE 항목 파싱 완료`);

    // 3. DB 저장 (Complicated 영역 — 인터페이스 기반)
    const dbPath = process.env.CVE_DB_PATH || path.join(__dirname, '..', 'cve.db');
    const repo = deps.repository ?? createRepository(dbPath);

    const upsertItems: UpsertParams[] = items.map(mapToUpsert);
    const result = repo.upsertMany(upsertItems);

    console.log(`[CVE-Agent] 크롤링 완료: 신규 ${result.newCount}개, 업데이트 ${result.updateCount}개`);
    eventBus.emit('cve:upserted', {
      newCount: result.newCount,
      updateCount: result.updateCount,
    });

    // 4. 보고서 생성 (이벤트 분리 — 실패해도 크롤링에 영향 없음)
    try {
      const reportPath = await generateReport(repo);
      eventBus.emit('report:generated', { path: reportPath });
    } catch (reportError) {
      console.error('[CVE-Agent] 보고서 생성 오류:', reportError);
    }

    eventBus.emit('crawl:completed', {
      total: items.length,
      newCount: result.newCount,
      updateCount: result.updateCount,
    });

    // deps에서 주입받지 않은 자체 생성 repo는 닫기
    if (!deps.repository) repo.close();
  } catch (error) {
    console.error('[CVE-Agent] 크롤링 오류:', error);
    eventBus.emit('crawl:error', { error });
  }
}

/** CisaCsvItem → UpsertParams 매핑 */
function mapToUpsert(item: CisaCsvItem): UpsertParams {
  return {
    cveId: item.cveID,
    title: item.vulnerabilityName || item.cveID,
    severity: calcSeverity(item.dueDate, item.dateAdded, item.knownRansomwareCampaignUse),
    publishedAt: item.dateAdded,
    detailUrl: `https://nvd.nist.gov/vuln/detail/${item.cveID}`,
    rawSolution: item.requiredAction || '',
    korSummary: '',
    vendorProject: item.vendorProject || '',
    product: item.product || '',
    dueDate: item.dueDate || '',
    description: item.shortDescription || '',
    ransomwareUse: item.knownRansomwareCampaignUse || '',
    notes: item.notes || '',
    cwes: item.cwes || '',
  };
}

// 단독 실행 지원
if (require.main === module) {
  const { EventBus } = require('shared');
  const standaloneBus = new EventBus();

  standaloneBus.on('crawl:completed', (e: any) => {
    console.log(`[CVE-Agent] 1회 크롤링 완료: 신규 ${e.data.newCount}, 업데이트 ${e.data.updateCount}`);
  });

  runCrawl({ eventBus: standaloneBus }).then(() => {
    console.log('[CVE-Agent] 종료');
    process.exit(0);
  });
}
