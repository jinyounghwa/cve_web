# CVE Security Agent — 커네빈(Cynefin) 기반 아키텍처 설계서

**작성일**: 2026-05-28  
---

## 1. 커네빈 영역별 도메인 분류

| 영역 | 기능 | 의존성 전략 | 적용 패턴 |
|------|------|------------|----------|
| **Clear** | CSV 파싱, 위험도 산출, 타입 정의 | 강한 결합 허용 | 트랜잭션 스크립트, 순수 함수 |
| **Complicated** | DB Repository, 보고서 생성 | 인터페이스 기반 분리 | 전략 패턴, DI, 레이어드 아키텍처 |
| **Complex** | 크롤러 오케스트레이션, MCP 서버 | 완전한 격리 및 비동기 분리 | 이벤트 버스, 헥사고날 아키텍처 |
| **Chaotic** | CISA 네트워크 호출 | 의존성 차단 | 서킷 브레이커, 재시도, 격벽 |

---

## 2. 패키지 구조

```
cve-security-agent/
├── shared/                          ← 공유 패키지 (모든 모듈의 기반)
│   └── src/
│       ├── types.ts                 ← Clear: 공유 타입
│       ├── domain/
│       │   ├── severity.ts          ← Clear: 위험도 산출 (순수 함수)
│       │   └── csv-parser.ts        ← Clear: CSV 파싱 (순수 함수)
│       ├── ports/
│       │   └── ICveRepository.ts    ← Complicated: Repository 인터페이스
│       ├── adapters/
│       │   └── SqliteRepository.ts  ← Complicated: SQLite 구현체
│       ├── resilience/
│       │   ├── circuit-breaker.ts   ← Chaotic: 서킷 브레이커
│       │   └── retry.ts            ← Chaotic: 지수 백오프 재시도
│       ├── events/
│       │   ├── types.ts            ← Complex: 이벤트 타입
│       │   └── event-bus.ts        ← Complex: 이벤트 버스
│       └── index.ts                ← 공개 API
│
├── crawler/                         ← Complex 영역 (핵심 비즈니스)
│   └── src/
│       ├── index.ts                ← 진입점 (이벤트 버스 생성)
│       ├── scheduler.ts            ← 오케스트레이터 (이벤트 기반)
│       ├── cisa-scraper.ts         ← Chaotic: 네트워크 (서킷 브레이커)
│       └── report-generator.ts     ← Complicated: 보고서 생성
│
├── web/                             ← Clear 영역 (표현 계층)
│   └── src/app/api/                ← API 라우트 (shared Repository 사용)
│
├── cli/                             ← Complicated 영역
│   └── src/index.ts                ← CLI (shared Repository 사용)
│
└── mcp-server/                      ← Complicated 영역
    └── src/index.ts                ← MCP 서버 (shared Repository 사용)
```

---

## 3. 의존성 방향 규칙

### 3.1 DIP 차등 적용

```
                    ┌─────────────────┐
                    │     shared      │
                    │  (인터페이스)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌─────────┐   ┌─────────┐   ┌──────────┐
        │ crawler │   │   cli   │   │mcp-server│
        │ (Complex)│   │(Comp.) │   │ (Comp.)  │
        └─────────┘   └─────────┘   └──────────┘
              │
              ▼
        ┌─────────┐
        │   web   │
        │ (Clear) │
        └─────────┘
```

**규칙**:
- 모든 모듈은 `shared`의 **인터페이스**에만 의존
- `shared`의 구체적 구현(SqliteRepository)은 진입점에서만 생성
- Clear/Complicated 영역은 DIP 최소 적용 (성능 오버헤드 방지)
- Complex/Chaotic 영역에 DIP 집중 투자

### 3.2 Bounded Context 통신 방식

| 호출 방향 | 방식 | 예시 |
|----------|------|------|
| Clear ↔ Complicated | 직접 호출 (데이터 변환기) | Web API → ICveRepository |
| Complicated ↔ Complex | 인터페이스만 의존 | Crawler → ICveRepository |
| Complex → Chaotic | 서킷 브레이커 + 재시도 | fetchCisaCsv → CircuitBreaker |
| Complex 내부 | 이벤트 버스 | Scheduler → EventBus → Report |

---

## 4. 핵심 설계 원칙 적용

### 4.1 안정성 리스크 격리

```
[Chaotic] CISA 네트워크 장애
    └── 서킷 브레이커가 차단 → 빈 데이터 반환 → 시스템 안정

[Complex] 크롤러 실패
    └── 이벤트 버스로 에러 전파 → 로깅만 → 타 모듈 영향 없음

[Complicated] DB 장애
    └── Repository 인터페이스 → 교체 가능 (PostgreSQL 등)
```

### 4.2 진화형 아키텍처

시간이 지나 Complex 영역이 안정화되면:

1. **CISA CSV 파싱** (Complex → Clear): 안정화 후 `shared/domain`으로 이동 ✅ (이미 이동 완료)
2. **위험도 산출** (Complex → Clear): 안정화 후 순수 함수로 이동 ✅ (이미 이동 완료)
3. **이벤트 버스** → 메시지 큐(Kafka, Redis)로 교체 가능 (인터페이스 분리 덕분)
4. **SQLite** → PostgreSQL로 교체 가능 (ICveRepository 인터페이스 덕분)

---

## 5. 장애 대응 매트릭스

| 장애 시나리오 | 영역 | 대응 메커니즘 |
|-------------|------|-------------|
| CISA 서버 응답 없음 | Chaotic | 서킷 브레이커 OPEN → 빈 데이터 반환 |
| CISA 서버 일시적 오류 | Chaotic | 지수 백오프 재시도 (3회, 2s→4s→8s) |
| DB 연결 실패 | Complicated | ICveRepository 교체 가능 (인터페이스) |
| 보고서 생성 실패 | Complex | 이벤트 분리 → 크롤링에 영향 없음 |
| MCP 서버 크래시 | Complicated | 독립 프로세스 → 타 모듈에 전파 안됨 |

---

## 6. Before vs After

| 항목 | Before | After |
|------|--------|-------|
| DB 접근 | 4곳에서 직접 `better-sqlite3` import | `ICveRepository` 인터페이스 → `SqliteRepository` |
| 네트워크 | 재시도 없음, 장애 시 크롤링 실패 | 서킷 브레이커 + 지수 백오프 재시도 |
| 모듈 결합 | 직접 함수 호출 (동기적) | 이벤트 버스 (비동기 분리) |
| 도메인 로직 | 각 모듈에 분산 | `shared/domain/`에 집중 (순수 함수) |
| DB 교체 | SQLite 강결합, 교체 불가 | 인터페이스 분리로 PostgreSQL 등 교체 가능 |
| 테스트 | DB 모킹 어려움 | `ICveRepository` 모킹으로 단위 테스트 용이 |

---

## 7. 확장 가이드

### PostgreSQL 마이그레이션
```typescript
// shared/src/adapters/PostgresRepository.ts (새로 생성)
export class PostgresRepository implements ICveRepository {
  // ICveRepository 메서드 구현
}

// 진입점만 변경
const repo = new PostgresRepository(connectionString);
```

### 메시지 큐 도입
```typescript
// shared/src/events/kafka-event-bus.ts (새로 생성)
export class KafkaEventBus implements IEventBus {
  // EventBus 인터페이스 구현
}

// crawler/src/index.ts
const eventBus = new KafkaEventBus();  // 교체 완료
```

### 알림 시스템 추가
```typescript
// crawler/src/index.ts
eventBus.on('cve:upserted', (e) => {
  if (e.data.newCount > 0) {
    sendSlackNotification(e.data);  // 새로운 리스너만 추가
  }
});
```
