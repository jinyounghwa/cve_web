# CVE Security Agent

> 보안 취약점을 자동으로 감지하고, 기록하고, AI가 직접 패치한다

![CVE Security Agent](https://img.shields.io/badge/status-active-brightgreen)

## 개요

**CVE Security Agent**는 CISA KEV(Known Exploited Vulnerabilities) 대시보드에서 신규 보안 취약점을 주기적으로 수집하여:

1. **웹페이지에 기록** — 수집된 취약점 정보를 한국어로 정리하여 저장
2. **CLI 인터페이스** — `cve-agent list`, `cve-agent detail` 등으로 취약점 조회
3. **MCP 서버** — Claude Code 등 AI 에이전트가 취약점 정보를 읽고 자동 패치 실행

## 주요 기능

### ✅ 완료

- **Sprint 1: 크롤러** — CISA KEV 대시보드 주기적 크롤링, 원본 정보 SQLite DB 저장 (⚡ ANTHROPIC_API_KEY 불필요)
- **Sprint 3: CLI** — `cve-agent` 명령어로 취약점 조회, 원본 정보 표시, 통계, **보고서 조회**
- **Sprint 3: MCP 서버** — Claude Code 연동용 3개 도구 구현 (AI가 자체 분석 후 패치)
  - `get_recent_cves` — 최신 CVE 목록 (원본 영문 해결책 포함)
  - `get_cve_detail` — 특정 CVE 상세 정보 (원문 기반)
  - `get_patch_context` — AI가 분석할 패치 컨텍스트 (원본 정보)
- **📊 보고서 자동 생성** — 크롤러 실행 후 마크다운 보고서 자동 생성
  - 위험도별 분포 통계
  - 우선순위별 조치 가이드
  - 전체 CVE 목록 및 상세 정보
  - 파일명: `CVE-Report-YYYY-MM-DD.md`

### 🔄 진행 중

- **Sprint 2: Next.js 웹페이지** — CVE 목록, 상세 정보, 필터 기능

### 📝 아키텍처 개편 (2026-05-16)
- ✂️ ANTHROPIC_API_KEY 제거 — API 비용 $0
- ⚡ 크롤러 성능 100배 향상 (Claude API 호출 제거)
- 🎨 AI 에이전트가 원본 정보로 자체 분석 후 패치 (더 강력함)
- [상세 정보](./REFACTOR.md)

## 디렉토리 구조

```
cve-security-agent/
├── crawler/          # Node.js + Playwright 크롤러, 스케줄러
│   ├── src/
│   │   ├── cisa-scraper.ts   # CISA KEV 대시보드 크롤링
│   │   ├── db.ts             # SQLite 스키마
│   │   ├── scheduler.ts      # node-cron 스케줄러
│   │   ├── summarizer.ts     # Claude API 한국어 요약
│   │   └── index.ts          # 진입점
│   └── cve.db                # SQLite 데이터베이스
├── cli/              # CLI 도구 (commander.js)
│   ├── src/
│   │   └── index.ts          # cve-agent 명령어
│   └── dist/
├── mcp-server/       # MCP 서버 (@modelcontextprotocol/sdk)
│   ├── src/
│   │   └── index.ts          # 3개 MCP 도구
│   └── dist/
├── web/              # Next.js 웹페이지 (예정)
│   ├── app/
│   ├── public/
│   └── package.json
├── shared/           # 공용 타입, 유틸 (예정)
├── .env              # 환경 변수
├── package.json      # 워크스페이스 설정
└── Claude.md         # 프로젝트 가이드
```

## 빠른 시작

### 1. 설치

```bash
# 전체 의존성 설치 (monorepo workspace)
npm install

# 또는 각 패키지별로
cd crawler && npm install
cd ../cli && npm install
cd ../mcp-server && npm install
```

### 2. 환경 변수 설정 (선택사항)

```bash
# .env 파일 확인 (기본 설정으로 충분함)
cat .env
```

**NOTE**: ANTHROPIC_API_KEY는 더 이상 필요하지 않습니다! ✨

### 3. 크롤러 실행

```bash
npm run crawler
# 또는
cd crawler && npm run dev
```

→ 2시간 주기로 CISA KEV 대시보드를 크롤링하고 SQLite에 저장합니다.

### 4. CLI 테스트

```bash
# 최신 CVE 목록 (상위 10개)
npm -w cli run dev list

# 특정 CVE 상세 정보
npm -w cli run dev detail CVE-2025-12345

# 위험도별 필터
npm -w cli run dev list --severity 긴급

# 통계 보기
npm -w cli run dev stats

# 크롤러 실행 보고서 조회 (오늘 날짜)
npm -w cli run dev report

# 특정 날짜 보고서 조회
npm -w cli run dev report 2026-05-16

# JSON 내보내기 (AI 에이전트용)
npm -w cli run dev export
```

### ✨ 보고서 자동 생성 기능

크롤러 실행 후 자동으로 마크다운 보고서가 생성됩니다:

```
cve-report/
├── CVE-Report-2026-05-16.md  ← 크롤링 날짜 기준
├── CVE-Report-2026-05-15.md
└── CVE-Report-2026-05-14.md
```

**보고서 내용**:
- 📊 요약 통계 (전체 CVE 수, 위험도별 분포)
- 🚨 우선순위별 조치 (긴급/높음/보통/낮음)
- 📋 전체 CVE 목록 (테이블)
- 🔍 상세 정보 (CVE별 제목, 위험도, 링크, 해결책)

### 5. MCP 서버 실행

```bash
npm run mcp
```

→ Claude Code 등 MCP 클라이언트가 연동할 수 있도록 stdio를 통해 서버 실행.

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

그 후 Claude Code에서:

```
"현재 프로젝트의 package.json을 분석하고,
cve-security-agent MCP의 get_patch_context 도구를 사용해서
적용해야 할 보안 패치를 모두 자동으로 실행해줘"
```

## 기술 스택

| 레이어 | 기술 |
|-------|------|
| **크롤러** | Node.js, Playwright, node-cron |
| **DB** | SQLite (개발) / PostgreSQL (운영 예정) |
| **웹** | Next.js 14, Tailwind CSS (예정) |
| **CLI** | commander.js, chalk |
| **MCP** | @modelcontextprotocol/sdk |
| **AI 패치** | Claude Code + MCP (원본 정보 분석) |
| **언어** | TypeScript |

**핵심**: 크롤러는 정보만, AI가 패치! 🤖

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|-------|
| `ANTHROPIC_API_KEY` | Claude API 키 | (필수) |
| `CVE_DB_PATH` | SQLite 데이터베이스 경로 | `./crawler/cve.db` |
| `WEB_PORT` | 웹 서버 포트 | `3000` |
| `CRAWL_INTERVAL_HOURS` | 크롤링 주기 (시간) | `2` |

## 주의사항

### CISA KEV 대시보드 크롤링

- **robots.txt 준수** — CISA 사이트의 크롤링 정책 확인 및 준수
- **User-Agent 설정** — 적절한 User-Agent 헤더 전송
- **요청 간격** — 서버 부하 방지를 위해 적절한 대기 시간 설정

### 데이터베이스

- **공유 경로** — 모든 서비스(크롤러, CLI, 웹, MCP)가 동일 DB 경로 사용
- **절대경로 권장** — 상대경로로 인한 경로 오류 방지

### API 키 관리

- **`.env` 파일 버전 관리 금지** — `.gitignore`에 추가됨
- **환경 변수로 로드** — `dotenv` 패키지 사용

## 라이센스

ISC

## 저자

CVE Security Agent Team

---

## 다음 단계

- [ ] Sprint 2: Next.js 웹페이지 구현
- [ ] 데이터베이스 마이그레이션 (SQLite → PostgreSQL)
- [ ] Docker 컨테이너화
- [ ] CI/CD 파이프라인
- [ ] 슬랙/이메일 알림
