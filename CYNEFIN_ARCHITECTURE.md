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
                    ┌──────────────────────┐
                    │       shared          │
                    │  ICveRepository       │  ← Complicated 인터페이스
                    │  IEventBus            │  ← Complex 인터페이스
                    │  SqliteRepository     │  ← 어댑터 (진입점에서만 생성)
                    │  InMemoryEventBus     │  ← 어댑터 (진입점에서만 생성)
                    │  CircuitBreaker       │  ← Chaotic
                    │  calcSeverity/parseCsv│  ← Clear 순수 함수
                    └──────────┬───────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
      ┌───────────┐   ┌───────────┐   ┌───────────┐
      │  crawler  │   │    cli    │   │mcp-server │
      │ (Complex) │   │(Comp.)    │   │ (Comp.)   │
      │ IEventBus │   │ICveRepo   │   │ICveRepo   │
      │ ICveRepo  │   │           │   │           │
      └─────┬─────┘   └───────────┘   └───────────┘
            │
            ▼
      ┌───────────┐
      │    web    │
      │  (Clear)  │
      │ singleton │
      │ICveRepo   │
      └───────────┘
```

**규칙**:
- 모든 모듈은 `shared`의 **인터페이스**(`ICveRepository`, `IEventBus`)에만 의존
- `shared`의 구체적 구현(SqliteRepository, InMemoryEventBus)은 **진입점**에서만 생성
- Clear/Complicated 영역은 DIP 최소 적용 (성능 오버헤드 방지)
- Complex/Chaotic 영역에 DIP 집중 투자
- Web API는 **싱글톤** Repository로 요청 간 재사용 (커넥션 낭비 방지)
- Crawler의 Repository는 **스케줄러 수명 주기** 동안 재사용

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

## 6. Before vs After (2차 검토 반영)

| 항목 | Before | After (2차 검토) |
|------|--------|------------------|
| DB 접근 | 4곳에서 직접 `better-sqlite3` import | `ICveRepository` 인터페이스 → `SqliteRepository` |
| Web DB 연결 | 요청마다 새 커넥션 생성/해제 | **싱글톤** 재사용 (`web/src/lib/repository.ts`) |
| Crawler DB 연결 | 크롤링마다 새 커넥션 생성/해제 | **스케줄러 수명 주기** 동안 재사용 |
| 네트워크 | 재시도 없음, 장애 시 크롤링 실패 | 서킷 브레이커 + 지수 백오프 재시도 |
| 모듈 결합 | 직접 함수 호출 (동기적) | `IEventBus` 인터페이스 → `InMemoryEventBus` |
| 이벤트 타입 | `data: any` (타입 안전성 없음) | **`CveEventPayloads` 맵**으로 타입 안전 |
| 도메인 로직 | 각 모듈에 분산 | `shared/domain/`에 집중 (순수 함수) |
| DB 교체 | SQLite 강결합, 교체 불가 | 인터페이스 분리로 PostgreSQL 등 교체 가능 |
| 테스트 | DB 모킹 어려움 | `ICveRepository`/`IEventBus` 모킹으로 단위 테스트 용이 |
| 잔류 파일 | `crawler/src/db.ts` deprecated 방치 | 삭제 완료 |

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

---

## 8. 커네빈 프레임워크 아키텍처 보강 사항 (3차 개편)

### 8.1 Chaotic 영역: 네트워크 예외 엄격화
- **기존 문제**: CISA API 호출 시 500, 404 등 비정상 HTTP 응답 코드가 와도 에러를 던지지 않고 HTML 에러 페이지를 그대로 반환하여, 서킷 브레이커와 재시도 로직이 정상 작동하지 않음.
- **보강**: `fetchCsvOverHttp`에서 HTTP 응답 상태 코드가 `200`이 아닐 경우 예외를 명시적으로 던지도록 수정하여, Chaotic 영역의 회로 차단기(Circuit Breaker)와 재시도(Retry)가 즉각 대응할 수 있도록 변경.

### 8.2 Complex 영역: 이벤트 텔레메트리 (Sense 강화)
- **기존 문제**: 인과관계를 사후에 파악해야 하는 복잡계 영역임에도 불구하고 이벤트 발생 흐름에 대한 추적 수단이 없어 로깅 외에 상태 분석이 어려웠음.
- **보강**: `IEventBus` 및 `InMemoryEventBus`에 최근 100개의 이벤트 흐름을 보관하는 `history` 필드 및 `getHistory()`, `clearHistory()` 메서드를 추가하여 런타임에 에이전트의 상태를 "관찰 및 감지(Sense)"할 수 있는 장치 마련.

### 8.3 영역별 단위 테스트 구축
각 영역의 예측 가능성 및 견고함을 입증하기 위해 다음과 같이 테스트 환경을 분리하여 구현:
- **Clear 영역 테스트**: CSV 파서 및 위험도 산출 공식 등 결정론적이고 단순한 도메인 로직에 대한 테스트 케이스 100% 검증 (`shared/src/domain/clear.test.ts`).
- **Complicated 영역 테스트**: 모킹 대신 `:memory:` SQLite를 활용하여 DB 리포지토리의 조회, 갱신, 트랜잭션 무결성을 격리된 환경에서 검증 (`shared/src/adapters/complicated.test.ts`).
- **Complex 영역 테스트**: 이벤트 버스의 안전한 전파, 리스너 에러 격리(에러 전파 차단), 텔레메트리 이력 보존 기능을 검증 (`shared/src/events/complex.test.ts`).
- **Chaotic 영역 테스트**: 연속 실패 임계치 도달에 따른 서킷 브레이커의 상태 전이(`CLOSED` -> `OPEN` -> `HALF_OPEN`)와 폴백(Fallback) 처리, 그리고 지수 백오프 재시도 성공/실패 여부를 모의 타이머를 통해 완벽히 검증 (`shared/src/resilience/chaotic.test.ts`).

