import cron from 'node-cron';
import { fetchCisaCsv, parseCsv, calcSeverity } from './cisa-scraper';
import { db } from './db';
import { generateReport } from './report-generator';

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

export async function runCrawl() {
  console.log('[CVE-Agent] 크롤링 시작:', new Date().toISOString());

  try {
    // 1. CSV 다운로드
    console.log('[CVE-Agent] CISA KEV CSV 다운로드 중...');
    const csvText = await fetchCisaCsv();
    console.log(`[CVE-Agent] CSV 다운로드 완료 (${(csvText.length / 1024).toFixed(0)} KB)`);

    // 2. CSV 파싱
    const items = parseCsv(csvText);
    console.log(`[CVE-Agent] ${items.length}개 CVE 항목 파싱 완료`);

    // 3. DB 저장 (upsert)
    let newCount = 0;
    let updateCount = 0;
    let skipCount = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO cve (cve_id, title, severity, published_at, detail_url, raw_solution, kor_summary,
                       vendor_project, product, due_date, description, ransomware_use, notes, cwes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(cve_id) DO UPDATE SET
        title = excluded.title,
        severity = excluded.severity,
        published_at = excluded.published_at,
        raw_solution = excluded.raw_solution,
        vendor_project = excluded.vendor_project,
        product = excluded.product,
        due_date = excluded.due_date,
        description = excluded.description,
        ransomware_use = excluded.ransomware_use,
        notes = excluded.notes,
        cwes = excluded.cwes
    `);

    const checkExisting = db.prepare('SELECT id FROM cve WHERE cve_id = ?');

    const insertMany = db.transaction(() => {
      for (const item of items) {
        if (!item.cveID || !item.cveID.startsWith('CVE-')) continue;

        const severity = calcSeverity(item.dueDate, item.dateAdded, item.knownRansomwareCampaignUse);
        const cveUrl = `https://nvd.nist.gov/vuln/detail/${item.cveID}`;
        const exists = checkExisting.get(item.cveID);

        upsertStmt.run(
          item.cveID,
          item.vulnerabilityName || item.cveID,
          severity,
          item.dateAdded,
          cveUrl,
          item.requiredAction || '',
          '',  // kor_summary
          item.vendorProject || '',
          item.product || '',
          item.dueDate || '',
          item.shortDescription || '',
          item.knownRansomwareCampaignUse || '',
          item.notes || '',
          item.cwes || '',
        );

        if (exists) {
          updateCount++;
        } else {
          newCount++;
        }
      }
    });

    insertMany();

    console.log(`[CVE-Agent] 크롤링 완료: 신규 ${newCount}개, 업데이트 ${updateCount}개`);

    // 4. 보고서 생성
    try {
      await generateReport();
    } catch (reportError) {
      console.error('[CVE-Agent] 보고서 생성 오류:', reportError);
    }
  } catch (error) {
    console.error('[CVE-Agent] 크롤링 오류:', error);
  }
}

// 단독 실행 지원
if (require.main === module) {
  runCrawl().then(() => {
    console.log('[CVE-Agent] 1회 크롤링 완료');
    process.exit(0);
  });
}
