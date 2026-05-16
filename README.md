# CVE Security Agent

> 보안 취약점을 자동으로 감지하고, 기록하고, AI가 직접 패치한다

![CVE Security Agent](https://img.shields.io/badge/status-active-brightgreen)

## 개요

**CVE Security Agent**는 CISA KEV(Known Exploited Vulnerabilities) 대시보드에서 신규 보안 취약점을 주기적으로 수집하여:

1. **자동 저장** — 수집된 취약점 정보(원문 영문 해결책 포함)를 SQLite DB에 저장
2. **웹 대시보드** — Next.js 기반 다크 테마 대시보드로 실시간 모니터링
3. **CLI 조회** — `cve-agent list`, `cve-agent detail`, `cve-agent report` 등으로 취약점 조회
4. **MCP 서버** — Claude Code 등 AI 에이전트가 취약점 정보를 읽고 자동 패치 실행

## 주요 기능

### ✅ Sprint 1: 크롤러
- CISA KEV 데이터 수집 (HTTPS/CSV 기반)
- 원본 정보 SQLite DB 저장
- 마크다운 보고서 자동 생성
- 실행 시 즉시 크롤링 및 설정 가능한 스케줄러 (node-cron)

### ✅ Sprint 2: 웹 대시보드
- **보안 대시보드** — 전체 통계, 위험도 분포, 최근 CVE 현황
- **CVE 목록** — 전체 조회, 검색, 위험도 필터, 페이지네이션
- **CVE 상세** — 개별 취약점 상세 정보, 원문 해결책, 한국어 요약
- **보고서 뷰어** — 날짜별 마크다운 보고서 조회 (react-markdown)
- **다크 테마** — 글래스모피즘 기반 세련된 보안 대시보드 UI

### ✅ Sprint 3: CLI & MCP
- **CLI**: `cve-agent` 명령어 (list, detail, stats, report, export)
- **MCP 서버**: Claude Code 연동용 3개 도구
  - `get_recent_cves` — 최신 CVE 목록
  - `get_cve_detail` — 특정 CVE 상세 정보
  - `get_patch_context` — AI가 분석할 패치 컨텍스트

## 디렉토리 구조

```
cve-security-agent/
├── crawler/          # Node.js 기반 데이터 수집, 스케줄러, 보고서 생성
│   ├── src/
│   │   ├── cisa-scraper.ts      # CISA KEV CSV 데이터 다운로드 및 파싱
│   │   ├── db.ts                # SQLite 스키마 및 초기화
│   │   ├── scheduler.ts         # 실행 시 즉시 크롤링 및 설정 가능한 스케줄러
│   │   ├── report-generator.ts  # 마크다운 보고서 자동 생성
│   │   └── index.ts             # 진입점
│   ├── cve.db                   # SQLite 데이터베이스
│   └── cve-report/              # 자동 생성된 마크다운 보고서
├── web/              # Next.js 웹 대시보드
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # 대시보드 메인
│   │   │   ├── cves/            # CVE 목록 + 상세
│   │   │   ├── reports/         # 보고서 뷰어
│   │   │   └── api/             # REST API (cves, stats, reports)
│   │   ├── components/          # 공통 컴포넌트 (Navigation)
│   │   └── lib/                 # 타입 정의
│   └── package.json
├── cli/              # CLI 도구 (commander.js)
│   └── src/index.ts
├── mcp-server/       # MCP 서버 (@modelcontextprotocol/sdk)
│   └── src/index.ts
└── shared/           # 공용 타입, 유틸
```

## 빠른 시작

### 1. 설치

```bash
# 전체 의존성 설치 (monorepo workspace)
npm install
```

### 2. 크롤러 실행

```bash
npm run crawler
```

### 3. 웹 대시보드 실행

```bash
npm run web
```

→ http://localhost:3004 에서 대시보드 확인

### 4. CLI 테스트

```bash
# 최신 CVE 목록 (상위 10개)
npm -w cli run dev list

# 특정 CVE 상세 정보
npm -w cli run dev detail CVE-2025-1001

# 위험도별 필터
npm -w cli run dev list --severity 긴급

# 통계 보기
npm -w cli run dev stats

# 보고서 조회
npm -w cli run dev report

# JSON 내보내기 (AI 에이전트용)
npm -w cli run dev export
```

### 5. MCP 서버 실행

```bash
npm run mcp
```

### 6. Claude Code 연동

`.claude/settings.json`에 MCP 서버 등록:

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

## 기술 스택

| 레이어 | 기술 |
|-------|------|
| **크롤러** | Node.js, HTTPS/CSV, node-cron |
| **DB** | SQLite (better-sqlite3) |
| **웹** | Next.js 14, Tailwind CSS, React Markdown |
| **CLI** | commander.js, chalk |
| **MCP** | @modelcontextprotocol/sdk |
| **AI 패치** | Claude Code + MCP (원본 정보 분석) |
| **언어** | TypeScript |

## 스크린샷

### 웹 대시보드
- **다크 테마** 글래스모피즘 디자인
- 위험도별 통계 카드 + 프로그레스 바
- 최근 CVE 테이블 + 빠른 링크
- CVE 검색, 필터, 페이지네이션
- 마크다운 보고서 뷰어

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|-------|
| `CVE_DB_PATH` | SQLite 데이터베이스 경로 | `./crawler/cve.db` |
| `CRAWL_INTERVAL_HOURS` | 크롤링 주기 (시간) | `2` (기본값) |

**NOTE**: API 키 불필요! 크롤러는 원본 정보만 수집하며, AI 에이전트가 독립적으로 분석하고 패치합니다.

## 라이센스

ISC
