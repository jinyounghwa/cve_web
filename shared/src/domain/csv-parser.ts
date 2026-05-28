// ============================================================================
// 커네빈 Clear 영역 — CSV 파싱
// 인과관계가 명확 → 트랜잭션 스크립트 패턴
// ============================================================================

import type { CisaCsvItem } from '../types';

/**
 * CSV 파서: 따옴표 필드(쉼표, 줄바꿈 포함)를 올바르게 처리
 */
export function parseCsv(csvText: string): CisaCsvItem[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const ch = csvText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (ch === '\r') {
        i++;
      } else if (ch === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 1 || currentRow[0] !== '') {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
      } else {
        currentField += ch;
        i++;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const items: CisaCsvItem[] = [];
  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    if (!values[0] || !values[0].startsWith('CVE-')) continue;

    items.push({
      cveID: values[0] || '',
      vendorProject: values[1] || '',
      product: values[2] || '',
      vulnerabilityName: values[3] || '',
      dateAdded: values[4] || '',
      shortDescription: values[5] || '',
      requiredAction: values[6] || '',
      dueDate: values[7] || '',
      knownRansomwareCampaignUse: values[8] || '',
      notes: values[9] || '',
      cwes: values[10] || '',
    });
  }

  return items;
}
