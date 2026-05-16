# CVE Security Agent
> "보안 취약점을 자동으로 감지하고, 기록하고, AI가 직접 패치한다"

## Overview
보안 취약점 정보를 주기적으로 수집하여 웹페이지에 기록하고,
CLI/MCP 인터페이스를 통해 AI 에이전트가 프로젝트 보안 패치를 자동 수행하는 시스템.

## Target Users
- 1인 개발자 / 소규모 팀
- 다수 프로젝트를 운영하며 보안 패치를 일괄 적용해야 하는 개발자
- Claude Code, Claude MCP 등 AI 에이전트를 활용한 자동화 워크플로우 사용자

## Core Features₩
1. **스캐너** — [ 대시보드 1주 주기 크롤링, 신규 CVE 감지](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
2. **기록 웹페이지** — 수집된 취약점 + 영문 해결책 요약을 한국어로 정리하여 저장
3. **CLI 도구** — `cve-agent query`, `cve-agent patch` 명령으로 취약점 조회
4. **MCP 서버** — 다른 프로젝트 개발 컨텍스트에서 취약점 정보를 가져와 에이전트에게 전달

## Sprint Plan

### Sprint 1 — 데이터 수집 (스캐닝)
- [ 대시보드 1주 주기 크롤링, 신규 CVE 감지](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) 크롤러 구현 (Playwright or Puppeteer)
- 신규 CVE 감지 로직 (해시 비교 / 날짜 필터)
- cron 스케줄러 (2~3시간 간격)
- 원시 데이터 저장 (SQLite or JSON)

### Sprint 2 — 데이터 가공 및 웹페이지
- Next.js 기반 기록 웹페이지 (CVE 목록, 상세, 해결책)
- 간단한 검색/필터 기능

### Sprint 3 — CLI & MCP 인터페이스
- CLI: `cve-agent` 명령어 (list, detail, patch-guide)
- MCP 서버: 취약점 데이터 읽기 엔드포인트
- Claude Code 연동 테스트

## Success Metrics
- [ ] 크롤러가 [ 대시보드 1주 주기 크롤링, 신규 CVE 감지](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) 신규 CVE를 놓치지 않고 감지
- [ ] 웹페이지에서 CVE 상세 확인 가능
- [ ] `cve-agent list` 실행 시 최신 CVE 목록 출력
- [ ] MCP를 통해 AI 에이전트가 취약점 정보를 읽고 패치 가이드 생성 가능

## Tech Stack
- **크롤러**: Node.js + Playwright
- **스케줄러**: node-cron
- **DB**: SQLite (로컬) / PostgreSQL (운영)
- **웹**: Next.js 14 + Tailwind CSS
- **CLI**: Node.js CLI (commander.js)
- **MCP**: @modelcontextprotocol/sdk

## Directory Structure
```
cve-security-agent/
├── crawler/          # 스캐너 + 스케줄러
├── web/              # Next.js 기록 웹페이지
├── cli/              # cve-agent CLI
├── mcp-server/       # MCP 서버
├── shared/           # DB 모델, 공통 유틸
└── Claude.md
```
