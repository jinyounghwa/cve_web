#!/usr/bin/env node
// ============================================================================
// CVE Agent CLI
// 커네빈 Complicated 영역: ICveRepository 인터페이스에만 의존
// ============================================================================

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import {
  createReadOnlyRepository,
  type ICveRepository,
  type CveRow,
} from 'shared';

const dbPath = process.env.CVE_DB_PATH || path.join(__dirname, '..', '..', 'crawler', 'cve.db');

// CLI는 프로세스 수명과 동일하게 Repository 유지
// process.exit() 시 자동 해제되므로 명시적 close 불필요
const repo: ICveRepository = createReadOnlyRepository(dbPath);

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
    try {
      const limit = Number(opts.count);
      const rows: CveRow[] = opts.severity
        ? repo.findBySeverity(opts.severity, limit)
        : repo.findAll(limit);

      if (rows.length === 0) {
        console.log(chalk.yellow('조회된 CVE가 없습니다.'));
        return;
      }

      rows.forEach(row => {
        const color = severityColor(row.severity);
        const icon = severityIcon(row.severity);
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
      const row = repo.findById(cveId);

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
      console.log(`\n${chalk.gray('📝 원문 해결책:')}\n${row.raw_solution ? `  ${row.raw_solution.split('\n').join('\n  ').substring(0, 300)}${row.raw_solution.length > 300 ? '...' : ''}` : '  (정보 없음)'}`);
      console.log(`\n${chalk.gray('💡 참고:')} Claude 에이전트가 이 정보를 분석하여 구체적인 패치 가이드를 생성합니다.`);
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
      let rows: CveRow[];

      if (cveId) {
        const found = repo.findById(cveId);
        if (!found) {
          console.error(chalk.red(`CVE ${cveId} 를 찾을 수 없습니다.`));
          process.exit(1);
        }
        rows = [found];
      } else {
        rows = repo.findAll(50);
      }

      console.log(JSON.stringify(rows, null, 2));
    } catch (error) {
      console.error(chalk.red('데이터베이스 오류:'), error);
      process.exit(1);
    }
  });

program
  .command('report [date]')
  .description('크롤러 실행 보고서 조회 (형식: YYYY-MM-DD)')
  .action((date) => {
    const fs = require('fs');
    const path = require('path');

    try {
      const reportDate = date || new Date().toISOString().split('T')[0];
      const reportPath = path.join(__dirname, '..', '..', 'crawler', 'cve-report', `CVE-Report-${reportDate}.md`);

      if (!fs.existsSync(reportPath)) {
        console.log(chalk.red(`❌ 보고서를 찾을 수 없습니다: ${reportDate}`));
        console.log(chalk.gray('  형식: cve-agent report YYYY-MM-DD'));
        process.exit(1);
      }

      const content = fs.readFileSync(reportPath, 'utf-8');
      console.log(content);
    } catch (error) {
      console.error(chalk.red('보고서 조회 오류:'), error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('CVE 통계')
  .action(() => {
    try {
      const { total, stats } = repo.getStats();

      console.log(chalk.bold('\n📊 CVE 통계\n'));
      console.log(`${chalk.cyan('전체 CVE 수')}: ${total}`);
      console.log(`\n${chalk.gray('위험도별 분포:')}`);

      stats.forEach((row: any) => {
        const icon = severityIcon(row.severity);
        console.log(`  ${icon} ${row.severity.padEnd(4)} : ${String(row.count).padStart(3)}건`);
      });
      console.log('');
    } catch (error) {
      console.error(chalk.red('데이터베이스 오류:'), error);
      process.exit(1);
    }
  });

// --- 유틸 함수 ---

function severityColor(s: string): 'red' | 'yellow' | 'green' | 'white' {
  if (s === '긴급') return 'red';
  if (s === '높음') return 'yellow';
  if (s === '보통') return 'green';
  return 'white';
}

function severityIcon(s: string): string {
  const map: Record<string, string> = { '긴급': '🔴', '높음': '🟠', '보통': '🟡', '낮음': '🟢' };
  return map[s] || '⚪';
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
