// ============================================================================
// 보고서 생성기
// 커네빈 Complicated 영역: ICveRepository 인터페이스에만 의존
// ============================================================================

import fs from 'fs';
import path from 'path';
import type { ICveRepository } from 'shared';
import type { CveRow } from 'shared';

export interface CVEReport {
  date: string;
  totalCount: number;
  severityCounts: Record<string, number>;
  cves: CveRow[];
}

/**
 * 마크다운 보고서를 생성하여 파일로 저장합니다.
 *
 * @param repo — ICveRepository 인터페이스 (구체적인 DB 구현에 의존하지 않음)
 */
export async function generateReport(repo: ICveRepository): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const reportDir = path.join(__dirname, '..', 'cve-report');

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const allCves = repo.findAll(100000);

  const severityCounts: Record<string, number> = { '긴급': 0, '높음': 0, '보통': 0, '낮음': 0 };
  allCves.forEach(cve => {
    if (severityCounts.hasOwnProperty(cve.severity)) {
      severityCounts[cve.severity]++;
    }
  });

  const md = generateMarkdown({
    date: dateStr,
    totalCount: allCves.length,
    severityCounts,
    cves: allCves,
  });

  const fileName = `CVE-Report-${dateStr}.md`;
  const filePath = path.join(reportDir, fileName);
  fs.writeFileSync(filePath, md, 'utf-8');

  console.log(`\n📄 보고서 생성 완료: ${filePath}`);
  return filePath;
}

function generateMarkdown(report: CVEReport): string {
  const lines: string[] = [];

  lines.push('# CVE 보안 취약점 보고서');
  lines.push('');
  lines.push(`**생성 날짜**: ${report.date}`);
  lines.push(`**생성 시간**: ${new Date().toLocaleString('ko-KR')}`);
  lines.push(`**데이터 출처**: CISA Known Exploited Vulnerabilities Catalog`);
  lines.push('');

  lines.push('## 📊 요약');
  lines.push('');
  lines.push(`**전체 CVE 수**: ${report.totalCount.toLocaleString()}건`);
  lines.push('');
  lines.push('### 위험도별 분포');
  lines.push('');
  lines.push('| 위험도 | 개수 | 비율 |');
  lines.push('|-------|------|------|');
  Object.entries(report.severityCounts).forEach(([severity, count]) => {
    const pct = report.totalCount > 0 ? ((count / report.totalCount) * 100).toFixed(1) : '0.0';
    lines.push(`| ${getSeverityIcon(severity)} ${severity} | ${count.toLocaleString()}건 | ${pct}% |`);
  });
  lines.push('');

  lines.push('## 🚨 우선순위별 조치');
  lines.push('');
  lines.push('### 🔴 즉시 패치 (긴급 — 기한 초과)');
  const critical = report.cves.filter(c => c.severity === '긴급');
  if (critical.length > 0) {
    lines.push(`> ${critical.length}건의 취약점이 패치 기한을 초과했습니다.`);
    lines.push('');
    critical.slice(0, 20).forEach(cve => {
      lines.push(`- **${cve.cve_id}**: ${cve.title}`);
      lines.push(`  - 제품: ${cve.vendor_project || '-'} / ${cve.product || '-'}`);
      lines.push(`  - 기한: ${cve.due_date || '-'} (초과)`);
      lines.push(`  - 조치: ${(cve.raw_solution || '(정보 없음)').substring(0, 150)}`);
    });
    if (critical.length > 20) lines.push(`- ... 외 ${critical.length - 20}건`);
  } else {
    lines.push('_해당 사항 없음_');
  }
  lines.push('');

  lines.push('### 🟠 이번 주 내 패치 (높음)');
  const high = report.cves.filter(c => c.severity === '높음');
  if (high.length > 0) {
    lines.push(`> ${high.length}건`);
    lines.push('');
    high.slice(0, 20).forEach(cve => {
      lines.push(`- **${cve.cve_id}**: ${cve.title}`);
      lines.push(`  - 제품: ${cve.vendor_project || '-'} / ${cve.product || '-'}`);
      lines.push(`  - 기한: ${cve.due_date || '-'}`);
      lines.push(`  - 조치: ${(cve.raw_solution || '(정보 없음)').substring(0, 150)}`);
    });
    if (high.length > 20) lines.push(`- ... 외 ${high.length - 20}건`);
  } else {
    lines.push('_해당 사항 없음_');
  }
  lines.push('');

  lines.push('### 🟡 다음 배포 시 패치 (보통/낮음)');
  const mediumLow = report.cves.filter(c => ['보통', '낮음'].includes(c.severity));
  if (mediumLow.length > 0) {
    lines.push(`> ${mediumLow.length}건`);
    lines.push('');
    mediumLow.slice(0, 10).forEach(cve => {
      lines.push(`- **${cve.cve_id}**: ${cve.title} (${cve.severity})`);
    });
    if (mediumLow.length > 10) lines.push(`- ... 외 ${mediumLow.length - 10}건`);
  } else {
    lines.push('_해당 사항 없음_');
  }
  lines.push('');

  const ransomware = report.cves.filter(c => c.ransomware_use === 'Known');
  if (ransomware.length > 0) {
    lines.push('## ⚠️ 랜섬웨어 캠페인에 사용된 취약점');
    lines.push('');
    lines.push(`> ${ransomware.length}건이 랜섬웨어 캠페인에 활용된 것으로 알려져 있습니다.`);
    lines.push('');
    ransomware.slice(0, 20).forEach(cve => {
      lines.push(`- **${cve.cve_id}**: ${cve.title} (${cve.severity})`);
    });
    if (ransomware.length > 20) lines.push(`- ... 외 ${ransomware.length - 20}건`);
    lines.push('');
  }

  lines.push('## 📋 최근 추가된 CVE (최신순)');
  lines.push('');
  const recent = report.cves.slice(0, 50);
  lines.push('| CVE ID | 제목 | 위험도 | 제품 | 추가일 | 패치기한 |');
  lines.push('|--------|------|--------|------|--------|----------|');
  recent.forEach(cve => {
    const icon = getSeverityIcon(cve.severity);
    const product = `${cve.vendor_project || ''} ${cve.product || ''}`.trim();
    lines.push(`| ${cve.cve_id} | ${cve.title.substring(0, 50)} | ${icon} ${cve.severity} | ${product} | ${cve.published_at} | ${cve.due_date || '-'} |`);
  });
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('*본 보고서는 자동 생성된 문서입니다.*');
  lines.push('*정보 출처: [CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)*');

  return lines.join('\n');
}

function getSeverityIcon(severity: string): string {
  const icons: Record<string, string> = { '긴급': '🔴', '높음': '🟠', '보통': '🟡', '낮음': '🟢' };
  return icons[severity] || '⚪';
}
