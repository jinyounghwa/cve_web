import https from 'https';
import http from 'http';

const CSV_URL = 'https://www.cisa.gov/sites/default/files/csv/known_exploited_vulnerabilities.csv';

export interface CveItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  notes: string;
  cwes: string;
}

export async function fetchCisaCsv(): Promise<string> {
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

/**
 * Proper CSV parser: handles quoted fields with commas and newlines
 */
export function parseCsv(csvText: string): CveItem[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const ch = csvText[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
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
        i++; // skip
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

  // 마지막 필드/행 처리
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  // 첫 번째 행 = 헤더
  const headers = rows[0];
  const expectedHeaders = ['cveID', 'vendorProject', 'product', 'vulnerabilityName', 'dateAdded',
    'shortDescription', 'requiredAction', 'dueDate', 'knownRansomwareCampaignUse', 'notes', 'cwes'];

  const items: CveItem[] = [];
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

/**
 * 복합 기반 위험도 산출:
 * - 랜섬웨어 활용 + 기한 초과 → 긴급
 * - 랜섬웨어 활용 (Known) → 높음
 * - 기한 초과 → 높음
 * - 기한 7일 이내 → 보통
 * - 최근 30일 내 추가 → 보통
 * - 그 외 → 낮음
 */
export function calcSeverity(dueDate: string, dateAdded: string, ransomwareUse: string): string {
  const now = new Date();
  const isRansomware = ransomwareUse === 'Known';

  let dueOverdue = false;
  let dueSoon = false;
  if (dueDate) {
    const due = new Date(dueDate);
    if (!isNaN(due.getTime())) {
      const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      dueOverdue = diffDays < 0;
      dueSoon = diffDays <= 7;
    }
  }

  let recentlyAdded = false;
  if (dateAdded) {
    const added = new Date(dateAdded);
    if (!isNaN(added.getTime())) {
      recentlyAdded = (now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24) <= 30;
    }
  }

  if (isRansomware && dueOverdue) return '긴급';
  if (isRansomware) return '높음';
  if (dueOverdue) return '높음';
  if (dueSoon) return '보통';
  if (recentlyAdded) return '보통';
  return '낮음';
}
