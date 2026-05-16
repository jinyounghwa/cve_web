---
name: cve-security-agent
description: CISA KEV CVE 보안 취약점 자동 수집/기록/패치 시스템. 크롤러, 웹, CLI, MCP 전체 스택 구현 가이드.
---

# CVE Security Agent — SKILL.md

## Architecture Overview

```
[CISA KEV 대시보드] 
     ↓ (Playwright 크롤링, 2~3시간)
[crawler/] → SQLite/PostgreSQL
     ↓ (Claude API 요약)
[web/] Next.js 기록 웹페이지
     ↓
[cli/ + mcp-server/] ← AI 에이전트가 읽어 자동 패치
```

---

## Sprint 1: 크롤러 구현

### 의존성 설치
```bash
mkdir crawler && cd crawler
npm init -y
npm install playwright node-cron better-sqlite3 dotenv axios
npx playwright install chromium
```

### 핵심 파일: `crawler/src/cisa-scraper.ts`
```typescript
import { chromium } from 'playwright';

const TARGET_URL = 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog';

export interface CveItem {
  id: string;           // CVE-2025-XXXXX
  title: string;
  severity: string;     // 위험도: 긴급/높음/보통/낮음
  publishedAt: string;
  detailUrl: string;
  rawSolution: string;  // 영문 해결책 원문
}

export async function scrapeCveList(): Promise<CveItem[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
  
  // CISA KEV 대시보드 구조에 맞게 셀렉터 조정 필요
  // 실제 배포 전 개발자 도구로 DOM 확인 후 업데이트
  const items = await page.evaluate(() => {
    const rows = document.querySelectorAll('.vuln-list-item, tr.cve-row');
    return Array.from(rows).map(row => ({
      id: row.querySelector('.cve-id')?.textContent?.trim() ?? '',
      title: row.querySelector('.cve-title')?.textContent?.trim() ?? '',
      severity: row.querySelector('.severity')?.textContent?.trim() ?? '',
      publishedAt: row.querySelector('.pub-date')?.textContent?.trim() ?? '',
      detailUrl: (row.querySelector('a') as HTMLAnchorElement)?.href ?? '',
      rawSolution: '',
    }));
  });

  await browser.close();
  return items.filter(i => i.id.startsWith('CVE'));
}

export async function scrapeCveDetail(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // 영문 해결책 섹션 추출
  const solution = await page.evaluate(() => {
    const el = document.querySelector('.solution-en, .patch-info, #solution');
    return el?.textContent?.trim() ?? '';
  });
  
  await browser.close();
  return solution;
}
```

### 스케줄러: `crawler/src/scheduler.ts`
```typescript
import cron from 'node-cron';
import { scrapeCveList, scrapeCveDetail } from './cisa-scraper';
import { db } from './db';
import { summarizeWithClaude } from './summarizer';

// 2시간 30분 간격
cron.schedule('0 */2 * * *', async () => {
  console.log('[CVE-Agent] 크롤링 시작:', new Date().toISOString());
  
  const items = await scrapeCveList();
  let newCount = 0;

  for (const item of items) {
    const exists = db.prepare('SELECT id FROM cve WHERE cve_id = ?').get(item.id);
    if (exists) continue;

    // 상세 페이지에서 해결책 수집
    item.rawSolution = await scrapeCveDetail(item.detailUrl);
    
    // Claude API로 한국어 요약
    const korSummary = await summarizeWithClaude(item);

    db.prepare(`
      INSERT INTO cve (cve_id, title, severity, published_at, detail_url, raw_solution, kor_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(item.id, item.title, item.severity, item.publishedAt, item.detailUrl, item.rawSolution, korSummary);

    newCount++;
  }
  
  console.log(`[CVE-Agent] 신규 CVE ${newCount}개 저장`);
});
```

### DB 스키마: `crawler/src/db.ts`
```typescript
import Database from 'better-sqlite3';

export const db = new Database('./cve.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS cve (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cve_id      TEXT UNIQUE NOT NULL,
    title       TEXT,
    severity    TEXT,
    published_at TEXT,
    detail_url  TEXT,
    raw_solution TEXT,
    kor_summary TEXT,
    created_at  TEXT
  );
`);
```

### Claude 요약기: `crawler/src/summarizer.ts`
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function summarizeWithClaude(item: any): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `다음 CVE 보안 취약점 정보를 한국어로 요약해줘.
개발자가 바로 패치 적용할 수 있도록 핵심만 3~5줄로 정리.

CVE ID: ${item.id}
제목: ${item.title}
위험도: ${item.severity}
해결책(영문): ${item.rawSolution}

출력 형식:
- 영향 범위: (어떤 소프트웨어/버전)
- 취약점 유형: (XSS/SQLi/RCE 등)
- 해결 방법: (버전 업그레이드, 설정 변경 등 구체적 조치)
- 우선순위: (즉시/이번 주 내/다음 배포 시)`
    }]
  });

  return (msg.content[0] as any).text;
}
```

---

## Sprint 2: Next.js 기록 웹페이지

### 설치
```bash
npx create-next-app@14 web --typescript --tailwind --app
cd web
npm install better-sqlite3 @types/better-sqlite3
```

### API Route: `web/app/api/cve/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('../crawler/cve.db', { readonly: true });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const severity = searchParams.get('severity');
  const limit = Number(searchParams.get('limit') ?? 20);
  const offset = Number(searchParams.get('offset') ?? 0);

  let query = 'SELECT * FROM cve';
  const params: any[] = [];

  if (severity) {
    query += ' WHERE severity = ?';
    params.push(severity);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}
```

### 웹 페이지 핵심 컴포넌트
```
web/app/
├── page.tsx              # CVE 목록 (테이블 + 필터)
├── cve/[id]/page.tsx     # CVE 상세 + 한국어 요약
└── api/
    ├── cve/route.ts      # 목록 조회
    └── cve/[id]/route.ts # 상세 조회
```

### 위험도별 색상 규칙
```
긴급(Critical) → red-600
높음(High)     → orange-500
보통(Medium)   → yellow-500
낮음(Low)      → green-500
```

---

## Sprint 3: CLI 구현

### 설치
```bash
mkdir cli && cd cli
npm init -y
npm install commander better-sqlite3 chalk
```

### `cli/src/index.ts`
```typescript
import { Command } from 'commander';
import Database from 'better-sqlite3';
import chalk from 'chalk';

const db = new Database('../crawler/cve.db', { readonly: true });
const program = new Command();

program.name('cve-agent').description('CVE 보안 취약점 조회 CLI').version('1.0.0');

// 목록 조회
program
  .command('list')
  .description('최신 CVE 목록 조회')
  .option('-n, --count <number>', '조회 개수', '10')
  .option('-s, --severity <level>', '위험도 필터 (긴급/높음/보통/낮음)')
  .action((opts) => {
    let query = 'SELECT * FROM cve';
    const params: any[] = [];
    if (opts.severity) { query += ' WHERE severity = ?'; params.push(opts.severity); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(opts.count));

    const rows = db.prepare(query).all(...params) as any[];
    rows.forEach(row => {
      const color = severityColor(row.severity);
      console.log(`${chalk[color](`[${row.severity}]`)} ${row.cve_id} - ${row.title}`);
    });
  });

// 상세 조회 + 패치 가이드
program
  .command('detail <cveId>')
  .description('CVE 상세 및 한국어 패치 가이드')
  .action((cveId) => {
    const row = db.prepare('SELECT * FROM cve WHERE cve_id = ?').get(cveId) as any;
    if (!row) { console.log(chalk.red('CVE를 찾을 수 없습니다.')); return; }
    
    console.log(chalk.bold(`\n=== ${row.cve_id} ===`));
    console.log(chalk.gray(row.title));
    console.log(`\n위험도: ${chalk.yellow(row.severity)}`);
    console.log(`\n📋 한국어 패치 가이드:\n${row.kor_summary}`);
    console.log(`\n🔗 원문: ${row.detail_url}`);
  });

// 에이전트용 JSON 출력 (MCP/파이프 활용)
program
  .command('export [cveId]')
  .description('JSON 형식으로 출력 (에이전트 연동용)')
  .action((cveId) => {
    const rows = cveId
      ? [db.prepare('SELECT * FROM cve WHERE cve_id = ?').get(cveId)]
      : db.prepare('SELECT * FROM cve ORDER BY created_at DESC LIMIT 20').all();
    console.log(JSON.stringify(rows, null, 2));
  });

function severityColor(s: string): 'red' | 'yellow' | 'green' | 'white' {
  if (s === '긴급') return 'red';
  if (s === '높음') return 'yellow';
  if (s === '보통') return 'green';
  return 'white';
}

program.parse();
```

### CLI 설치 (전역)
```bash
npm link
cve-agent list
cve-agent detail CVE-2025-12345
cve-agent export | pbcopy   # 에이전트에 붙여넣기
```

---

## Sprint 3: MCP 서버 구현

### 설치
```bash
mkdir mcp-server && cd mcp-server
npm init -y
npm install @modelcontextprotocol/sdk better-sqlite3
```

### `mcp-server/src/index.ts`
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';

const db = new Database('../crawler/cve.db', { readonly: true });
const server = new Server({ name: 'cve-security-agent', version: '1.0.0' }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_recent_cves',
      description: '최근 보안 취약점 목록을 가져옵니다. 프로젝트 보안 패치 적용 전 반드시 확인하세요.',
      inputSchema: {
        type: 'object',
        properties: {
          count: { type: 'number', description: '조회 개수 (기본값: 10)' },
          severity: { type: 'string', enum: ['긴급', '높음', '보통', '낮음'], description: '위험도 필터' }
        }
      }
    },
    {
      name: 'get_cve_detail',
      description: '특정 CVE의 한국어 패치 가이드를 가져옵니다.',
      inputSchema: {
        type: 'object',
        properties: {
          cve_id: { type: 'string', description: 'CVE ID (예: CVE-2025-12345)' }
        },
        required: ['cve_id']
      }
    },
    {
      name: 'get_patch_context',
      description: '현재 프로젝트에 적용해야 할 모든 보안 패치 컨텍스트를 한번에 반환합니다. AI 에이전트의 자동 패치 작업에 사용하세요.',
      inputSchema: {
        type: 'object',
        properties: {
          severity_min: { type: 'string', enum: ['긴급', '높음'], description: '최소 위험도' }
        }
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_recent_cves') {
    const count = (args as any)?.count ?? 10;
    const severity = (args as any)?.severity;
    let query = 'SELECT cve_id, title, severity, published_at, kor_summary FROM cve';
    const params: any[] = [];
    if (severity) { query += ' WHERE severity = ?'; params.push(severity); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(count);
    const rows = db.prepare(query).all(...params);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  }

  if (name === 'get_cve_detail') {
    const row = db.prepare('SELECT * FROM cve WHERE cve_id = ?').get((args as any).cve_id);
    return { content: [{ type: 'text', text: JSON.stringify(row, null, 2) }] };
  }

  if (name === 'get_patch_context') {
    const severity = (args as any)?.severity_min ?? '높음';
    const severities = severity === '긴급' ? ['긴급'] : ['긴급', '높음'];
    const placeholders = severities.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT cve_id, title, severity, kor_summary FROM cve 
       WHERE severity IN (${placeholders}) 
       ORDER BY created_at DESC LIMIT 50`
    ).all(...severities);
    
    const context = `# 현재 적용 필요한 보안 패치 목록\n\n` +
      (rows as any[]).map(r => 
        `## ${r.cve_id} [${r.severity}]\n**${r.title}**\n\n${r.kor_summary}\n`
      ).join('\n---\n\n');
    
    return { content: [{ type: 'text', text: context }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Claude Code에 MCP 등록 (`.claude/settings.json`)
```json
{
  "mcpServers": {
    "cve-security-agent": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

---

## AI 에이전트 자동 패치 사용 예

### 방법 1: CLI + Claude Code
```bash
# 터미널에서 컨텍스트 생성
cve-agent export > /tmp/cve-context.json

# Claude Code에서
claude "cve-context.json 파일을 읽고 이 프로젝트의 package.json을 분석해서
해당되는 취약점을 모두 패치해줘"
```

### 방법 2: MCP로 자동 연동
```
Claude Code 대화:
"cve-security-agent MCP에서 get_patch_context를 호출한 다음
현재 프로젝트에 적용 가능한 패치를 전부 실행해줘"
```

---

## 환경 변수 `.env`
```
ANTHROPIC_API_KEY=sk-ant-...
CVE_DB_PATH=./crawler/cve.db
WEB_PORT=3000
CRAWL_INTERVAL_HOURS=2
```

## 배포 (로컬 운영)
```bash
# 크롤러 데몬 실행
cd crawler && npm run start &

# 웹 실행
cd web && npm run build && npm start &

# MCP 서버는 Claude Code가 자동 실행
```

## 주의사항
- CISA KEV 사이트 구조 변경 시 셀렉터 업데이트 필요
- Playwright 크롤링 시 robots.txt 및 이용약관 준수
- DB 경로는 모든 서비스가 공유하므로 절대경로 권장
