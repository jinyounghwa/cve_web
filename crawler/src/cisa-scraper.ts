import { chromium, Browser, Page } from 'playwright';

const TARGET_URL = 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog';

export interface CveItem {
  id: string;
  title: string;
  severity: string;
  publishedAt: string;
  detailUrl: string;
  rawSolution: string;
}

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function scrapeCveList(): Promise<CveItem[]> {
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });

    const items = await page.evaluate(() => {
      const results: any[] = [];

      const rows = document.querySelectorAll('table tbody tr, .vuln-list-item');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, [role="gridcell"]');
        if (cells.length === 0) return;

        let cveId = '';
        let title = '';
        let severity = '';
        let pubDate = '';

        cells.forEach((cell, idx) => {
          const text = cell.textContent?.trim() || '';
          if (text.match(/^CVE-\d{4}-\d{4,}/)) cveId = text;
          if (idx === 0 && !cveId) cveId = text;
          if (idx === 1 && !title) title = text;
          if (text.match(/Critical|High|Medium|Low|긴급|높음|보통|낮음/i)) severity = text;
        });

        const link = row.querySelector('a[href*="/cve/"]') as HTMLAnchorElement;
        const detailUrl = link?.href || '';

        if (cveId && cveId.startsWith('CVE')) {
          results.push({
            id: cveId,
            title: title || cveId,
            severity: severity || 'Unknown',
            publishedAt: pubDate || new Date().toISOString(),
            detailUrl,
            rawSolution: ''
          });
        }
      });

      return results;
    });

    return items;
  } finally {
    await page.close();
  }
}

export async function scrapeCveDetail(url: string): Promise<string> {
  if (!url) return '';

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const solution = await page.evaluate(() => {
      const selectors = [
        '.solution-en',
        '.patch-info',
        '#solution',
        '[class*="solution"]',
        '[class*="remediation"]',
        '[class*="patch"]'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent?.trim()) {
          return el.textContent.trim();
        }
      }

      const allText = document.body.textContent || '';
      const match = allText.match(/(?:Solution|Patch|Remediation|Fix)[\s\S]{0,1000}/i);
      return match ? match[0].substring(0, 500) : '';
    });

    return solution || '';
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
