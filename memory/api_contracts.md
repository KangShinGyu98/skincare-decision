# API 계약 (REST 엔드포인트 + 외부 API)

> 외부 API 또는 자체 REST 엔드포인트가 변경되면 이 파일을 먼저 업데이트하세요.
> 새 엔드포인트 추가 시 형식: `## METHOD /path` → 목적 → Request → Response → 에러 케이스.

---

## [Backend] REST API 엔드포인트 (계획)

> Phase 2에서 NestJS Controller가 생기는 시점에 실제 시그니처로 갱신한다.
> 모든 엔드포인트는 `x-device-id` 헤더 또는 cookie의 `device_id`를 요구한다.

### 인증 / 신원

| METHOD | PATH                       | 목적                                         |
| ------ | -------------------------- | -------------------------------------------- |
| POST   | `/auth/device`             | device_id 발급/조회 (없으면 생성)            |
| POST   | `/auth/login`              | 이메일 로그인 + 자동 병합 트리거             |
| POST   | `/auth/logout`             | 세션 종료 (device_id는 유지)                 |

### Fact / 질문

| METHOD | PATH                                         | 목적                                              |
| ------ | -------------------------------------------- | ------------------------------------------------- |
| GET    | `/facts/definitions`                         | fact_definitions 전체 (캐시 가능, ETag)           |
| GET    | `/facts/questions?screen=priority_gate`      | screen 별 보여줄 context_questions + visibility   |
| POST   | `/facts/answers`                             | user_facts append (배열 가능)                     |
| GET    | `/facts/answers?session_id=...`              | 현재 device/user의 최신 fact 값                   |

### Priority Gate

| METHOD | PATH                       | 목적                                                     |
| ------ | -------------------------- | -------------------------------------------------------- |
| POST   | `/priority-gate/evaluate`  | 현재 user_facts → priority_rules 평가 → decision_runs 저장 |
| GET    | `/priority-gate/result/:runId` | snapshot 조회                                          |

### Category Decision / Product Matrix

| METHOD | PATH                                                 | 목적                                                                |
| ------ | ---------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/categories`                                        | 6개 product_categories 목록                                         |
| GET    | `/categories/:key/attributes`                        | category_attribute_definitions (관리자/필터 UI)                     |
| POST   | `/category-decision/seed`                            | category 진입 시 BASIC + PERSONALIZED 필터 초기 상태 생성           |
| GET    | `/product-matrix?category=sunscreen&filter_state=..` | filter_state 기반 products 조회 + tags + cautions                   |
| POST   | `/product-matrix/filter-state`                       | filter 추가/삭제 → product_matrix_filter_states 업데이트            |
| POST   | `/product-matrix/runs`                               | 조회 결과 snapshot 저장 (decision_runs)                             |

### Product Detail

| METHOD | PATH                  | 목적                                           |
| ------ | --------------------- | ---------------------------------------------- |
| GET    | `/products/:id`       | 제품 상세 + 적합도 사유 + ingredients          |

### Reaction Traceback

| METHOD | PATH                              | 목적                                                                     |
| ------ | --------------------------------- | ------------------------------------------------------------------------ |
| POST   | `/reactions/reports`              | reaction_reports + reaction_report_products + suspected_causes 일괄 저장 |
| GET    | `/reactions/reports/:id`          | 단일 리포트 상세                                                         |
| POST   | `/reactions/avoidance-rules`      | 사용자가 확정한 회피 규칙 저장                                           |
| GET    | `/reactions/avoidance-rules`      | 현재 device/user의 활성 규칙                                             |

### 분석 / 이벤트

| METHOD | PATH                  | 목적                                |
| ------ | --------------------- | ----------------------------------- |
| POST   | `/events`             | session_events 단건/배치 저장       |
| POST   | `/sessions/start`     | 새 user_session 생성                |
| POST   | `/sessions/heartbeat` | last_seen_at 갱신                   |

---

## 공통 응답 규약

```json
{
  "data": { ... },
  "meta": { "request_id": "...", "device_id": "...", "session_id": "..." },
  "errors": []
}
```

에러는 [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807) 변형:

```json
{
  "type": "https://api/errors/validation",
  "title": "Validation failed",
  "status": 400,
  "detail": "fact_key 'category.selected'은 sunscreen|toner|...만 허용",
  "instance": "/facts/answers"
}
```

---

## 외부 API

> 현재 MVP에는 직접 호출하는 외부 API가 없다. 추후 추가 시 아래 형식 사용.

<!-- 외부 API 항목 형식:

## [API 이름]

**Provider 파일:** `[backend/src/providers/api_provider.ts]`

**사용 목적:** [이 API를 왜 사용하는지]

**핵심 설정:**
- env: API_KEY, BASE_URL
- timeout: ...

**입력:** [입력 형식]
**출력:** [출력 형식]
**rate limit / 캐시 전략:**

-->
