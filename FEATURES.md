# CVE Security Agent — 기능 설명서

**최종 업데이트**: 2026-05-16

---

## 🎯 전체 기능 요약

| 모듈 | 기능 | 상태 |
|------|------|------|
| **크롤러** | CISA KEV 자동 크롤링 | ✅ |
| | SQLite DB 저장 | ✅ |
| | **마크다운 보고서 자동 생성** | ✨ NEW |
| **CLI** | 취약점 목록 조회 | ✅ |
| | 취약점 상세 정보 | ✅ |
| | 위험도별 필터 | ✅ |
| | 통계 조회 | ✅ |
| | **보고서 조회** | ✨ NEW |
| | JSON 내보내기 | ✅ |
| **MCP 서버** | 최신 CVE 조회 | ✅ |
| | CVE 상세 정보 | ✅ |
| | AI 패치 컨텍스트 | ✅ |
| **보고서** | 자동 생성 | ✨ NEW |
| | 날짜별 저장 | ✨ NEW |
| | 우선순위 가이드 | ✨ NEW |

---

## 📚 CLI 명령어 가이드

### 1. 목록 조회: `cve-agent list`

**기본 사용**:
```bash
cve-agent list
```

**출력**:
```
🟢 [낮음] CVE-2025-1004 - Info Disclosure in Node.js
🟡 [보통] CVE-2025-1003 - XSS in React Library
🟠 [높음] CVE-2025-1002 - SQL Injection in MySQL Driver
🔴 [긴급] CVE-2025-1001 - Critical RCE in Apache Log4j

총 4개
```

**옵션**:
```bash
# 개수 제한
cve-agent list --count 5

# 위험도 필터
cve-agent list --severity 긴급

# 조합 사용
cve-agent list -n 3 -s 높음
```

### 2. 상세 정보: `cve-agent detail`

**사용**:
```bash
cve-agent detail CVE-2025-1001
```

**출력**:
```
╔════════════════════════════════════════╗
║ CVE-2025-1001                        ║
╚════════════════════════════════════════╝

📋 제목:
  Critical RCE in Apache Log4j

⚠️  위험도:
   긴급 (Critical) 

📅 발행 일자:
  2025-01-15

📝 원문 해결책:
  Update Apache Log4j to version 2.20.0 or later

💡 참고: Claude 에이전트가 이 정보를 분석하여 구체적인 패치 가이드를 생성합니다.

🔗 원문: https://cisa.gov/cve/CVE-2025-1001
```

### 3. 통계: `cve-agent stats`

**사용**:
```bash
cve-agent stats
```

**출력**:
```
📊 CVE 통계

전체 CVE 수: 4

위험도별 분포:
  🔴 긴급   :   1건
  🟠 높음   :   1건
  🟡 보통   :   1건
  🟢 낮음   :   1건
```

### 4. 보고서 조회: `cve-agent report` ✨ NEW

**오늘 보고서 조회**:
```bash
cve-agent report
```

**특정 날짜 보고서 조회**:
```bash
cve-agent report 2026-05-16
```

**보고서 형식**: `CVE-Report-YYYY-MM-DD.md`

**보고서 내용**:
1. **📊 요약 섹션**
   - 전체 CVE 수
   - 위험도별 분포 (개수 + 비율)

2. **🚨 우선순위별 조치**
   - 즉시 패치 (긴급)
   - 이번 주 내 패치 (높음)
   - 다음 배포 시 패치 (보통/낮음)

3. **📋 전체 CVE 목록**
   - 테이블 형식
   - CVE ID, 제목, 위험도, 발행일, 해결책

4. **🔍 상세 정보**
   - 각 CVE별 완전한 정보
   - 제목, 위험도, 발행일, 상세정보 링크, 원문 해결책

### 5. JSON 내보내기: `cve-agent export`

**전체 내보내기**:
```bash
cve-agent export
```

**특정 CVE 내보내기**:
```bash
cve-agent export CVE-2025-1001
```

**출력 형식**: JSON (AI 에이전트 연동용)

---

## 📊 보고서 상세 설명

### 보고서 저장 위치
```
cve-web/
└── crawler/
    └── cve-report/
        ├── CVE-Report-2026-05-16.md  ← 크롤링 날짜별 저장
        ├── CVE-Report-2026-05-15.md
        └── CVE-Report-2026-05-14.md
```

### 보고서 생성 시점
- **자동 생성**: 크롤러 실행 완료 후 자동으로 생성
- **파일명 규칙**: `CVE-Report-{크롤링날짜}.YYYY-MM-DD.md`
- **저장 경로**: `crawler/cve-report/`

### 보고서 내용 예시

```markdown
# CVE 보안 취약점 보고서

**생성 날짜**: 2026-05-16
**생성 시간**: 2026. 5. 16. 오후 3:31:18

## 📊 요약

**전체 CVE 수**: 4건

### 위험도별 분포

| 위험도 | 개수 | 비율 |
|-------|------|------|
| 🔴 긴급 | 1건 | 25.0% |
| 🟠 높음 | 1건 | 25.0% |
| 🟡 보통 | 1건 | 25.0% |
| 🟢 낮음 | 1건 | 25.0% |

## 🚨 우선순위별 조치

### 즉시 패치 (긴급)
- **CVE-2025-1001**: Critical RCE in Apache Log4j
  - 패치: Update Apache Log4j to version 2.20.0 or later

### 이번 주 내 패치 (높음)
- **CVE-2025-1002**: SQL Injection in MySQL Driver
  - 패치: Update MySQL connector to 8.0.35 or higher

[...상세 정보 계속...]
```

---

## 🤖 Claude Code (AI 에이전트) 연동

### MCP 서버를 통한 연동

`.claude/settings.json`에 MCP 서버 등록:

```json
{
  "mcpServers": {
    "cve-security-agent": {
      "command": "node",
      "args": ["/path/to/cve-web/mcp-server/dist/index.js"]
    }
  }
}
```

### AI 에이전트 사용 예시

```markdown
Claude: "cve-security-agent MCP에서 현재 필요한 보안 패치 목록을 받아서,
우리 프로젝트의 package.json을 분석해.

각 취약점에 대해:
1. 패키지 버전 확인
2. 업그레이드 필요 여부 판단
3. 자동으로 패치 실행

원문 정보(영문 해결책, 상세 URL)를 바탕으로 구체적인 패치 가이드를 생성해줄 수 있어."
```

### MCP 도구 설명

#### `get_recent_cves(count, severity)`
최신 CVE 목록을 조회합니다.

**예시**:
```json
{
  "cve_id": "CVE-2025-1001",
  "title": "Critical RCE in Apache Log4j",
  "severity": "긴급",
  "published_at": "2025-01-15",
  "detail_url": "https://...",
  "raw_solution": "Update Apache Log4j to version 2.20.0 or later"
}
```

#### `get_cve_detail(cve_id)`
특정 CVE의 상세 정보를 조회합니다.

#### `get_patch_context(severity_min)`
AI가 분석할 패치 컨텍스트를 마크다운 형식으로 반환합니다.

---

## 📈 워크플로우

### 전체 흐름

```
1. 크롤러 실행 (npm run crawler)
   ↓
2. CISA KEV에서 CVE 데이터 수집
   ↓
3. SQLite DB에 저장
   ↓
4. 📄 마크다운 보고서 자동 생성
   ↓
5. CLI로 정보 조회
   - cve-agent list
   - cve-agent report (←NEW!)
   ↓
6. MCP 서버로 AI 에이전트에 정보 전달
   ↓
7. AI가 패치 가이드 생성 + 자동 패치 실행
```

### 일일 운영 절차

```bash
# 1. 아침마다 크롤러 실행
npm run crawler

# 2. 어제 보고서 확인
cve-agent report 2026-05-15

# 3. 오늘 보고서 확인
cve-agent report

# 4. 긴급 CVE 확인
cve-agent list --severity 긴급

# 5. Claude Code에서 AI 패치 실행
# (MCP 연동)
```

---

## ✨ 새로운 기능 (v2)

### 보고서 자동 생성
- ✅ 크롤러 완료 후 자동 생성
- ✅ 날짜별 저장 (`CVE-Report-YYYY-MM-DD.md`)
- ✅ 체계적인 마크다운 형식
- ✅ 우선순위별 조치 가이드

### 보고서 조회 CLI
- ✅ `cve-agent report` — 오늘 보고서
- ✅ `cve-agent report YYYY-MM-DD` — 특정 날짜
- ✅ 완전한 정보 포함 (통계, 우선순위, 상세정보)

### 보고서 활용
- 📋 일일 보안 현황 리포트
- 📊 장기 추세 분석 (여러 날짜 비교)
- 🔍 이전 크롤링 결과 검색
- 📤 팀 내 공유 가능

---

## 🎓 사용 팁

### Tip 1: 보고서를 파일로 저장
```bash
cve-agent report > cve-report-$(date +%Y-%m-%d).md
```

### Tip 2: 여러 날짜 보고서 한번에 확인
```bash
for date in 2026-05-{14..16}; do
  echo "=== $date ==="
  cve-agent report $date | grep "전체 CVE 수"
done
```

### Tip 3: 긴급 CVE만 추적
```bash
cve-agent list --severity 긴급 > urgent-cves.txt
```

### Tip 4: AI와 함께 패치
```bash
# 1. 보고서 생성 (자동)
npm run crawler

# 2. 보고서 확인
cve-agent report

# 3. Claude Code에서 MCP 활용
# "cve-security-agent로 현재 필요한 패치를 받아서..."
```

---

## 🔗 참고 문서

- [REFACTOR.md](./REFACTOR.md) — 아키텍처 개편 내용
- [TEST_REPORT.md](./TEST_REPORT.md) — 테스트 결과
- [README.md](./README.md) — 프로젝트 개요
- [Claude.md](./Claude.md) — 프로젝트 가이드

---

## 📞 지원

문제가 있으시면:
1. `cve-agent --help` 확인
2. 보고서가 정상 생성되는지 확인
3. `crawler/cve-report/` 디렉토리 확인

**모든 기능이 준비되었습니다! 🚀**
