#!/usr/bin/env node

import { Command } from 'commander';
import Database from 'better-sqlite3';
import chalk from 'chalk';
import path from 'path';

const dbPath = process.env.CVE_DB_PATH || path.join(__dirname, '..', '..', 'crawler', 'cve.db');
const db: Database.Database = new Database(dbPath, { readonly: true });

const program = new Command();

program
  .name('cve-agent')
  .description('CVE 보안 취약점 조회 CLI')
  .version('1.0.0');

program
  .command('list')
  .description('최신 CVE 목록 조회')
  .option('-n, --count <number>', '조회 개수', '10')
  .option('-s, --severity <level>', '위험도 필터 (긴급/높음/보통/낮음)')
  .action((opts) => {
    let query = 'SELECT cve_id, title, severity, published_at, created_at FROM cve';
    const params: any[] = [];

    if (opts.severity) {
      query += ' WHERE severity = ?';
      params.push(opts.severity);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(opts.count));

    try {
      const rows = db.prepare(query).all(...params) as any[];

      if (rows.length === 0) {
        console.log(chalk.yellow('조회된 CVE가 없습니다.'));
        return;
      }

      rows.forEach(row => {
        const color = severityColor(row.severity);
        const iconMap: Record<string, string> = {
          '긴급': '🔴',
          '높음': '🟠',
          '보통': '🟡',
          '낮음': '🟢'
        };
        const icon = iconMap[row.severity] || '⚪';
        console.log(`${icon} ${(chalk as any)[color](`[${row.severity}]`)} ${row.cve_id} - ${row.title}`);
      });

      console.log(`\n${chalk.gray(`총 ${rows.length}개`)}`);
    } catch (error) {
      console.error(chalk.red('데이터베이스 오류:'), error);
      process.exit(1);
    }
  });

program
  .command('detail <cveId>')
  .description('CVE 상세 및 한국어 패치 가이드')
  .action((cveId) => {
    try {
      const row = db.prepare('SELECT * FROM cve WHERE cve_id = ?').get(cveId) as any;

      if (!row) {
        console.log(chalk.red(`❌ CVE ${cveId}를 찾을 수 없습니다.`));
        process.exit(1);
      }

      console.log(chalk.bold(`\n╔════════════════════════════════════════╗`));
      console.log(chalk.bold(`║ ${row.cve_id.padEnd(36)} ║`));
      console.log(chalk.bold(`╚════════════════════════════════════════╝`));

      console.log(`\n${chalk.gray('📋 제목:')}\n  ${row.title}`);
      console.log(`\n${chalk.gray('⚠️  위험도:')}\n  ${severityBadge(row.severity)}`);
      console.log(`\n${chalk.gray('📅 발행 일자:')}\n  ${row.published_at}`);
      console.log(`\n${chalk.gray('🔧 한국어 패치 가이드:')}\n${row.kor_summary ? `  ${row.kor_summary.split('\n').join('\n  ')}` : '  (정보 없음)'}`);
      console.log(`\n${chalk.gray('🔗 원문:')} ${chalk.underline(chalk.blue(row.detail_url))}`);
      console.log('');
    } catch (error) {
      console.error(chalk.red('데이터베이스 오류:'), error);
      process.exit(1);
    }
  });

program
  .command('export [cveId]')
  .description('JSON 형식으로 출력 (에이전트 연동용)')
  .action((cveId) => {
    try {
      let rows: any[];

      if (cveId) {
        rows = [db.prepare('SELECT * FROM cve WHERE cve_id = ?').get(cveId)];
        if (!rows[0]) {
          console.error(chalk.red(`CVE ${cveId} 를 찾을 수 없습니다.`));
          process.exit(1);
        }
      } else {
        rows = db.prepare('SELECT * FROM cve ORDER BY created_at DESC LIMIT 50').all() as any[];
      }

      console.log(JSON.stringify(rows, null, 2));
    } catch (error) {
      console.error(chalk.red('데이터베이스 오류:'), error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('CVE 통계')
  .action(() => {
    try {
      const total = (db.prepare('SELECT COUNT(*) as count FROM cve').get() as any).count;
      const bySeverity = db.prepare(
        'SELECT severity, COUNT(*) as count FROM cve GROUP BY severity ORDER BY severity'
      ).all() as any[];

      console.log(chalk.bold('\n📊 CVE 통계\n'));
      console.log(`${chalk.cyan('전체 CVE 수')}: ${total}`);
      console.log(`\n${ chalk.gray('위험도별 분포:')}`);

      bySeverity.forEach((row: any) => {
        const iconMap: Record<string, string> = { '긴급': '🔴', '높음': '🟠', '보통': '🟡', '낮음': '🟢' };
        const icon = iconMap[row.severity] || '⚪';
        console.log(`  ${icon} ${row.severity.padEnd(4)} : ${String(row.count).padStart(3)}건`);
      });
      console.log('');
    } catch (error) {
      console.error(chalk.red('데이터베이스 오류:'), error);
      process.exit(1);
    }
  });

function severityColor(s: string): 'red' | 'yellow' | 'green' | 'white' {
  if (s === '긴급') return 'red';
  if (s === '높음') return 'yellow';
  if (s === '보통') return 'green';
  return 'white';
}

function severityBadge(s: string): string {
  const badges: Record<string, any> = {
    '긴급': chalk.bgRed(chalk.white(` 긴급 (Critical) `)),
    '높음': chalk.bgYellow(chalk.black(` 높음 (High) `)),
    '보통': chalk.bgBlue(chalk.white(` 보통 (Medium) `)),
    '낮음': chalk.bgGreen(chalk.white(` 낮음 (Low) `))
  };
  return badges[s] || chalk.gray(`[${s}]`);
}

program.parse();

process.on('uncaughtException', (error) => {
  console.error(chalk.red('오류 발생:'), error);
  process.exit(1);
});
