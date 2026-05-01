
# K-Beauty Decision — DB 모델링

데이터 구조 (테이블, 컬럼)

---

## 테이블 목록

| # | 테이블명 | 분류 |
|---|----------|------|
| 1 | users | 사용자 |
| 2 | devices | 사용자 |
| 3 | user_sessions | 사용자 |
| 4 | session_events | 사용자 |
| 5 | fact_definitions | Fact / 질문 |
| 6 | context_questions | Fact / 질문 |
| 7 | question_visibility_conditions | Fact / 질문 |
| 8 | user_facts | Fact / 질문 |
| 9 | priority_rules | Priority Gate |
| 10 | priority_rule_conditions | Priority Gate |
| 11 | decision_runs | 실행 이력 (공통) |
| 12 | brands | 제품 DB |
| 13 | product_categories | 제품 DB |
| 14 | category_attribute_definitions | 제품 DB |
| 15 | products | 제품 DB |
| 16 | product_matrix_filter_states | Product Matrix |
| 17 | product_filter_mappings | Product Filter |
| 18 | ingredients | 성분 / Traceback |
| 19 | product_ingredients | 성분 / Traceback |
| 20 | ingredient_groups | 성분 / Traceback |
| 21 | ingredient_group_members | 성분 / Traceback |
| 22 | reaction_reports | 성분 / Traceback |
| 23 | reaction_report_products | 성분 / Traceback |
| 24 | suspected_causes | 성분 / Traceback |
| 25 | avoidance_rules | 성분 / Traceback |

### MVP에서 제거된 테이블

| 테이블명 | 제거 이유 |
|----------|-----------|
| concern_groups | Concern 태그는 프론트 상수로 관리. DB 불필요 |
| concern_tags | 동일 |
| concern_category_mappings | 동일. 태그 → `route_target`, `preset_facts`, `suggested_category`, `suggested_filters`는 코드 상수로 처리 |

> **Concern Mapper / 고민 캐러셀은 DB 관리 대상이 아니다.**  
> 태그 목록과 태그 → `route_target` / `preset_facts` / `suggested_category` / `suggested_filters` 매핑은 프론트엔드 상수(코드)로 관리한다.  
> 태그 클릭 이벤트는 `session_events`에 `concern_clicked`로 저장하고,  
> `user_facts`에는 최소 `flow.concern`을 저장하고, 필요하면 `preset_facts`도 `source = concern`으로 저장할 수 있다.  
> 단 `source = concern`은 확정 답변이 아니라 초기 선택 상태이며, 이후 `priority_gate` / `context`에서 사용자가 직접 답한 값이 최종 판단에 우선한다.
>
> 예시 흐름:
> ```
> [여드름] 클릭
>   → session_events: { event_name: "concern_clicked", payload: { concern: "acne" } }
>   → 프론트 상수에서 route_target = "priority_gate", suggested_category = "cleanser" 결정
>   → user_facts: { fact_key: "flow.concern", value: "acne", source: "concern" }
>   → 필요 시 preset_facts 저장 또는 프론트 초기 선택 상태로 유지
>   → Priority Gate 진입
> ```

---

## 신원 3계층 구조

```
[브라우저 cookie/localStorage]
  device_id  ← 영구 발급, 기기 단위 신원

devices
  └─ user_sessions  ← 탭/유입 단위 활동창 (30분 timeout)
        └─ session_events  ← 클릭·노출·A/B 이벤트

users (로그인 계정)
  └─ devices.user_id 로 연결
```

**조회 기준:**
- 비로그인: `WHERE device_id = ?`
- 로그인: `WHERE user_id = ?`

**로그인 시 자동 병합 (Eager merge):**
```sql
-- 1. 기기 자체에 user_id 연결
UPDATE devices
  SET user_id = :user_id
  WHERE id = :device_id;

-- 2. 이 기기의 세션들에 user_id 채우기
UPDATE user_sessions
  SET user_id = :user_id
  WHERE device_id = :device_id AND user_id IS NULL;

-- 3. 사용자 데이터 병합
UPDATE user_facts                   SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
UPDATE decision_runs                SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
UPDATE reaction_reports             SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
UPDATE avoidance_rules              SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
UPDATE product_matrix_filter_states SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
```
> 사용자는 "내 답변이 이어진다"고 자연스럽게 기대한다 — 병합 UI 없이 로그인 시 자동 처리.

---

## 전체 관계 요약

```
users
 └─ devices  ← cookie/localStorage device_id
     └─ user_sessions  ← 탭/유입 단위 활동창
         └─ session_events  ← 클릭·노출·A/B 이벤트

devices + users
 ├─ user_facts                    (device_id + user_id nullable)
 ├─ decision_runs                 (device_id + user_id nullable)
 ├─ product_matrix_filter_states  (device_id + user_id nullable)
 ├─ reaction_reports              (device_id + user_id nullable)
 │    ├─ reaction_report_products
 │    └─ suspected_causes
 └─ avoidance_rules               (device_id + user_id nullable)

fact_definitions
 ├─ context_questions
 │    └─ question_visibility_conditions
 ├─ user_facts
 ├─ priority_rule_conditions
 └─ product_filter_mappings

priority_rules
 ├─ priority_rule_conditions
 └─ decision_runs

product_categories
 ├─ category_attribute_definitions
 ├─ products
 ├─ product_matrix_filter_states
 └─ product_filter_mappings

brands
 └─ products
      ├─ product_ingredients
      └─ reaction_report_products

ingredients
 ├─ product_ingredients
 └─ ingredient_group_members

ingredient_groups
 ├─ ingredient_group_members
 ├─ suspected_causes
 └─ avoidance_rules
```

---

## 1. 사용자 / 기기 / 세션 / 이벤트

### users

로그인 계정 정보.

| 컬럼         | 타입                      | 설명         |
| ------------ | ------------------------- | ------------ |
| id           | UUID PK                   | 유저 ID      |
| email        | VARCHAR(255) UNIQUE       | 이메일       |
| name         | VARCHAR(100)              | 이름         |
| role         | ENUM('USER','ADMIN')      | 역할         |
| created_at   | TIMESTAMP WITH TIME ZONE  | 생성일       |
| updated_at   | TIMESTAMP WITH TIME ZONE  | 수정일       |

---

### devices

브라우저/기기 단위 영구 신원. cookie 또는 localStorage에 `device_id` 저장.

| 컬럼          | 타입                              | 설명                                   |
| ------------- | --------------------------------- | -------------------------------------- |
| id            | UUID PK                           | device_id (브라우저에 저장)            |
| user_id       | UUID FK → users.id NULLABLE       | 로그인 시 연결, 비로그인이면 null      |
| last_seen_at  | TIMESTAMP WITH TIME ZONE          | 마지막 활동 시간                       |
| created_at    | TIMESTAMP WITH TIME ZONE          | 최초 방문일                            |

> 시크릿 모드 / cookie 초기화 시 새 device_id 발급 → 이전 데이터와 단절. 이는 의도된 동작.

---

### user_sessions

탭/유입 단위 활동창. 30분 비활동 시 EXPIRED.  
멀티탭, 유입 경로, A/B 테스트 등 세션 단위 측정이 필요한 경우에 사용.

| 컬럼          | 타입                                              | 설명                      |
| ------------- | ------------------------------------------------- | ------------------------- |
| id            | UUID PK                                           | 세션 ID                   |
| device_id     | UUID FK → devices.id                              | 기기 ID                   |
| user_id       | UUID FK → users.id NULLABLE                       | 로그인 유저 ID (있으면)   |
| segment       | ENUM('A','B','C','D') NULLABLE                    | 사용자 세그먼트           |
| ab_variant    | VARCHAR(100) NULLABLE                             | A/B 테스트 변형           |
| status        | ENUM('ACTIVE','COMPLETED','EXPIRED')              | 상태                      |
| entry_path    | VARCHAR(255)                                      | 진입 경로                 |
| referrer      | TEXT NULLABLE                                     | 유입 경로                 |
| started_at    | TIMESTAMP WITH TIME ZONE                          | 세션 시작 시간            |
| last_seen_at  | TIMESTAMP WITH TIME ZONE                          | 마지막 활동 시간          |
| completed_at  | TIMESTAMP WITH TIME ZONE NULLABLE                 | 완료 시간                 |
| expires_at    | TIMESTAMP WITH TIME ZONE                          | 만료 시간                 |
| created_at    | TIMESTAMP WITH TIME ZONE                          | 생성일                    |
| updated_at    | TIMESTAMP WITH TIME ZONE                          | 수정일                    |

예시:

```json
{
  "device_id": "dev_abc123",
  "segment": "A",
  "status": "ACTIVE",
  "referrer": "https://instagram.com/..."
}
```

---

### session_events

클릭, 노출, CTA, 이탈 등 분석용 이벤트. 세션 단위로만 저장.

| 컬럼        | 타입                      | 설명                |
| ----------- | ------------------------- | ------------------- |
| id          | UUID PK                   | 이벤트 ID           |
| session_id  | UUID FK → user_sessions   | 세션 ID             |
| device_id   | UUID FK → devices.id      | 기기 ID             |
| event_name  | VARCHAR(100)              | 이벤트 이름         |
| screen      | VARCHAR(100)              | 화면명              |
| element_id  | VARCHAR(100) NULLABLE     | 버튼/카드/태그 ID   |
| payload     | JSONB                     | 추가 데이터         |
| created_at  | TIMESTAMP WITH TIME ZONE  | 이벤트 발생 시간    |

> `user_id` 없음 — 분석 시에는 `session_id → device_id → user_id` 로 JOIN해서 사용.

예시:

```json
{
  "event_name": "segment_clicked",
  "screen": "landing",
  "element_id": "segment_A",
  "payload": {
    "label": "어디서부터 손댈지 모름"
  }
}
```

---

## 2. Fact / 질문 구조

### fact_definitions

서비스에서 사용할 수 있는 사용자 상태값 정의.

| 컬럼        | 타입                                                             | 설명          |
| ----------- | ---------------------------------------------------------------- | ------------- |
| id          | UUID PK                                                          | fact 정의 ID  |
| key         | VARCHAR(100) UNIQUE                                              | 고유 key      |
| label       | VARCHAR(200)                                                     | 관리자용 이름 |
| group       | ENUM('LIFE','ROUTINE','PRODUCT','CONTEXT','CATEGORY','REACTION') | 그룹          |
| value_type  | ENUM('BOOLEAN','ENUM','MULTI_ENUM','NUMBER','JSON')              | 값 타입       |
| options     | JSONB NULLABLE                                                   | 선택지        |
| is_active   | BOOLEAN DEFAULT true                                             | 활성 여부     |
| created_at  | TIMESTAMP WITH TIME ZONE                                         | 생성일        |
| updated_at  | TIMESTAMP WITH TIME ZONE                                         | 수정일        |

예시:

```json
{ "key": "life.recent_irritation", "label": "최근 자극 여부", "group": "LIFE", "value_type": "BOOLEAN" }
{ "key": "life.outdoor_activity", "label": "낮 야외 활동 시간", "group": "LIFE", "value_type": "ENUM", "options": ["under_1h","1_3h","over_3h"] }
{ "key": "routine.sunscreen_frequency", "label": "외출 시 선크림 사용 여부", "group": "ROUTINE", "value_type": "ENUM", "options": ["daily","sometimes","rarely","never"] }
```

---

### context_questions

사용자에게 실제로 보여줄 질문.

| 컬럼        | 타입                                                              | 설명            |
| ----------- | ----------------------------------------------------------------- | --------------- |
| id          | UUID PK                                                           | 질문 ID         |
| fact_key    | VARCHAR(100) FK → fact_definitions.key                           | 연결 fact       |
| title       | VARCHAR(200)                                                      | 관리자용 질문명 |
| question    | TEXT                                                              | 사용자 노출 질문 |
| input_type  | ENUM('BOOLEAN','SINGLE_SELECT','MULTI_SELECT','CHECKBOX','TAG')   | 입력 방식       |
| options     | JSONB NULLABLE                                                    | 선택지          |
| screen      | ENUM('priority_gate','context')                                   | 노출 화면       |
| ui_section  | VARCHAR(100)                                                      | 화면 내 박스    |
| sort_order  | INTEGER DEFAULT 0                                                 | 노출 순서       |
| is_active   | BOOLEAN DEFAULT true                                              | 활성 여부       |
| created_at  | TIMESTAMP WITH TIME ZONE                                          | 생성일          |
| updated_at  | TIMESTAMP WITH TIME ZONE                                          | 수정일          |

예시:

```json
{ "fact_key": "life.recent_irritation", "question": "최근 따가움, 붉어짐, 가려움 같은 문제가 있나요?", "screen": "priority_gate", "ui_section": "life_routine" }
{ "fact_key": "routine.cleansing_before_sleep", "question": "잠들기 전에 세안은 하고 자는 편인가요?", "screen": "priority_gate", "ui_section": "life_routine" }
{ "fact_key": "product.owned_categories", "question": "현재 사용 중인 제품을 선택해주세요.", "screen": "priority_gate", "ui_section": "owned_products" }
```

---

### question_visibility_conditions

질문 노출 조건.

`fact_definitions`에 등록된 fact_key라면 무엇이든 조건으로 사용할 수 있다.  
`category.selected`만 보는 테이블이 아니라, 사용자 상태 전반에 걸쳐 조건을 설정할 수 있다.

| 컬럼         | 타입                                           | 설명          |
| ------------ | ---------------------------------------------- | ------------- |
| id           | UUID PK                                        | 조건 ID       |
| question_id  | UUID FK → context_questions.id                 | 질문 ID       |
| fact_key     | VARCHAR(100) FK → fact_definitions.key         | 조건 fact     |
| operator     | ENUM('EQ','IN','CONTAINS','GTE','LTE','NEQ')   | 연산자        |
| value        | JSONB                                          | 비교값        |
| state        | ENUM('REQUIRED','EXCLUDED')                    | 조건 상태     |
| created_at   | TIMESTAMP WITH TIME ZONE                       | 생성일        |

**노출 조건 판단 기준:**
- `REQUIRED` 조건이 있으면 모두 충족해야 질문이 노출된다.
- `EXCLUDED` 조건이 하나라도 맞으면 질문이 노출되지 않는다.
- 조건이 없는 질문은 항상 노출된다.

**사용 가능한 fact_key 예시:**

| fact_key | 조건 예시 | 설명 |
|----------|-----------|------|
| `category.selected` | `EQ "sunscreen"` | 선크림 카테고리 선택 시만 노출 |
| `life.outdoor_activity` | `IN ["1_3h","over_3h"]` | 야외 활동 시간이 긴 경우만 노출 |
| `routine.sunscreen_frequency` | `IN ["rarely","never"]` | 선크림을 잘 안 쓰는 경우 노출 |
| `product.owned_categories` | `CONTAINS "retinol"` | 레티놀 사용 중인 경우 노출 |
| `context.usage_time` | `EQ "morning"` | 아침 사용 제품 고를 때만 노출 |
| `context.usage_place` | `EQ "outdoor"` | 야외 사용 제품 고를 때만 노출 |
| `preference.fragrance_sensitive` | `EQ true` | 향료 민감인 경우 노출 |
| `flow.concern` | `EQ "lip_chapped"` | 입술 갈라짐 고민에서 진입한 경우 노출 |

> **MVP 우선 사용 fact_key:** `category.selected`, `life.outdoor_activity`, `routine.sunscreen_frequency`, `product.owned_categories`, `context.usage_time`, `context.usage_place`

예시:

```
질문: 선크림을 바르면 눈이 시린 편인가요?
REQUIRED: category.selected EQ "sunscreen"

질문: 레티놀과 병행할 예정인가요?
REQUIRED: product.owned_categories CONTAINS "retinol"
EXCLUDED: life.recent_irritation EQ true

질문: 야외에서 덧바를 수 있는 형태가 필요한가요?
REQUIRED: category.selected EQ "sunscreen"
REQUIRED: context.usage_place EQ "outdoor"
```

---

### user_facts

사용자가 실제로 답한 값.

| 컬럼        | 타입                                                             | 설명                        |
| ----------- | ---------------------------------------------------------------- | --------------------------- |
| id          | UUID PK                                                          | 답변 ID                     |
| device_id   | UUID FK → devices.id                                             | 기기 ID                     |
| user_id     | UUID FK → users.id NULLABLE                                      | 로그인 시 병합, 비로그인 null |
| session_id  | UUID FK → user_sessions.id                                       | 어느 세션에서 답했는지      |
| fact_key    | VARCHAR(100) FK → fact_definitions.key                          | fact 키                     |
| value       | JSONB                                                            | 답변값                      |
| source      | ENUM('priority_gate','context','concern','traceback')            | 입력 출처                   |
| created_at  | TIMESTAMP WITH TIME ZONE                                         | 생성일                      |

> append-only 이력 테이블. 답변 수정 시 새 row INSERT.  
> 최신 값: `ORDER BY created_at DESC LIMIT 1`  
> 비로그인 조회: `WHERE device_id = ?` / 로그인 조회: `WHERE user_id = ?`
>
> `source = concern` row는 확정 답변이 아니라 concern preset에서 온 초기 선택 상태다.  
> 동일 fact_key에 대해 이후 `priority_gate` 또는 `context` row가 있으면 그 값을 우선 사용한다.

예시:

```json
{ "device_id": "dev_abc", "user_id": null, "session_id": "sess_001", "fact_key": "life.outdoor_activity", "value": "over_3h", "source": "priority_gate" }
{ "device_id": "dev_abc", "user_id": null, "session_id": "sess_001", "fact_key": "life.outdoor_activity", "value": "under_1h", "source": "priority_gate" }
{ "device_id": "dev_abc", "user_id": "user_123", "session_id": "sess_002", "fact_key": "life.outdoor_activity", "value": "under_1h", "source": "priority_gate" }
```

> 세 번째 row: 로그인 후 자동 병합으로 `user_id`가 채워진 상태.

---

## 3. Priority Gate Rule

### priority_rules

Priority Gate 결과를 만드는 Rule.

| 컬럼                    | 타입                                                | 설명              |
| ----------------------- | --------------------------------------------------- | ----------------- |
| id                      | UUID PK                                             | Rule ID           |
| name                    | VARCHAR(200)                                        | Rule 이름         |
| priority                | INTEGER                                             | 우선순위          |
| is_active               | BOOLEAN DEFAULT true                                | 활성 여부         |
| result_type             | ENUM('STOP','HOLD','CAUTION','PASS','ROUTE_CATEGORY') | 결과 타입       |
| result_title            | TEXT                                                | 결과 제목         |
| result_description      | TEXT                                                | 결과 설명         |
| hold_categories         | JSONB NULLABLE                                      | 보류 제품군       |
| recommend_category_id   | UUID FK → product_categories.id NULLABLE            | 추천 제품군       |
| cta_label               | VARCHAR(100) NULLABLE                               | CTA 문구          |
| cta_target              | VARCHAR(255) NULLABLE                               | CTA 이동 경로     |
| created_at              | TIMESTAMP WITH TIME ZONE                            | 생성일            |
| updated_at              | TIMESTAMP WITH TIME ZONE                            | 수정일            |

예시:

```json
{
  "name": "최근 자극 반복 → 새 제품 보류",
  "priority": 1,
  "result_type": "HOLD",
  "result_title": "지금은 새 제품보다 피부 반응 안정화가 먼저예요."
}
```

---

### priority_rule_conditions

Priority Rule 발동 조건.

| 컬럼        | 타입                                           | 설명      |
| ----------- | ---------------------------------------------- | --------- |
| id          | UUID PK                                        | 조건 ID   |
| rule_id     | UUID FK → priority_rules.id                    | Rule ID   |
| fact_key    | VARCHAR(100) FK → fact_definitions.key         | fact 키   |
| operator    | ENUM('EQ','IN','CONTAINS','GTE','LTE','NEQ')   | 연산자    |
| value       | JSONB                                          | 비교값    |
| state       | ENUM('REQUIRED','EXCLUDED')                    | 조건 상태 |
| created_at  | TIMESTAMP WITH TIME ZONE                       | 생성일    |

예시:

```
Rule: 선크림 루틴 우선
REQUIRED:
  - life.outdoor_activity IN ["1_3h", "over_3h"]
  - routine.sunscreen_frequency IN ["rarely", "never"]
EXCLUDED:
  - life.recent_irritation = true
```

---

### decision_runs

사용자에게 실제로 보여준 결과의 공통 실행 이력 테이블.  
Priority Gate뿐 아니라 Category Decision, Product Matrix 결과까지 저장한다.

`decision_runs`는 당시 사용자에게 실제로 보여준 결과 snapshot이며, 이력 조회 / 결과 복구 / 고객지원에 사용한다.  
`priority_rules`는 현재 Rule 기준이고, `decision_runs`는 그 시점에 실제로 발동된 결과 기록이다.

| 컬럼                     | 타입                                                                       | 설명                         |
| ------------------------ | -------------------------------------------------------------------------- | ---------------------------- |
| id                       | UUID PK                                                                    | 실행 기록 ID                 |
| device_id                | UUID FK → devices.id                                                       | 기기 ID                      |
| user_id                  | UUID FK → users.id NULLABLE                                                | 로그인 시 병합, 비로그인 null |
| session_id               | UUID FK → user_sessions.id                                                 | 세션 ID                      |
| decision_type            | ENUM('PRIORITY_GATE','CATEGORY_DECISION','PRODUCT_MATRIX','REACTION_TRACEBACK') | 결과 종류              |
| source_screen            | VARCHAR(100)                                                               | 발생 화면                    |
| category_id              | UUID FK → product_categories.id NULLABLE                                   | 대상 제품군                  |
| filter_state_id          | UUID FK → product_matrix_filter_states.id NULLABLE                         | 적용된 필터 상태 참조        |
| result_type              | VARCHAR(50) NULLABLE                                                       | 결과 타입 snapshot           |
| result_title             | TEXT NULLABLE                                                              | 결과 제목 snapshot           |
| result_description       | TEXT NULLABLE                                                              | 결과 설명 snapshot           |
| cta_label                | VARCHAR(100) NULLABLE                                                      | CTA 문구 snapshot            |
| cta_target               | VARCHAR(255) NULLABLE                                                      | CTA 경로 snapshot            |
| input_snapshot           | JSONB                                                                      | 당시 입력값 (user_facts 등)  |
| applied_filters_snapshot | JSONB                                                                      | 적용된 필터 목록 + attribute 조건 |
| result_snapshot          | JSONB                                                                      | 조회된 제품 목록, tags, cautions 등 |
| created_at               | TIMESTAMP WITH TIME ZONE                                                   | 생성일                       |

예시 (Product Matrix 결과):

```json
{
  "decision_type": "PRODUCT_MATRIX",
  "source_screen": "product_matrix",
  "category_id": "cat_sunscreen",
  "applied_filters_snapshot": {
    "filters": ["eye_sting_low", "spf_50_plus"],
    "attribute_conditions": [
      { "key": "eye_sting", "operator": "IN", "value": ["none","low"] },
      { "key": "spf", "operator": "GTE", "value": 50 }
    ]
  },
  "result_snapshot": {
    "products": [
      { "id": "prod_001", "name": "라운드랩 자작나무 선크림", "tags": ["눈시림 낮음","SPF50+"], "price_band": "UNDER_20000" }
    ]
  }
}
```

---

## 4. 제품 DB

### brands

| 컬럼        | 타입                      | 설명      |
| ----------- | ------------------------- | --------- |
| id          | UUID PK                   | 브랜드 ID |
| name        | VARCHAR(200) UNIQUE        | 브랜드명  |
| created_at  | TIMESTAMP WITH TIME ZONE  | 생성일    |
| updated_at  | TIMESTAMP WITH TIME ZONE  | 수정일    |

---

### product_categories

| 컬럼        | 타입                      | 설명      |
| ----------- | ------------------------- | --------- |
| id          | UUID PK                   | 제품군 ID |
| key         | VARCHAR(100) UNIQUE        | 영문 키   |
| name        | VARCHAR(100)              | 한글명    |
| description | TEXT NULLABLE             | 설명      |
| created_at  | TIMESTAMP WITH TIME ZONE  | 생성일    |
| updated_at  | TIMESTAMP WITH TIME ZONE  | 수정일    |

예시: `{ "key": "sunscreen", "name": "선크림" }`

---

### category_attribute_definitions

제품군별 속성 정의.

| 컬럼          | 타입                                                   | 설명          |
| ------------- | ------------------------------------------------------ | ------------- |
| id            | UUID PK                                                | 속성 정의 ID  |
| category_id   | UUID FK → product_categories.id                        | 제품군 ID     |
| key           | VARCHAR(100)                                           | 속성 키       |
| label         | VARCHAR(200)                                           | 속성 이름     |
| value_type    | ENUM('BOOLEAN','ENUM','NUMBER','MULTI_ENUM','STRING')   | 값 타입       |
| options       | JSONB NULLABLE                                         | 선택지        |
| is_required   | BOOLEAN DEFAULT false                                  | 필수 여부     |
| is_filterable | BOOLEAN DEFAULT false                                  | 필터 사용 여부|
| sort_order    | INTEGER DEFAULT 0                                      | 노출 순서     |
| created_at    | TIMESTAMP WITH TIME ZONE                               | 생성일        |
| updated_at    | TIMESTAMP WITH TIME ZONE                               | 수정일        |

예시 (선크림):

```json
{ "key": "spf", "label": "SPF", "value_type": "NUMBER" }
{ "key": "eye_sting", "label": "눈시림 위험", "value_type": "ENUM", "options": ["none","low","medium","high"] }
```

---

### products

| 컬럼        | 타입                                                    | 설명              |
| ----------- | ------------------------------------------------------- | ----------------- |
| id          | UUID PK                                                 | 제품 ID           |
| brand_id    | UUID FK → brands.id                                     | 브랜드 ID         |
| category_id | UUID FK → product_categories.id                         | 제품군 ID         |
| name        | VARCHAR(300)                                            | 제품명            |
| barcode     | VARCHAR(100) NULLABLE UNIQUE                            | 바코드            |
| price       | INTEGER                                                 | 가격              |
| price_band  | ENUM('UNDER_20000','BETWEEN_20000_50000','OVER_50000')  | 가격대            |
| volume      | VARCHAR(50) NULLABLE                                    | 용량              |
| image_url   | TEXT NULLABLE                                           | 이미지            |
| purchase_url| TEXT NULLABLE                                           | 구매 링크         |
| attributes  | JSONB                                                   | 제품군별 속성     |
| sort_order  | INTEGER DEFAULT 0                                       | 관리자 큐레이션 순서 |
| is_active   | BOOLEAN DEFAULT true                                    | 노출 여부         |
| created_at  | TIMESTAMP WITH TIME ZONE                                | 생성일            |
| updated_at  | TIMESTAMP WITH TIME ZONE                                | 수정일            |

예시 (선크림 attributes):

```json
{
  "spf": 50,
  "pa": "++++",
  "filter_type": "hybrid",
  "eye_sting": "low",
  "white_cast": "low",
  "texture": "light",
  "makeup_compatibility": "good",
  "portable": true
}
```

---

## 5. Product Filter Mapping

### product_filter_mappings

사용자의 구어체 선택값(user_facts)을 product attribute 조건으로 변환하는 매핑 테이블.  
"룰 엔진"이 아니다. 사용자가 "눈시림 있음"이라고 답했을 때, 이것이 제품 attribute 기준으로 `eye_sting IN ["none","low"]`와 같은 조건으로 변환된다는 매핑을 정의한다.

실제 제품 필터링은 이 매핑을 바탕으로 동적 SQL 또는 ORM where 조건을 생성해 `products` 테이블을 직접 조회하는 방식으로 수행한다.  
핵심은 `product.attributes`를 얼마나 잘 입력하느냐이고, 이 테이블은 그 연결고리다.

| 컬럼               | 타입                                                         | 설명                             |
| ------------------ | ------------------------------------------------------------ | -------------------------------- |
| id                 | UUID PK                                                      | ID                               |
| category_id        | UUID FK → product_categories.id NULLABLE                     | 적용 제품군 (null이면 전체 공통) |
| source_fact_key    | VARCHAR(100) FK → fact_definitions.key                       | 사용자 답변 fact                 |
| source_operator    | ENUM('EQ','IN','CONTAINS','GTE','LTE','NEQ')                 | 사용자 답변 조건 연산자          |
| source_value       | JSONB                                                        | 사용자 답변 비교값               |
| attribute_key      | VARCHAR(100)                                                 | 대상 product attribute 키        |
| attribute_operator | ENUM('EQ','IN','GTE','LTE','NEQ','CONTAINS')                 | attribute 조건 연산자            |
| attribute_value    | JSONB                                                        | attribute 비교값                 |
| filter_mode        | ENUM('HARD_FILTER','EXCLUDE','CAUTION','SORT','TAG')         | 처리 방식                        |
| filter_type        | ENUM('BASIC_CONDITION','PERSONALIZED')                       | 필터 종류 (좋은 제품 기준 vs 개인화) |
| filter_key         | VARCHAR(100)                                                 | 필터 식별 키 (UI 표시용)         |
| filter_label       | VARCHAR(100)                                                 | 필터 표시 이름                   |
| tag_label          | VARCHAR(100) NULLABLE                                        | 제품 카드 태그 문구              |
| caution_message    | TEXT NULLABLE                                                | △ 주의 표시 문구                 |
| sort_order         | INTEGER DEFAULT 0                                            | 필터 정렬 순서                   |
| is_active          | BOOLEAN DEFAULT true                                         | 활성 여부                        |
| created_at         | TIMESTAMP WITH TIME ZONE                                     | 생성일                           |
| updated_at         | TIMESTAMP WITH TIME ZONE                                     | 수정일                           |

**filter_mode 정의:**

| mode | 의미 |
|------|------|
| `HARD_FILTER` | attribute 조건을 WHERE에 추가해 제품 자체를 제외 |
| `EXCLUDE` | 제품은 남기되 "제외 권장" 처리 (사용자 확인 후 선택 가능) |
| `CAUTION` | 제품은 남기되 △ 주의 태그 표시 |
| `SORT` | 조건 만족 제품을 상위 노출 |
| `TAG` | 조건 만족 제품에 태그 부여 |

**매핑 예시:**

| source_fact_key | source 조건 | attribute_key | attribute 조건 | filter_mode | filter_label |
|-----------------|-------------|---------------|----------------|-------------|--------------|
| `context.eye_sting` | `EQ true` | `eye_sting` | `IN ["none","low"]` | `HARD_FILTER` | 눈시림 낮음 |
| `life.outdoor_activity` | `IN ["1_3h","over_3h"]` | `spf` | `GTE 50` | `HARD_FILTER` | 야외 사용 적합 |
| `context.white_cast_sensitive` | `EQ true` | `white_cast` | `IN ["none","low"]` | `HARD_FILTER` | 백탁 없음 |
| `preference.fragrance_sensitive` | `EQ true` | `fragrance` | `EQ false` | `HARD_FILTER` | 향료 없음 |
| `context.usage_place` | `EQ "outdoor"` | `spf` | `GTE 50` | `TAG` | 야외 사용 적합 |

### Product Matrix 조회 방식

제품은 큐레이트된 DB에 있고, 핵심은 `product.attributes`를 잘 입력하는 것이다.  
`product_filter_mappings`는 사용자 답변과 attribute 조건 사이의 번역기 역할만 한다.

```
1. 사용자 답변(user_facts) 또는 product_matrix_filter_states 조회
2. product_filter_mappings 또는 코드 상수로 attribute 조건 변환
3. 동적 SQL / ORM where 조건 생성
4. products 테이블 조회 (filter_type=BASIC_CONDITION + PERSONALIZED 조건 모두 적용)
5. avoidance_rules 적용 (application code)
   - avoidance_rules WHERE device_id = ? → ingredient_group_id
   - ingredient_group_members WHERE ingredient_group_id IN (...)  → ingredient_id 집합
   - product_ingredients WHERE ingredient_id IN (...) → product_id 집합
   - AVOID 규칙: 해당 product_id 목록에서 제품 제외
   - CAUTION 규칙: 해당 product_id에 △ 주의 태그 부여
6. 제품 카드에 tag / caution 부여
7. products.sort_order 기준으로 정렬 (관리자 큐레이션 순서)
8. decision_runs에 결과 snapshot 저장
```

SQL 예시:

```sql
SELECT *
FROM products
WHERE category_id = :category_id
  AND is_active = true
  AND attributes->>'eye_sting' IN ('none', 'low')
  AND (attributes->>'spf')::int >= 50;
```

---

## 6. Product Matrix Filter States

### product_matrix_filter_states

사용자가 Product Matrix에서 선택한 필터 상태를 저장하는 테이블.

| 컬럼        | 타입                                                                         | 설명                         |
| ----------- | ---------------------------------------------------------------------------- | ---------------------------- |
| id          | UUID PK                                                                      | ID                           |
| device_id   | UUID FK → devices.id                                                         | 기기 ID                      |
| user_id     | UUID FK → users.id NULLABLE                                                  | 로그인 시 병합, 비로그인 null |
| session_id  | UUID FK → user_sessions.id                                                   | 세션 ID                      |
| category_id | UUID FK → product_categories.id                                              | 제품군                       |
| source      | ENUM('DIRECT','CATEGORY_DECISION_CTA','MANUAL','RESTORED')                   | 필터 상태 생성 경로          |
| filters     | JSONB                                                                        | 현재 적용된 필터 목록        |
| is_active   | BOOLEAN DEFAULT true                                                         | 활성 여부                    |
| created_at  | TIMESTAMP WITH TIME ZONE                                                     | 생성일                       |
| updated_at  | TIMESTAMP WITH TIME ZONE                                                     | 수정일                       |

**source 정의:**

| source | 설명 |
|--------|------|
| `DIRECT` | 직접 Product Matrix 접근 (기존 filter_state 복원) |
| `CATEGORY_DECISION_CTA` | Category Decision 결과에서 CTA로 진입, context 답변 기반 필터 자동 생성 |
| `MANUAL` | 사용자가 필터를 직접 추가/삭제 |
| `RESTORED` | 이전 session에서 복원 |

**동작 방식:**

- Product Matrix 단순 접근 시: 해당 category의 최신 active filter_state 조회해서 복원
- Category Decision CTA 진입 시: context 답변을 `product_filter_mappings`로 변환해 새 filter_state 생성
- Concern preset이 있고 최종 `category.selected`가 `suggested_category`와 일치하면 `suggested_filters`를 `CONCERN_PRESET` source_type으로 합성
- 사용자가 필터 추가/삭제: `filters` JSONB 업데이트 + `session_events`에 이벤트 저장
- 실제 조회 결과는 `decision_runs`에 snapshot으로 저장

> 화면 재조회는 `decision_runs` snapshot을 재사용하지 말고, `product_matrix_filter_states`를 기준으로 현재 `products`를 다시 조회한다. snapshot은 이력/고객지원용이다.

**filters 항목별 source_type:**

| source_type | 의미 |
|-------------|------|
| `BASIC_CONDITION` | 해당 제품군의 "좋은 제품의 조건" — 관리자가 코드 상수로 정의, 기본 선택 상태 |
| `PERSONALIZED` | 사용자 답변(user_facts)에서 변환된 개인화 필터 — `product_filter_mappings` 경유 |
| `MANUAL` | 사용자가 직접 추가/삭제한 필터 |
| `TRACEBACK` | Reaction Traceback avoidance_rules에서 자동 생성된 필터 |
| `CONCERN_PRESET` | Concern preset의 `suggested_filters`가 최종 category와 일치해 Product Matrix에 반영된 힌트 필터 |

예시:

```json
{
  "category_id": "cat_sunscreen",
  "source": "CATEGORY_DECISION_CTA",
  "filters": [
    { "filter_key": "spf_50_plus",   "label": "SPF 50+",   "source_type": "BASIC_CONDITION", "attribute_key": "spf",       "operator": "GTE", "value": 50 },
    { "filter_key": "eye_sting_low", "label": "눈시림 낮음", "source_type": "PERSONALIZED",   "attribute_key": "eye_sting", "operator": "IN",  "value": ["none","low"] }
  ]
}
```

---

## 7. 성분 / Reaction Traceback

### ingredients

| 컬럼        | 타입                      | 설명        |
| ----------- | ------------------------- | ----------- |
| id          | UUID PK                   | 성분 ID     |
| name_ko     | VARCHAR(200)              | 한글 성분명 |
| name_en     | VARCHAR(200)              | 영문 성분명 |
| inci_name   | VARCHAR(300) NULLABLE      | INCI 이름   |
| created_at  | TIMESTAMP WITH TIME ZONE  | 생성일      |
| updated_at  | TIMESTAMP WITH TIME ZONE  | 수정일      |

---

### product_ingredients

| 컬럼           | 타입                      | 설명         |
| -------------- | ------------------------- | ------------ |
| id             | UUID PK                   | ID           |
| product_id     | UUID FK → products.id     | 제품 ID      |
| ingredient_id  | UUID FK → ingredients.id  | 성분 ID      |
| order_index    | INTEGER                   | 전성분 순서  |
| raw_text       | TEXT NULLABLE             | 원문         |
| created_at     | TIMESTAMP WITH TIME ZONE  | 생성일       |

제약: `UNIQUE (product_id, ingredient_id)`

---

### ingredient_groups

| 컬럼        | 타입                      | 설명        |
| ----------- | ------------------------- | ----------- |
| id          | UUID PK                   | 성분군 ID   |
| key         | VARCHAR(100) UNIQUE        | 키          |
| name        | VARCHAR(200)              | 이름        |
| description | TEXT NULLABLE             | 설명        |
| created_at  | TIMESTAMP WITH TIME ZONE  | 생성일      |
| updated_at  | TIMESTAMP WITH TIME ZONE  | 수정일      |

---

### ingredient_group_members

| 컬럼                  | 타입                           | 설명        |
| --------------------- | ------------------------------ | ----------- |
| id                    | UUID PK                        | ID          |
| ingredient_id         | UUID FK → ingredients.id       | 성분 ID     |
| ingredient_group_id   | UUID FK → ingredient_groups.id | 성분군 ID   |

제약: `UNIQUE (ingredient_id, ingredient_group_id)`

---

### reaction_reports

사용자의 문제 반응 기록.

| 컬럼            | 타입                              | 설명                        |
| --------------- | --------------------------------- | --------------------------- |
| id              | UUID PK                           | 리포트 ID                   |
| device_id       | UUID FK → devices.id              | 기기 ID                     |
| user_id         | UUID FK → users.id NULLABLE       | 로그인 시 병합, 비로그인 null |
| session_id      | UUID FK → user_sessions.id        | 세션 ID                     |
| symptoms        | JSONB                             | 증상                        |
| affected_areas  | JSONB                             | 부위                        |
| onset_timing    | VARCHAR(100) NULLABLE             | 발현 시점                   |
| memo            | TEXT NULLABLE                     | 메모                        |
| created_at      | TIMESTAMP WITH TIME ZONE          | 생성일                      |
| updated_at      | TIMESTAMP WITH TIME ZONE          | 수정일                      |

---

### reaction_report_products

문제 상품 / 괜찮은 상품 등록.

| 컬럼         | 타입                               | 설명         |
| ------------ | ---------------------------------- | ------------ |
| id           | UUID PK                            | ID           |
| report_id    | UUID FK → reaction_reports.id      | 리포트 ID    |
| product_id   | UUID FK → products.id              | 제품 ID      |
| type         | ENUM('PROBLEM','OK')               | 상품 유형    |
| used_period  | VARCHAR(100) NULLABLE              | 사용 기간    |
| used_count   | INTEGER NULLABLE                   | 사용 횟수    |
| created_at   | TIMESTAMP WITH TIME ZONE           | 생성일       |

---

### suspected_causes

원인 후보 성분군.

| 컬럼                  | 타입                               | 설명          |
| --------------------- | ---------------------------------- | ------------- |
| id                    | UUID PK                            | ID            |
| report_id             | UUID FK → reaction_reports.id      | 리포트 ID     |
| ingredient_group_id   | UUID FK → ingredient_groups.id     | 성분군 ID     |
| confidence            | ENUM('LOW','MEDIUM','HIGH')        | 신뢰도        |
| reason                | TEXT NULLABLE                      | 추정 이유     |
| created_at            | TIMESTAMP WITH TIME ZONE           | 생성일        |

---

### avoidance_rules

다음 선택에 반영할 회피 / 주의 규칙.

| 컬럼                  | 타입                                | 설명                        |
| --------------------- | ----------------------------------- | --------------------------- |
| id                    | UUID PK                             | ID                          |
| device_id             | UUID FK → devices.id                | 기기 ID                     |
| user_id               | UUID FK → users.id NULLABLE         | 로그인 시 병합, 비로그인 null |
| ingredient_group_id   | UUID FK → ingredient_groups.id      | 성분군 ID                   |
| action                | ENUM('AVOID','CAUTION')             | 행동                        |
| reason                | TEXT NULLABLE                       | 이유                        |
| is_active             | BOOLEAN DEFAULT true                | 활성 여부                   |
| created_at            | TIMESTAMP WITH TIME ZONE            | 생성일                      |
| updated_at            | TIMESTAMP WITH TIME ZONE            | 수정일                      |

---

## 8. MVP 사전

### Fact Key 사전

사용자 상태값(user_facts)으로 저장 가능한 전체 key 목록.

| fact_key | group | value_type | 설명 |
|----------|-------|------------|------|
| `life.recent_irritation` | LIFE | BOOLEAN | 최근 따가움·붉어짐·가려움 같은 문제 여부 |
| `life.outdoor_activity` | LIFE | ENUM | 낮 야외 활동 시간 (`under_1h` / `1_3h` / `over_3h`) |
| `routine.sunscreen_use` | ROUTINE | BOOLEAN | 외출 시 선크림 사용 여부 파생값 |
| `routine.sunscreen_frequency` | ROUTINE | ENUM | 외출 시 선크림 사용 빈도 (`daily` / `sometimes` / `rarely` / `never`) |
| `routine.sunscreen_reapply` | ROUTINE | BOOLEAN | 선크림을 들고 다니며 덧바르는지 |
| `routine.cleansing_stable` | ROUTINE | BOOLEAN | 1차 세안 제품(오일/밤/워터/패드)을 따로 쓰는지 |
| `routine.foam_enough` | ROUTINE | BOOLEAN | 클렌징 폼 거품을 충분히 내서 쓰는지 |
| `routine.eye_irritation_history` | ROUTINE | BOOLEAN | 화장/세안 중 눈 자극 경험이 잦은지 |
| `routine.recent_dry_tight` | ROUTINE | BOOLEAN | 세안 후 당김·건조·따가움 같은 문제 여부 |
| `routine.makeup_frequent` | ROUTINE | BOOLEAN | 선크림 위에 베이스 메이크업을 자주 올리는지 |
| `routine.brush_wash_cycle` | ROUTINE | ENUM | 브러시 마지막 세척 시점 (`under_1_week` / `1_to_2_weeks` / `over_2_weeks` / `not_applicable`) |
| `routine.puff_age` | ROUTINE | ENUM | 퍼프 사용 기간 (`under_1_month` / `1_to_3_months` / `over_3_months` / `not_applicable`) |
| `routine.pillowcase_change_cycle` | ROUTINE | ENUM | 배갯잎 마지막 교체 시점 (`under_3_days` / `3_to_7_days` / `over_7_days` / `not_sure`) |
| `routine.morning_face_condition` | ROUTINE | ENUM | 기상 직후 얼굴 상태 (`comfortable` / `oily_sticky` / `dry_tight` / `new_bumps`) |
| `routine.bedtime_routine` | ROUTINE | BOOLEAN | 취침 전 스킨케어 루틴 여부 |
| `routine.cleansing_before_sleep` | ROUTINE | BOOLEAN | 취침 전 세안 여부 |
| `product.owned_categories` | PRODUCT | MULTI_ENUM | 현재 사용 중인 제품군 목록 |
| `category.selected` | CATEGORY | ENUM | 선택한 제품군 key (`sunscreen` / `serum` / `lipcare` 등) |
| `context.usage_place` | CONTEXT | ENUM | 사용 장소 (`outdoor` / `indoor`) |
| `context.usage_time` | CONTEXT | ENUM | 사용 시간대 (`morning` / `night`) |
| `context.portable` | CONTEXT | BOOLEAN | 외출 시 휴대 필요 여부 |
| `context.eye_sting` | CONTEXT | BOOLEAN | 선크림 사용 시 눈시림 경험 여부 |
| `context.white_cast_sensitive` | CONTEXT | BOOLEAN | 백탁에 민감한 여부 |
| `context.makeup_use` | CONTEXT | BOOLEAN | 선크림 위에 베이스 메이크업 사용 여부 |
| `preference.fragrance_sensitive` | CONTEXT | BOOLEAN | 향료 민감 여부 |
| `preference.menthol_sensitive` | CONTEXT | BOOLEAN | 멘톨·화한 사용감 불편 여부 |

---

### Product Attribute 사전

`products.attributes` JSONB에 저장되는 제품군별 속성 key 목록.  
`category_attribute_definitions`에도 동일하게 등록된다.

#### 선크림 (sunscreen)

| key | value_type | 설명 | 예시 값 |
|-----|------------|------|---------|
| `spf` | NUMBER | SPF 수치 | `50` |
| `pa` | ENUM | PA 등급 | `+` / `++` / `+++` / `++++` |
| `filter_type` | ENUM | 자외선 차단 필터 종류 | `physical` / `chemical` / `hybrid` |
| `eye_sting` | ENUM | 눈시림 위험 정도 | `none` / `low` / `medium` / `high` |
| `white_cast` | ENUM | 백탁 정도 | `none` / `low` / `medium` / `high` |
| `texture` | ENUM | 텍스처 | `light` / `medium` / `rich` |
| `sticky` | ENUM | 끈적임 정도 | `none` / `low` / `medium` / `high` |
| `makeup_compatibility` | ENUM | 메이크업 궁합 | `good` / `fair` / `poor` |
| `portable` | BOOLEAN | 휴대형 여부 | `true` / `false` |
| `fragrance` | BOOLEAN | 향료 포함 여부 | `true` / `false` |

#### 세럼 (serum)

| key | value_type | 설명 | 예시 값 |
|-----|------------|------|---------|
| `active_ingredients` | MULTI_ENUM | 주요 활성 성분 | `retinol` / `vitamin_c` / `niacinamide` / `peptide` |
| `irritation_risk` | ENUM | 자극 가능성 | `low` / `medium` / `high` |
| `conflict_ingredients` | MULTI_ENUM | 병행 주의 성분 | `aha` / `bha` / `retinol` / `vitamin_c` |
| `usage_time` | ENUM | 사용 시간대 | `morning` / `night` / `both` |
| `effect_timeline` | ENUM | 기대 시차 | `fast` / `gradual` |
| `texture` | ENUM | 제형 | `water` / `oil` / `gel` / `cream` |
| `fragrance` | BOOLEAN | 향료 포함 여부 | `true` / `false` |

#### 립케어 (lipcare)

| key | value_type | 설명 | 예시 값 |
|-----|------------|------|---------|
| `menthol` | BOOLEAN | 멘톨 포함 여부 | `true` / `false` |
| `fragrance` | BOOLEAN | 향료 포함 여부 | `true` / `false` |
| `spf` | NUMBER | SPF 수치 (없으면 0) | `15` / `0` |
| `moisture_lasting` | ENUM | 보습 지속력 | `low` / `medium` / `high` |
| `form` | ENUM | 제형 | `stick` / `tube` / `balm` / `tint` |
| `portable` | BOOLEAN | 휴대 편의성 | `true` / `false` |

---

### Filter Key 사전

`product_filter_mappings.filter_key` 및 `product_matrix_filter_states.filters[].filter_key`에서 사용하는 전체 키 목록.

#### 선크림 (sunscreen)

| filter_key | filter_type | 설명 |
|------------|-------------|------|
| `spf_50_plus` | BASIC_CONDITION | SPF 50 이상 |
| `pa_4_plus` | BASIC_CONDITION | PA++++ |
| `eye_sting_low` | BASIC_CONDITION | 눈시림 낮음 |
| `white_cast_low` | BASIC_CONDITION | 백탁 적음 |
| `makeup_compat_good` | BASIC_CONDITION | 메이크업 궁합 |
| `outdoor_use` | PERSONALIZED | 야외 활동 적합 (spf≥50) |
| `no_eye_sting` | PERSONALIZED | 눈시림 경험 있는 사용자 맞춤 |
| `no_white_cast` | PERSONALIZED | 백탁 민감 사용자 맞춤 |
| `no_fragrance` | PERSONALIZED | 향료 민감 맞춤 |
| `portable` | PERSONALIZED | 휴대형 |

#### 세럼 (serum)

| filter_key | filter_type | 설명 |
|------------|-------------|------|
| `low_irritation` | BASIC_CONDITION | 자극 가능성 낮음 |
| `no_fragrance` | PERSONALIZED | 향료 민감 맞춤 |
| `morning_use` | PERSONALIZED | 아침 사용 적합 |
| `night_use` | PERSONALIZED | 밤 사용 적합 |
| `no_conflict_retinol` | PERSONALIZED | 레티놀 병행 주의 |
| `no_conflict_vitamin_c` | PERSONALIZED | 비타민C 병행 주의 |

#### 립케어 (lipcare)

| filter_key | filter_type | 설명 |
|------------|-------------|------|
| `high_moisture` | BASIC_CONDITION | 보습 지속력 높음 |
| `no_menthol` | BASIC_CONDITION | 멘톨 없음 |
| `low_fragrance` | BASIC_CONDITION | 향료 적음 |
| `no_menthol_sensitive` | PERSONALIZED | 멘톨 민감 사용자 맞춤 |
| `no_fragrance` | PERSONALIZED | 향료 민감 맞춤 |
| `spf_included` | PERSONALIZED | 야외 사용 SPF 포함 |
| `portable` | PERSONALIZED | 휴대형 |
