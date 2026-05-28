// ============================================================================
// CVE Agent — 크롤러 진입점
// 커네빈 Complex 영역: 이벤트 버스로 모듈 간 결합도 분리
// ============================================================================

import dotenv from 'dotenv';
import { InMemoryEventBus } from 'shared';
import type { IEventBus } from 'shared';
import { startScheduler } from './scheduler';

dotenv.config();

// 이벤트 버스 생성 (시스템 전역 공유)
const eventBus: IEventBus = new InMemoryEventBus();

// 이벤트 구독 — 로깅
eventBus.on('crawl:started', () => {
  console.log('[Event] 크롤링 시작');
});

eventBus.on('crawl:csv_downloaded', (e) => {
  console.log(`[Event] CSV 다운로드: ${(e.data.size / 1024).toFixed(0)} KB`);
});

eventBus.on('cve:upserted', (e) => {
  console.log(`[Event] DB 저장 완료: 신규 ${e.data.newCount}, 업데이트 ${e.data.updateCount}`);
});

eventBus.on('crawl:completed', (e) => {
  console.log(`[Event] 크롤링 완료: 총 ${e.data.total}건`);
});

eventBus.on('report:generated', (e) => {
  console.log(`[Event] 보고서 생성: ${e.data.path}`);
});

eventBus.on('crawl:error', (e) => {
  console.error(`[Event] 크롤링 오류:`, e.data);
});

// 스케줄러 시작
startScheduler({ eventBus });

console.log('[CVE-Agent] 크롤러 서비스 실행 중... (CTRL+C로 종료)');
