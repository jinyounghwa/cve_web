import cron from 'node-cron';
import { scrapeCveList, scrapeCveDetail, closeBrowser } from './cisa-scraper';
import { db } from './db';

export function startScheduler() {
  const interval = process.env.CRAWL_INTERVAL_HOURS || '2';
  const cronExpr = `0 */${interval} * * *`;

  console.log(`[CVE-Agent] 크롤러 스케줄러 시작 (${interval}시간 간격)`);

  cron.schedule(cronExpr, async () => {
    await runCrawl();
  });

  // 초기 실행 (1초 후)
  setTimeout(() => runCrawl(), 1000);
}

async function runCrawl() {
  console.log('[CVE-Agent] 크롤링 시작:', new Date().toISOString());

  try {
    const items = await scrapeCveList();
    console.log(`[CVE-Agent] ${items.length}개 CVE 항목 발견`);

    let newCount = 0;
    let skipCount = 0;

    for (const item of items) {
      const exists = db.prepare('SELECT id FROM cve WHERE cve_id = ?').get(item.id);
      if (exists) {
        skipCount++;
        continue;
      }

      try {
        if (item.detailUrl) {
          item.rawSolution = await scrapeCveDetail(item.detailUrl);
        }

        const stmt = db.prepare(`
          INSERT INTO cve (cve_id, title, severity, published_at, detail_url, raw_solution, kor_summary, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        stmt.run(
          item.id,
          item.title,
          item.severity,
          item.publishedAt,
          item.detailUrl,
          item.rawSolution,
          ''
        );

        newCount++;
        console.log(`  ✓ ${item.id} 저장됨`);
      } catch (error) {
        console.error(`  ✗ ${item.id} 처리 실패:`, error);
      }
    }

    console.log(`[CVE-Agent] 크롤링 완료: 신규 ${newCount}개, 기존 ${skipCount}개`);
  } catch (error) {
    console.error('[CVE-Agent] 크롤링 오류:', error);
  }
}

process.on('SIGINT', async () => {
  console.log('[CVE-Agent] 종료 중...');
  await closeBrowser();
  process.exit(0);
});
