> 테이블 메타데이터
> 현실 문제를 DB 테이블로 매핑하는 과정이 정리되어있음

# Skincare Decision — DB 모델링

데이터 구조 (테이블, 컬럼)

---

## 0. 공통 규약 (Identity · Timestamp · Naming)

### 0.1 식별자 / 시각 컬럼 규약

- **UUID 는 모두 UUIDv7** 이다. (시간 정렬 가능 / BTREE 친화적 / PK 분포 무작위 회피)  
  본 문서에서 `UUID PK`, `UUID FK …` 로 표기된 모든 컬럼이 해당된다.
- **모든 시각 컬럼은 `TIMESTAMPTZ`** (UTC 저장, 표시 변환은 클라이언트 책임).
- 모든 테이블의 라이프사이클 컬럼은 다음 3종을 표준으로 둔다:

  | 컬럼         | 타입          | NULL? | 기본값                 | 갱신 시점                                |
  | ------------ | ------------- | ----- | ---------------------- | ---------------------------------------- |
  | `created_at` | `TIMESTAMPTZ` | NO    | `now()`                | INSERT 시 자동                           |
  | `updated_at` | `TIMESTAMPTZ` | YES   | (없음, INSERT 시 NULL) | UPDATE 발생 시 application/Prisma가 채움 |
  | `deleted_at` | `TIMESTAMPTZ` | YES   | (없음, 평소 NULL)      | 소프트 삭제 시 채움 → 조회 기본 필터링   |

  > **`updated_at` 는 INSERT 시 NULL** 이다. "한 번도 갱신되지 않았다" 와 "갱신 시각" 을 한 컬럼으로 표현한다.  
  > append-only / bridge / event 테이블(`session_events`, `decision_runs`, `priority_rule_conditions`, `question_visibility_conditions`, `product_ingredients`, `ingredient_group_members`, `reaction_report_products`, `suspected_causes`)은 `updated_at` / `deleted_at` 을 두지 않는다.  
  > **current-state 예외**: `user_responses`는 질문별 현재 답변 상태이므로 `updated_at`은 두지만 `deleted_at`은 두지 않는다. 답변 해제는 row 삭제로 처리하고, 변경 이력은 `session_events`가 보존한다.
  > **dimension/transaction 테이블 예외**: `user_sessions` 는 한 번 INSERT 된 뒤 런타임 상태가 갱신되지 않으므로 `updated_at` 을 두지 않지만, 운영 audit 목적으로 `deleted_at` 은 유지한다. 로그인 연결 시각은 별도 컬럼 `logged_in_at` 으로 명시.

### 0.2 명명 규칙 (Naming Convention)

| 대상                | 규칙                                       | 예시                                                      |
| ------------------- | ------------------------------------------ | --------------------------------------------------------- |
| 테이블              | `snake_case` + 복수형                      | `users`, `user_sessions`, `product_categories`            |
| 컬럼                | `snake_case`                               | `created_at`, `user_id`, `product_name`                   |
| PK 컬럼             | `id`                                       | `id`                                                      |
| FK 컬럼             | `<참조 테이블 단수>_id`                    | `user_id`, `product_id`, `category_id`                    |
| 타임스탬프 컬럼     | `created_at` / `updated_at` / `deleted_at` | 위 0.1 참조                                               |
| Boolean 컬럼        | `is_` / `has_` / `can_` prefix             | `is_active`, `has_children`, `can_publish`                |
| UNIQUE 인덱스       | `uq_<table>_<columns>`                     | `uq_users_email`, `uq_products_slug`                      |
| 일반 인덱스         | `idx_<table>_<columns>`                    | `idx_users_created_at`, `idx_orders_user_id_created_at`   |
| FK 제약             | `fk_<table>_<column>`                      | `fk_orders_user_id`, `fk_order_items_order_id`            |
| PK 제약             | `pk_<table>`                               | `pk_users`, `pk_products`                                 |
| CHECK 제약          | `chk_<table>_<meaning>`                    | `chk_products_price_positive`, `chk_users_age_range`      |
| 조인(브리지) 테이블 | 두 테이블 조합 (단수-복수)                 | `product_categories`, `user_roles`, `product_ingredients` |
| Enum 타입           | `<table>_<column>_enum`                    | `users_role_enum`, `products_price_band_enum`             |

> **공용 enum 예외**: 동일 의미의 enum이 여러 테이블·컬럼에서 재사용되는 경우(예: 비교 연산자, REQUIRED/EXCLUDED 조건 상태)는 테이블별 분리 대신 의미 단위 단일 enum을 둔다. 본 문서에서는 `comparison_operator_enum`, `condition_state_enum` 두 가지만 예외로 인정한다. 자세한 매핑은 [db_schema_validation.md §0.2](db_schema_validation.md#02-enum-정의) 참조.

---

## 테이블 목록

| #   | 테이블명                       | 분류             |
| --- | ------------------------------ | ---------------- |
| 1   | users                          | 사용자           |
| 2   | devices                        | 사용자           |
| 3   | user_sessions                  | 사용자           |
| 4   | session_events                 | 사용자           |
| 5   | questions                      | 질문 기준        |
| 6   | question_variants              | 질문 기준        |
| 7   | question_visibility_conditions | 질문 조건        |
| 8   | user_responses                 | 질문 응답        |
| 9   | priority_rules                 | Priority Gate    |
| 10  | priority_rule_conditions       | Priority Gate    |
| 11  | decision_runs                  | 실행 이력 (공통) |
| 12  | brands                         | 제품 DB          |
| 13  | product_categories             | 제품 DB          |
| 14  | category_attribute_definitions | 제품 DB          |
| 15  | products                       | 제품 DB          |
| 16  | product_matrix_filter_states   | Product Matrix   |
| 17  | product_filter_mappings        | Product Filter   |
| 18  | ingredients                    | 성분 / Traceback |
| 19  | product_ingredients            | 성분 / Traceback |
| 20  | ingredient_groups              | 성분 / Traceback |
| 21  | ingredient_group_members       | 성분 / Traceback |
| 22  | reaction_reports               | 성분 / Traceback |
| 23  | reaction_report_products       | 성분 / Traceback |
| 24  | suspected_causes               | 성분 / Traceback |
| 25  | avoidance_rules                | 성분 / Traceback |

### MVP에서 제거된 테이블

| 테이블명                  | 제거 이유                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| concern_groups            | Concern 태그는 프론트 상수로 관리. DB 불필요                                                              |
| concern_tags              | 동일                                                                                                      |
| concern_category_mappings | 동일. 태그 → `route_target`, `preset_facts`, `suggested_category`, `suggested_filters`는 코드 상수로 처리 |

> **Concern Mapper / 고민 캐러셀은 DB 관리 대상이 아니다.**  
> 태그 목록과 태그 → `route_target` / `preset_facts` / `suggested_category` / `suggested_filters` 매핑은 프론트엔드 상수(코드)로 관리한다.  
> 태그 클릭 이벤트는 `session_events`에 `concern_clicked`로 저장하고,  
> `user_responses`에는 `source = concern` row로 concern 내부값을 저장하고, 필요하면 `preset_facts`도 같은 source로 저장할 수 있다.  
> 단 `source = concern`은 확정 답변이 아니라 초기 선택 상태이며, 이후 `priority_gate` / `context`에서 사용자가 직접 답한 값이 최종 판단에 우선한다.
>
> 예시 흐름:
>
> ```
> [여드름] 클릭
>   → session_events: { event_name: "concern_clicked", payload: { concern: "acne" } }
>   → 프론트 상수에서 route_target = "priority_gate", suggested_category = "cleanser" 결정
>   → user_responses: { question_id: "<flow.concern question id>", question_variant_id: null, value: 1, source: "concern" }
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

-- 2. 이 기기의 세션들에 user_id + logged_in_at 채우기
UPDATE user_sessions
  SET user_id = :user_id,
      logged_in_at = now()
  WHERE device_id = :device_id AND user_id IS NULL;

-- 3. 사용자 응답 병합
-- user_responses는 question별 current-state 이므로
-- (user_id, question_id) 충돌 시 updated_at 이 더 최신인 row를 유지하고 나머지는 삭제한다.
-- 자세한 unique/index 정책은 user_responses 섹션 참고.
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
     └─ user_sessions  ← 탭/유입 단위 dimension (logged_in_at 외 mutate 없음)
         └─ session_events  ← 클릭·노출·A/B 이벤트

devices + users
 ├─ user_responses                (device_id + user_id nullable)
 ├─ decision_runs                 (device_id + user_id nullable)
 ├─ product_matrix_filter_states  (device_id + user_id nullable)
 ├─ reaction_reports              (device_id + user_id nullable)
 │    ├─ reaction_report_products
 │    └─ suspected_causes
 └─ avoidance_rules               (device_id + user_id nullable)

questions
 ├─ question_variants
 │    └─ question_visibility_conditions
 ├─ user_responses                  (canonical question_id)
 ├─ question_visibility_conditions  (condition 기준 질문)
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

| 컬럼       | 타입                 | 설명    |
| ---------- | -------------------- | ------- |
| id         | UUID PK              | 유저 ID |
| email      | VARCHAR(255) UNIQUE  | 이메일  |
| name       | VARCHAR(100)         | 이름    |
| role       | ENUM('USER','ADMIN') | 역할    |
| created_at | TIMESTAMPTZ          | 생성일  |
| updated_at | TIMESTAMPTZ          | 수정일  |

---

### devices

브라우저/기기 단위 영구 신원. cookie 또는 localStorage에 `device_id` 저장.

| 컬럼         | 타입                        | 설명                              |
| ------------ | --------------------------- | --------------------------------- |
| id           | UUID PK                     | device_id (브라우저에 저장)       |
| user_id      | UUID FK → users.id NULLABLE | 로그인 시 연결, 비로그인이면 null |
| last_seen_at | TIMESTAMPTZ                 | 마지막 활동 시간                  |
| created_at   | TIMESTAMPTZ                 | 최초 방문일                       |

> 시크릿 모드 / cookie 초기화 시 새 device_id 발급 → 이전 데이터와 단절. 이는 의도된 동작.

---

### user_sessions

**dimension / transaction 테이블**. session 의 "활동창" 을 런타임 관리하지 않는다 — `status` / `started_at` / `last_seen_at` / `completed_at` / `expires_at` / `updated_at` 컬럼이 없고, 세션이라는 row 가 일단 INSERT 되면 그 자체로 유입 컨텍스트의 단위 dimension 으로 동작한다. session 의 종료/타임아웃은 별도 컬럼이 아닌 후행 이벤트(`session_events`) 의 created_at 분포로 분석한다.

| 컬럼         | 타입                        | 설명                                                                |
| ------------ | --------------------------- | ------------------------------------------------------------------- |
| id           | UUID PK                     | 세션 ID                                                             |
| device_id    | UUID FK → devices.id        | 기기 ID                                                             |
| user_id      | UUID FK → users.id NULLABLE | 로그인 유저 ID (있으면). 로그인-병합 트랜잭션이 채움                |
| entry_path   | VARCHAR(255)                | 진입 경로                                                           |
| referrer     | TEXT NULLABLE               | 외부 referrer                                                       |
| logged_in_at | TIMESTAMPTZ NULLABLE        | 이 세션이 로그인으로 user_id 에 연결된 시각. 비로그인 진입이면 NULL |
| created_at   | TIMESTAMPTZ                 | 세션 row 생성 시각 (= 세션 시작)                                    |
| deleted_at   | TIMESTAMPTZ NULLABLE        | 소프트 삭제 (audit 목적 외 거의 NULL)                               |

> `started_at` 은 `created_at` 으로 충분 (둘이 항상 같다). `updated_at` 은 dimension 테이블이므로 두지 않는다 — 로그인 발생 시점은 `logged_in_at` 으로 별도 컬럼으로 명시한다.

예시:

```json
{
  "id": "01935b8f-...",
  "device_id": "dev_abc123",
  "user_id": null,
  "entry_path": "/concern/acne",
  "referrer": "https://instagram.com/...",
  "logged_in_at": null,
  "created_at": "2026-05-14T09:12:33.000Z"
}
```

---

### session_events

클릭, 노출, CTA, 이탈 등 분석용 이벤트. 세션 단위로만 저장.

| 컬럼       | 타입                    | 설명              |
| ---------- | ----------------------- | ----------------- |
| id         | UUID PK                 | 이벤트 ID         |
| session_id | UUID FK → user_sessions | 세션 ID           |
| event_name | VARCHAR(100)            | 이벤트 이름       |
| screen     | VARCHAR(100)            | 화면명            |
| element_id | VARCHAR(100) NULLABLE   | 버튼/카드/태그 ID |
| payload    | JSONB                   | 추가 데이터       |
| created_at | TIMESTAMPTZ             | 이벤트 발생 시간  |

> `user_id` / `device_id` 없음 — 분석 시에는 `session_id → user_sessions.device_id / .user_id` 로 JOIN해서 사용.

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

## 2. 질문 기준 / 화면 질문 구조

질문 정의는 depth를 낮추기 위해 `questions`과 `question_variants` 2개 테이블로 고정한다.

- `questions`: 내부 판단 기준. DB 관계는 `id`로 연결하고, `key`는 seed/admin/debug용 slug로만 사용한다. 같은 결론으로 평가되어야 하는 질문의 내부 `value` 배열을 가진다.
- `question_variants`: 화면별 실제 질문 문구와 사용자/관리자에게 보여줄 답변 라벨 배열을 가진다.
- 사용자가 선택한 답은 label이나 index가 아니라 canonical `question_id`와 `value`로 저장한다.
- `question_variants.answers[n]`은 `questions.answer_values[n]`과 같은 의미다.
- 평가/룰/필터 매핑은 표시 라벨이 아니라 `value`만 비교한다.

### questions

내부적으로 같은 결론을 내리기 위한 기준 질문.

| 컬럼          | 타입                                                                                      | 설명                                                      |
| ------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| id            | UUID PK                                                                                   | 기준 질문 ID                                              |
| key           | VARCHAR(100) UNIQUE                                                                       | seed/admin/debug용 고유 slug. FK 대상 아님                |
| answer_type   | ENUM('BOOLEAN','THREE_CHOICE','FOUR_CHOICE','FIVE_CHOICE','SINGLE_CHOICE','MULTI_CHOICE') | 답변 형식. UI/admin/service 검증에 사용                   |
| answer_values | INTEGER[]                                                                                 | 내부 로직이 비교할 값 배열. 화면 label 복원 시 index 매칭 |
| answer_count  | INTEGER GENERATED                                                                         | `cardinality(answer_values)` 저장 생성 컬럼               |
| is_active     | BOOLEAN DEFAULT true                                                                      | 활성 여부                                                 |
| created_at    | TIMESTAMPTZ                                                                               | 생성일                                                    |
| updated_at    | TIMESTAMPTZ                                                                               | 수정일                                                    |

예시:

```json
{ "key": "life.recent_irritation", "answer_type": "BOOLEAN", "answer_values": [1, 0] }
{ "key": "life.outdoor_activity", "answer_type": "THREE_CHOICE", "answer_values": [3, 2, 1] }
{ "key": "routine.sunscreen_frequency", "answer_type": "FOUR_CHOICE", "answer_values": [4, 3, 2, 1] }
{ "key": "context.skin_type", "answer_type": "FIVE_CHOICE", "answer_values": [1, 2, 3, 4, 5] }
```

**DB 제약 원칙:**

- `answer_type`별 선택지 개수는 DB에서 일일이 `CHECK`하지 않는다.
- DB는 `questions.answer_values` 개수와 `question_variants.answers` 라벨 개수가 같은지만 강제한다.
- `answer_type`별 유효 개수 정책이 필요하면 admin/service validation에서 처리한다.

```sql
ALTER TABLE questions
ADD COLUMN answer_count integer
GENERATED ALWAYS AS (cardinality(answer_values)) STORED;

ALTER TABLE questions
ADD CONSTRAINT uq_questions_id_answer_count
UNIQUE (id, answer_count);
```

---

### question_variants

사용자에게 실제로 보여줄 화면별 질문.

| 컬럼         | 타입                            | 설명                                  |
| ------------ | ------------------------------- | ------------------------------------- |
| id           | UUID PK                         | 질문 variant ID                       |
| question_id  | UUID FK → questions.id           | 연결 기준 질문                        |
| title        | VARCHAR(200)                    | 관리자용 질문명 또는 사용자 노출 제목 |
| answers      | TEXT[]                          | 화면별 노출 답변 라벨 배열            |
| answer_count | INTEGER GENERATED               | `cardinality(answers)` 저장 생성 컬럼 |
| screen       | ENUM('priority_gate','context') | 노출 화면                             |
| ui_section   | VARCHAR(100)                    | 화면 내 박스                          |
| sort_order   | INTEGER DEFAULT 0               | 노출 순서                             |
| is_active    | BOOLEAN DEFAULT true            | 활성 여부                             |
| created_at   | TIMESTAMPTZ                     | 생성일                                |
| updated_at   | TIMESTAMPTZ                     | 수정일                                |

예시:

```json
{
  "question_id": "<uuid of life.outdoor_activity>",
  "screen": "priority_gate",
  "title": "하루 기준, 낮에 밖에 있는 시간은 어느 정도인가요?",
  "answers": ["2시간 이상", "1시간~2시간", "1시간 이하"]
}
{
  "question_id": "<uuid of life.outdoor_activity>",
  "screen": "context",
  "title": "야외 활동이 많은 편인가요?",
  "answers": ["매우 그렇다", "보통", "아니다"]
}
```

위 두 질문은 답변 라벨은 다르지만 같은 `questions`을 참조한다. 사용자가 첫 번째 답변을 고르면 `user_responses.question_id = <uuid of life.outdoor_activity>`, `question_variant_id = <노출된 variant id>`, `value = 3`으로 저장된다.

> seed JSON에서는 사람이 읽기 쉬운 `questions.key` 값을 입력해도 된다. 단 seed/import 단계에서 이를 `questions.id`로 resolve해 `question_variants.question_id`에 저장한다.

**답변 개수 FK 제약:**

두 테이블 모두 `answer_count` 생성 컬럼을 두고 `(question_id, answer_count)` 복합 FK로 길이를 강제한다.

```sql
ALTER TABLE question_variants
ADD COLUMN answer_count integer
GENERATED ALWAYS AS (cardinality(answers)) STORED;

ALTER TABLE question_variants
ADD CONSTRAINT fk_question_variants_question_answer_count
FOREIGN KEY (question_id, answer_count)
REFERENCES questions (id, answer_count);
```

---

### question_visibility_conditions

질문 노출 조건.

`questions`에 등록된 기준 질문이라면 무엇이든 조건으로 사용할 수 있다. DB에는 `condition_question_id`를 저장한다.  
`category.selected`만 보는 테이블이 아니라, 사용자 상태 전반에 걸쳐 조건을 설정할 수 있다.

| 컬럼                  | 타입                                         | 설명              |
| --------------------- | -------------------------------------------- | ----------------- |
| id                    | UUID PK                                      | 조건 ID           |
| question_id           | UUID FK → question_variants.id               | 대상 질문 variant |
| condition_question_id | UUID FK → questions.id                        | 조건 기준 질문 ID |
| operator              | ENUM('EQ','IN','CONTAINS','GTE','LTE','NEQ') | 연산자            |
| value                 | JSONB                                        | 비교값            |
| state                 | ENUM('REQUIRED','EXCLUDED')                  | 조건 상태         |
| created_at            | TIMESTAMPTZ                                  | 생성일            |

**노출 조건 판단 기준:**

- `REQUIRED` 조건이 있으면 모두 충족해야 질문이 노출된다.
- `EXCLUDED` 조건이 하나라도 맞으면 질문이 노출되지 않는다.
- 조건이 없는 질문은 항상 노출된다.

**조건 기준 질문 예시:**

| seed/admin 표시 key              | 조건 예시     | 설명                                  |
| -------------------------------- | ------------- | ------------------------------------- |
| `category.selected`              | `EQ 1`        | 선크림 카테고리 선택 시만 노출        |
| `life.outdoor_activity`          | `IN [3,2]`    | 야외 활동 시간이 긴 경우만 노출       |
| `routine.sunscreen_frequency`    | `IN [2,1]`    | 선크림을 잘 안 쓰는 경우 노출         |
| `product.owned_categories`       | `CONTAINS 13` | 레티놀 사용 중인 경우 노출            |
| `context.usage_time`             | `EQ 1`        | 아침 사용 제품 고를 때만 노출         |
| `context.usage_place`            | `EQ 2`        | 야외 사용 제품 고를 때만 노출         |
| `preference.fragrance_sensitive` | `EQ 1`        | 향료 민감인 경우 노출                 |
| `flow.concern`                   | `EQ 8`        | 입술 갈라짐 고민에서 진입한 경우 노출 |

> **MVP 우선 사용 기준 질문 seed key:** `category.selected`, `life.outdoor_activity`, `routine.sunscreen_frequency`, `product.owned_categories`, `context.usage_time`, `context.usage_place`

예시:

```
질문: 선크림을 바르면 눈이 시린 편인가요?
REQUIRED: category.selected EQ 1

질문: 레티놀과 병행할 예정인가요?
REQUIRED: product.owned_categories CONTAINS 13
EXCLUDED: life.recent_irritation EQ 1

질문: 야외에서 덧바를 수 있는 형태가 필요한가요?
REQUIRED: category.selected EQ 1
REQUIRED: context.usage_place EQ 2
```

---

### user_responses

사용자가 실제로 답한 현재 값. 화면 라벨과 선택 index는 저장하지 않고, canonical `question_id`와 내부 `value`를 저장한다. 사용자가 실제로 본 화면 문구가 있으면 `question_variant_id`로 함께 남긴다.

| 컬럼                | 타입                                                  | 설명                                                        |
| ------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| id                  | UUID PK                                               | 응답 ID                                                     |
| device_id           | UUID FK → devices.id                                  | 기기 ID                                                     |
| user_id             | UUID FK → users.id NULLABLE                           | 로그인 시 병합, 비로그인 null                               |
| session_id          | UUID FK → user_sessions.id                            | 어느 세션에서 답했는지                                      |
| question_id         | UUID FK → questions.id                                 | canonical question ID. 복원/평가/필터 매핑의 기준           |
| question_variant_id | UUID FK → question_variants.id NULLABLE               | 사용자가 실제로 본 질문 문구. concern preset 등은 null 가능 |
| value               | JSONB                                                 | 내부 로직용 값. 단일 선택은 number, 복수 선택은 number[]    |
| source              | ENUM('priority_gate','context','concern','traceback') | 입력 출처                                                   |
| created_at          | TIMESTAMPTZ                                           | 최초 입력일                                                 |
| updated_at          | TIMESTAMPTZ NULLABLE                                  | 마지막 변경일. 최초 INSERT 후 변경 전까지 null              |

**인덱스 / 제약**

- `pk_user_responses` (PK)
- `uq_user_responses_anonymous_device_question` (UNIQUE on `device_id, question_id WHERE user_id IS NULL`) — 비로그인 device별 질문 1 row
- `uq_user_responses_user_question` (UNIQUE on `user_id, question_id WHERE user_id IS NOT NULL`) — 로그인 사용자별 질문 1 row
- `idx_user_responses_session_id`
- `idx_user_responses_question_id`
- `idx_user_responses_question_variant_id`
- `fk_user_responses_question_id` (FK on `question_id` → `questions.id`)
- `fk_user_responses_question_variant_id` (FK on `question_variant_id` → `question_variants.id`)

> current-state 테이블. 답변 수정 시 새 row를 INSERT하지 않고 같은 질문 row를 UPDATE한다.  
> 비로그인 조회: `WHERE device_id = ? AND user_id IS NULL` / 로그인 조회: `WHERE user_id = ?`  
> 사용자 1명이 답할 수 있는 canonical question이 30개라면 active row도 최대 30개다. 아직 답하지 않은 질문 row는 만들지 않는다.
>
> `source = concern` row는 확정 답변이 아니라 concern preset에서 온 초기 선택 상태다. 이 경우에도 `question_id`는 반드시 canonical `questions.id`를 참조하고, 실제 화면 질문이 없으면 `question_variant_id`만 null로 둔다.
>
> `question_variant_id`는 감사/분석용 단순 참조다. DB는 variant와 canonical question의 쌍 일치까지 복합 FK로 강제하지 않는다. 서비스는 응답 INSERT 시 `question_variant_id`가 있으면 해당 `question_variants.question_id`를 읽어 `user_responses.question_id`에 저장한다.
>
> 질문 클릭/답변 변경 이력은 `session_events`에 남긴다. `user_responses`는 현재 상태만 보관하고, 결과 산출 당시의 입력 묶음은 `decision_runs.input_snapshot`에 저장한다.

**UPSERT 기준**

```sql
CREATE UNIQUE INDEX uq_user_responses_anonymous_device_question
ON user_responses (device_id, question_id)
WHERE user_id IS NULL;

CREATE UNIQUE INDEX uq_user_responses_user_question
ON user_responses (user_id, question_id)
WHERE user_id IS NOT NULL;
```

응답 저장은 위 unique index 중 현재 신원 상태에 맞는 제약을 기준으로 UPSERT한다. UPDATE 시 `value`, `source`, `session_id`, `question_variant_id`, `updated_at`을 갱신한다. 로그인 병합 중 같은 `user_id + question_id` row가 이미 있으면 `updated_at`이 더 최신인 값을 유지한다.

복원 규칙:

- 응답 복원은 `user_responses.question_id` 기준으로 현재 row를 찾는다.
- 현재 화면의 `question_variants.question_id`와 매칭되는 응답이 있으면 `value`를 선택 상태로 복원한다.
- UI index가 필요하면 `questions.answer_values`에서 `value`의 위치를 찾고 같은 index의 `question_variants.answers` 라벨을 선택 상태로 표시한다.
- 복원을 안정적으로 하려면 한 `questions.answer_values` 안에서 같은 value를 중복 사용하지 않는다. 이 중복 금지는 admin/service validation에서 처리한다.

예시:

```json
{
  "id": "ur_001",
  "device_id": "dev_abc",
  "user_id": null,
  "session_id": "sess_001",
  "question_id": "q_study_focus",
  "question_variant_id": "qv_001",
  "value": 1,
  "source": "priority_gate",
  "created_at": "2026-05-15T10:00:00.000Z",
  "updated_at": "2026-05-15T10:03:00.000Z"
}
```

> 같은 사용자가 같은 질문을 다시 누르면 `ur_001` row의 `value`와 `updated_at`이 갱신된다. 변경 전/후 이력은 `session_events`에 남긴다.

---

## 3. Priority Gate Rule

### priority_rules

Priority Gate 결과를 만드는 Rule.

| 컬럼                  | 타입                                                  | 설명          |
| --------------------- | ----------------------------------------------------- | ------------- |
| id                    | UUID PK                                               | Rule ID       |
| name                  | VARCHAR(200)                                          | Rule 이름     |
| priority              | INTEGER                                               | 우선순위      |
| is_active             | BOOLEAN DEFAULT true                                  | 활성 여부     |
| result_type           | ENUM('STOP','HOLD','CAUTION','PASS','ROUTE_CATEGORY') | 결과 타입     |
| result_title          | TEXT                                                  | 결과 제목     |
| result_description    | TEXT                                                  | 결과 설명     |
| hold_categories       | JSONB NULLABLE                                        | 보류 제품군   |
| recommend_category_id | UUID FK → product_categories.id NULLABLE              | 추천 제품군   |
| cta_label             | VARCHAR(100) NULLABLE                                 | CTA 문구      |
| cta_target            | VARCHAR(255) NULLABLE                                 | CTA 이동 경로 |
| created_at            | TIMESTAMPTZ                                           | 생성일        |
| updated_at            | TIMESTAMPTZ                                           | 수정일        |

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

| 컬럼        | 타입                                         | 설명         |
| ----------- | -------------------------------------------- | ------------ |
| id          | UUID PK                                      | 조건 ID      |
| rule_id     | UUID FK → priority_rules.id                  | Rule ID      |
| question_id | UUID FK → questions.id                        | 기준 질문 ID |
| operator    | ENUM('EQ','IN','CONTAINS','GTE','LTE','NEQ') | 연산자       |
| value       | JSONB                                        | 비교값       |
| state       | ENUM('REQUIRED','EXCLUDED')                  | 조건 상태    |
| created_at  | TIMESTAMPTZ                                  | 생성일       |

예시:

```
Rule: 선크림 루틴 우선
REQUIRED:
  - life.outdoor_activity IN [3, 2]
  - routine.sunscreen_frequency IN [2, 1]
EXCLUDED:
  - life.recent_irritation = 1
```

---

### decision_runs

사용자에게 실제로 보여준 결과의 공통 실행 이력 테이블.  
Priority Gate뿐 아니라 Category Decision, Product Matrix 결과까지 저장한다.

`decision_runs`는 당시 사용자에게 실제로 보여준 결과 snapshot이며, 이력 조회 / 결과 복구 / 고객지원에 사용한다.  
`priority_rules`는 현재 Rule 기준이고, `decision_runs`는 그 시점에 실제로 발동된 결과 기록이다.

| 컬럼                     | 타입                                                                            | 설명                                |
| ------------------------ | ------------------------------------------------------------------------------- | ----------------------------------- |
| id                       | UUID PK                                                                         | 실행 기록 ID                        |
| device_id                | UUID FK → devices.id                                                            | 기기 ID                             |
| user_id                  | UUID FK → users.id NULLABLE                                                     | 로그인 시 병합, 비로그인 null       |
| session_id               | UUID FK → user_sessions.id                                                      | 세션 ID                             |
| decision_type            | ENUM('PRIORITY_GATE','CATEGORY_DECISION','PRODUCT_MATRIX','REACTION_TRACEBACK') | 결과 종류                           |
| source_screen            | VARCHAR(100)                                                                    | 발생 화면                           |
| category_id              | UUID FK → product_categories.id NULLABLE                                        | 대상 제품군                         |
| filter_state_id          | UUID FK → product_matrix_filter_states.id NULLABLE                              | 적용된 필터 상태 참조               |
| result_type              | VARCHAR(50) NULLABLE                                                            | 결과 타입 snapshot                  |
| result_title             | TEXT NULLABLE                                                                   | 결과 제목 snapshot                  |
| result_description       | TEXT NULLABLE                                                                   | 결과 설명 snapshot                  |
| cta_label                | VARCHAR(100) NULLABLE                                                           | CTA 문구 snapshot                   |
| cta_target               | VARCHAR(255) NULLABLE                                                           | CTA 경로 snapshot                   |
| input_snapshot           | JSONB                                                                           | 당시 입력값 (user_responses 등)     |
| applied_filters_snapshot | JSONB                                                                           | 적용된 필터 목록 + attribute 조건   |
| result_snapshot          | JSONB                                                                           | 조회된 제품 목록, tags, cautions 등 |
| created_at               | TIMESTAMPTZ                                                                     | 생성일                              |

예시 (Product Matrix 결과):

```json
{
  "decision_type": "PRODUCT_MATRIX",
  "source_screen": "product_matrix",
  "category_id": "cat_sunscreen",
  "applied_filters_snapshot": {
    "filters": ["eye_sting_low", "spf_50_plus"],
    "attribute_conditions": [
      { "key": "eye_sting", "operator": "IN", "value": ["none", "low"] },
      { "key": "spf", "operator": "GTE", "value": 50 }
    ]
  },
  "result_snapshot": {
    "products": [
      {
        "id": "prod_001",
        "name": "라운드랩 자작나무 선크림",
        "tags": ["눈시림 낮음", "SPF50+"],
        "price_band": "UNDER_20000"
      }
    ]
  }
}
```

---

## 4. 제품 DB

### brands

| 컬럼       | 타입                | 설명      |
| ---------- | ------------------- | --------- |
| id         | UUID PK             | 브랜드 ID |
| name       | VARCHAR(200) UNIQUE | 브랜드명  |
| created_at | TIMESTAMPTZ         | 생성일    |
| updated_at | TIMESTAMPTZ         | 수정일    |

---

### product_categories

| 컬럼        | 타입                | 설명      |
| ----------- | ------------------- | --------- |
| id          | UUID PK             | 제품군 ID |
| key         | VARCHAR(100) UNIQUE | 영문 키   |
| name        | VARCHAR(100)        | 한글명    |
| description | TEXT NULLABLE       | 설명      |
| created_at  | TIMESTAMPTZ         | 생성일    |
| updated_at  | TIMESTAMPTZ         | 수정일    |

예시: `{ "key": "sunscreen", "name": "선크림" }`

---

### category_attribute_definitions

제품군별 속성 정의.

| 컬럼          | 타입                                                  | 설명           |
| ------------- | ----------------------------------------------------- | -------------- |
| id            | UUID PK                                               | 속성 정의 ID   |
| category_id   | UUID FK → product_categories.id                       | 제품군 ID      |
| key           | VARCHAR(100)                                          | 속성 키        |
| label         | VARCHAR(200)                                          | 속성 이름      |
| value_type    | ENUM('BOOLEAN','ENUM','NUMBER','MULTI_ENUM','STRING') | 값 타입        |
| options       | JSONB NULLABLE                                        | 선택지         |
| is_required   | BOOLEAN DEFAULT false                                 | 필수 여부      |
| is_filterable | BOOLEAN DEFAULT false                                 | 필터 사용 여부 |
| sort_order    | INTEGER DEFAULT 0                                     | 노출 순서      |
| created_at    | TIMESTAMPTZ                                           | 생성일         |
| updated_at    | TIMESTAMPTZ                                           | 수정일         |

예시 (선크림):

```json
{ "key": "spf", "label": "SPF", "value_type": "NUMBER" }
{ "key": "eye_sting", "label": "눈시림 위험", "value_type": "ENUM", "options": ["none","low","medium","high"] }
```

---

### products

| 컬럼         | 타입                                                   | 설명                 |
| ------------ | ------------------------------------------------------ | -------------------- |
| id           | UUID PK                                                | 제품 ID              |
| brand_id     | UUID FK → brands.id                                    | 브랜드 ID            |
| category_id  | UUID FK → product_categories.id                        | 제품군 ID            |
| name         | VARCHAR(300)                                           | 제품명               |
| barcode      | VARCHAR(100) NULLABLE UNIQUE                           | 바코드               |
| price        | INTEGER                                                | 가격                 |
| price_band   | ENUM('UNDER_20000','BETWEEN_20000_50000','OVER_50000') | 가격대               |
| volume       | VARCHAR(50) NULLABLE                                   | 용량                 |
| image_url    | TEXT NULLABLE                                          | 이미지               |
| purchase_url | TEXT NULLABLE                                          | 구매 링크            |
| attributes   | JSONB                                                  | 제품군별 속성        |
| sort_order   | INTEGER DEFAULT 0                                      | 관리자 큐레이션 순서 |
| is_active    | BOOLEAN DEFAULT true                                   | 노출 여부            |
| created_at   | TIMESTAMPTZ                                            | 생성일               |
| updated_at   | TIMESTAMPTZ                                            | 수정일               |

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

사용자의 화면 선택값(`user_responses.value`)을 product attribute 조건으로 변환하는 매핑 테이블.  
"룰 엔진"이 아니다. 사용자가 화면에서 "눈시림 있음"에 해당하는 답을 골라 `value = 1`이 저장되면, 이것이 제품 attribute 기준으로 `eye_sting IN ["none","low"]`와 같은 조건으로 변환된다는 매핑을 정의한다.

실제 제품 필터링은 이 매핑을 바탕으로 동적 SQL 또는 ORM where 조건을 생성해 `products` 테이블을 직접 조회하는 방식으로 수행한다.  
핵심은 `product.attributes`를 얼마나 잘 입력하느냐이고, 이 테이블은 그 연결고리다.

| 컬럼               | 타입                                                 | 설명                                 |
| ------------------ | ---------------------------------------------------- | ------------------------------------ |
| id                 | UUID PK                                              | ID                                   |
| category_id        | UUID FK → product_categories.id NULLABLE             | 적용 제품군 (null이면 전체 공통)     |
| source_question_id | UUID FK → questions.id                                | 사용자 답변 기준 질문 ID             |
| source_operator    | ENUM('EQ','IN','CONTAINS','GTE','LTE','NEQ')         | 사용자 답변 조건 연산자              |
| source_value       | JSONB                                                | 사용자 답변 비교값                   |
| attribute_key      | VARCHAR(100)                                         | 대상 product attribute 키            |
| attribute_operator | ENUM('EQ','IN','GTE','LTE','NEQ','CONTAINS')         | attribute 조건 연산자                |
| attribute_value    | JSONB                                                | attribute 비교값                     |
| filter_mode        | ENUM('HARD_FILTER','EXCLUDE','CAUTION','SORT','TAG') | 처리 방식                            |
| filter_type        | ENUM('BASIC_CONDITION','PERSONALIZED')               | 필터 종류 (좋은 제품 기준 vs 개인화) |
| filter_key         | VARCHAR(100)                                         | 필터 식별 키 (UI 표시용)             |
| filter_label       | VARCHAR(100)                                         | 필터 표시 이름                       |
| tag_label          | VARCHAR(100) NULLABLE                                | 제품 카드 태그 문구                  |
| caution_message    | TEXT NULLABLE                                        | △ 주의 표시 문구                     |
| sort_order         | INTEGER DEFAULT 0                                    | 필터 정렬 순서                       |
| is_active          | BOOLEAN DEFAULT true                                 | 활성 여부                            |
| created_at         | TIMESTAMPTZ                                          | 생성일                               |
| updated_at         | TIMESTAMPTZ                                          | 수정일                               |

**filter_mode 정의:**

| mode          | 의미                                                      |
| ------------- | --------------------------------------------------------- |
| `HARD_FILTER` | attribute 조건을 WHERE에 추가해 제품 자체를 제외          |
| `EXCLUDE`     | 제품은 남기되 "제외 권장" 처리 (사용자 확인 후 선택 가능) |
| `CAUTION`     | 제품은 남기되 △ 주의 태그 표시                            |
| `SORT`        | 조건 만족 제품을 상위 노출                                |
| `TAG`         | 조건 만족 제품에 태그 부여                                |

**매핑 예시:**

| source 기준 질문 seed key        | source 조건 | attribute_key | attribute 조건      | filter_mode   | filter_label   |
| -------------------------------- | ----------- | ------------- | ------------------- | ------------- | -------------- |
| `context.eye_sting`              | `EQ 1`      | `eye_sting`   | `IN ["none","low"]` | `HARD_FILTER` | 눈시림 낮음    |
| `life.outdoor_activity`          | `IN [3,2]`  | `spf`         | `GTE 50`            | `HARD_FILTER` | 야외 사용 적합 |
| `context.white_cast_sensitive`   | `EQ 1`      | `white_cast`  | `IN ["none","low"]` | `HARD_FILTER` | 백탁 없음      |
| `preference.fragrance_sensitive` | `EQ 1`      | `fragrance`   | `EQ false`          | `HARD_FILTER` | 향료 없음      |
| `context.usage_place`            | `EQ 2`      | `spf`         | `GTE 50`            | `TAG`         | 야외 사용 적합 |

### Product Matrix 조회 방식

제품은 큐레이트된 DB에 있고, 핵심은 `product.attributes`를 잘 입력하는 것이다.  
`product_filter_mappings`는 사용자 답변과 attribute 조건 사이의 번역기 역할만 한다.

```
1. 사용자 답변(user_responses) 또는 product_matrix_filter_states 조회
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

| 컬럼        | 타입                                                       | 설명                          |
| ----------- | ---------------------------------------------------------- | ----------------------------- |
| id          | UUID PK                                                    | ID                            |
| device_id   | UUID FK → devices.id                                       | 기기 ID                       |
| user_id     | UUID FK → users.id NULLABLE                                | 로그인 시 병합, 비로그인 null |
| session_id  | UUID FK → user_sessions.id                                 | 세션 ID                       |
| category_id | UUID FK → product_categories.id                            | 제품군                        |
| source      | ENUM('DIRECT','CATEGORY_DECISION_CTA','MANUAL','RESTORED') | 필터 상태 생성 경로           |
| filters     | JSONB                                                      | 현재 적용된 필터 목록         |
| is_active   | BOOLEAN DEFAULT true                                       | 활성 여부                     |
| created_at  | TIMESTAMPTZ                                                | 생성일                        |
| updated_at  | TIMESTAMPTZ                                                | 수정일                        |

**source 정의:**

| source                  | 설명                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| `DIRECT`                | 직접 Product Matrix 접근 (기존 filter_state 복원)                       |
| `CATEGORY_DECISION_CTA` | Category Decision 결과에서 CTA로 진입, context 답변 기반 필터 자동 생성 |
| `MANUAL`                | 사용자가 필터를 직접 추가/삭제                                          |
| `RESTORED`              | 이전 session에서 복원                                                   |

**동작 방식:**

- Product Matrix 단순 접근 시: 해당 category의 최신 active filter_state 조회해서 복원
- Category Decision CTA 진입 시: context 답변을 `product_filter_mappings`로 변환해 새 filter_state 생성
- Concern preset이 있고 최종 `category.selected`가 `suggested_category`와 일치하면 `suggested_filters`를 `CONCERN_PRESET` source_type으로 합성
- 사용자가 필터 추가/삭제: `filters` JSONB 업데이트 + `session_events`에 이벤트 저장
- 실제 조회 결과는 `decision_runs`에 snapshot으로 저장

> 화면 재조회는 `decision_runs` snapshot을 재사용하지 말고, `product_matrix_filter_states`를 기준으로 현재 `products`를 다시 조회한다. snapshot은 이력/고객지원용이다.

**filters 항목별 source_type:**

| source_type       | 의미                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `BASIC_CONDITION` | 해당 제품군의 "좋은 제품의 조건" — 관리자가 코드 상수로 정의, 기본 선택 상태                    |
| `PERSONALIZED`    | 사용자 답변(user_responses)에서 변환된 개인화 필터 — `product_filter_mappings` 경유             |
| `MANUAL`          | 사용자가 직접 추가/삭제한 필터                                                                  |
| `TRACEBACK`       | Reaction Traceback avoidance_rules에서 자동 생성된 필터                                         |
| `CONCERN_PRESET`  | Concern preset의 `suggested_filters`가 최종 category와 일치해 Product Matrix에 반영된 힌트 필터 |

예시:

```json
{
  "category_id": "cat_sunscreen",
  "source": "CATEGORY_DECISION_CTA",
  "filters": [
    {
      "filter_key": "spf_50_plus",
      "label": "SPF 50+",
      "source_type": "BASIC_CONDITION",
      "attribute_key": "spf",
      "operator": "GTE",
      "value": 50
    },
    {
      "filter_key": "eye_sting_low",
      "label": "눈시림 낮음",
      "source_type": "PERSONALIZED",
      "attribute_key": "eye_sting",
      "operator": "IN",
      "value": ["none", "low"]
    }
  ]
}
```

---

## 7. 성분 / Reaction Traceback

### ingredients

| 컬럼       | 타입                  | 설명        |
| ---------- | --------------------- | ----------- |
| id         | UUID PK               | 성분 ID     |
| name_ko    | VARCHAR(200)          | 한글 성분명 |
| name_en    | VARCHAR(200)          | 영문 성분명 |
| inci_name  | VARCHAR(300) NULLABLE | INCI 이름   |
| created_at | TIMESTAMPTZ           | 생성일      |
| updated_at | TIMESTAMPTZ           | 수정일      |

---

### product_ingredients

| 컬럼          | 타입                     | 설명        |
| ------------- | ------------------------ | ----------- |
| id            | UUID PK                  | ID          |
| product_id    | UUID FK → products.id    | 제품 ID     |
| ingredient_id | UUID FK → ingredients.id | 성분 ID     |
| order_index   | INTEGER                  | 전성분 순서 |
| raw_text      | TEXT NULLABLE            | 원문        |
| created_at    | TIMESTAMPTZ              | 생성일      |

제약: `UNIQUE (product_id, ingredient_id)`

---

### ingredient_groups

| 컬럼        | 타입                | 설명      |
| ----------- | ------------------- | --------- |
| id          | UUID PK             | 성분군 ID |
| key         | VARCHAR(100) UNIQUE | 키        |
| name        | VARCHAR(200)        | 이름      |
| description | TEXT NULLABLE       | 설명      |
| created_at  | TIMESTAMPTZ         | 생성일    |
| updated_at  | TIMESTAMPTZ         | 수정일    |

---

### ingredient_group_members

| 컬럼                | 타입                           | 설명      |
| ------------------- | ------------------------------ | --------- |
| id                  | UUID PK                        | ID        |
| ingredient_id       | UUID FK → ingredients.id       | 성분 ID   |
| ingredient_group_id | UUID FK → ingredient_groups.id | 성분군 ID |

제약: `UNIQUE (ingredient_id, ingredient_group_id)`

---

### reaction_reports

사용자의 문제 반응 기록.

| 컬럼           | 타입                        | 설명                          |
| -------------- | --------------------------- | ----------------------------- |
| id             | UUID PK                     | 리포트 ID                     |
| device_id      | UUID FK → devices.id        | 기기 ID                       |
| user_id        | UUID FK → users.id NULLABLE | 로그인 시 병합, 비로그인 null |
| session_id     | UUID FK → user_sessions.id  | 세션 ID                       |
| symptoms       | JSONB                       | 증상                          |
| affected_areas | JSONB                       | 부위                          |
| onset_timing   | VARCHAR(100) NULLABLE       | 발현 시점                     |
| memo           | TEXT NULLABLE               | 메모                          |
| created_at     | TIMESTAMPTZ                 | 생성일                        |
| updated_at     | TIMESTAMPTZ                 | 수정일                        |

---

### reaction_report_products

문제 상품 / 괜찮은 상품 등록.

| 컬럼        | 타입                          | 설명      |
| ----------- | ----------------------------- | --------- |
| id          | UUID PK                       | ID        |
| report_id   | UUID FK → reaction_reports.id | 리포트 ID |
| product_id  | UUID FK → products.id         | 제품 ID   |
| type        | ENUM('PROBLEM','OK')          | 상품 유형 |
| used_period | VARCHAR(100) NULLABLE         | 사용 기간 |
| used_count  | INTEGER NULLABLE              | 사용 횟수 |
| created_at  | TIMESTAMPTZ                   | 생성일    |

---

### suspected_causes

원인 후보 성분군.

| 컬럼                | 타입                           | 설명      |
| ------------------- | ------------------------------ | --------- |
| id                  | UUID PK                        | ID        |
| report_id           | UUID FK → reaction_reports.id  | 리포트 ID |
| ingredient_group_id | UUID FK → ingredient_groups.id | 성분군 ID |
| confidence          | ENUM('LOW','MEDIUM','HIGH')    | 신뢰도    |
| reason              | TEXT NULLABLE                  | 추정 이유 |
| created_at          | TIMESTAMPTZ                    | 생성일    |

---

### avoidance_rules

다음 선택에 반영할 회피 / 주의 규칙.

| 컬럼                | 타입                           | 설명                          |
| ------------------- | ------------------------------ | ----------------------------- |
| id                  | UUID PK                        | ID                            |
| device_id           | UUID FK → devices.id           | 기기 ID                       |
| user_id             | UUID FK → users.id NULLABLE    | 로그인 시 병합, 비로그인 null |
| ingredient_group_id | UUID FK → ingredient_groups.id | 성분군 ID                     |
| action              | ENUM('AVOID','CAUTION')        | 행동                          |
| reason              | TEXT NULLABLE                  | 이유                          |
| is_active           | BOOLEAN DEFAULT true           | 활성 여부                     |
| created_at          | TIMESTAMPTZ                    | 생성일                        |
| updated_at          | TIMESTAMPTZ                    | 수정일                        |

---

## 8. MVP 사전

### Question 사전

사용자 응답(`user_responses`)으로 저장 가능한 전체 기준 질문 목록. 실제 화면 라벨은 `question_variants.answers`가 가진다. `key`는 seed/admin/debug용 slug이며 DB 관계는 `questions.id`를 사용한다.

| key                               | answer_type   | answer_values | 설명                                                         |
| --------------------------------- | ------------- | ------------- | ------------------------------------------------------------ |
| `flow.concern`                    | SINGLE_CHOICE | `[1..N]`      | Concern Mapper에서 선택한 고민. 값 의미는 프론트 상수와 매칭 |
| `life.recent_irritation`          | BOOLEAN       | `[1,0]`       | 최근 따가움·붉어짐·가려움 같은 문제 여부                     |
| `life.outdoor_activity`           | THREE_CHOICE  | `[3,2,1]`     | 낮 야외 활동 시간. 값이 클수록 야외 노출이 김                |
| `routine.sunscreen_use`           | BOOLEAN       | `[1,0]`       | 외출 시 선크림 사용 여부 파생값                              |
| `routine.sunscreen_frequency`     | FOUR_CHOICE   | `[4,3,2,1]`   | 외출 시 선크림 사용 빈도. 값이 클수록 자주 사용              |
| `routine.sunscreen_reapply`       | BOOLEAN       | `[1,0]`       | 선크림을 들고 다니며 덧바르는지                              |
| `routine.cleansing_stable`        | BOOLEAN       | `[1,0]`       | 1차 세안 제품(오일/밤/워터/패드)을 따로 쓰는지               |
| `routine.foam_enough`             | BOOLEAN       | `[1,0]`       | 클렌징 폼 거품을 충분히 내서 쓰는지                          |
| `routine.eye_irritation_history`  | BOOLEAN       | `[1,0]`       | 화장/세안 중 눈 자극 경험이 잦은지                           |
| `routine.recent_dry_tight`        | BOOLEAN       | `[1,0]`       | 세안 후 당김·건조·따가움 같은 문제 여부                      |
| `routine.makeup_frequent`         | BOOLEAN       | `[1,0]`       | 선크림 위에 베이스 메이크업을 자주 올리는지                  |
| `routine.brush_wash_cycle`        | FOUR_CHOICE   | `[4,3,2,1]`   | 브러시 세척 주기. 값이 작을수록 오래 방치                    |
| `routine.puff_age`                | FOUR_CHOICE   | `[4,3,2,1]`   | 퍼프 사용 기간. 값이 작을수록 오래 사용                      |
| `routine.pillowcase_change_cycle` | FOUR_CHOICE   | `[4,3,2,1]`   | 배갯잎 교체 주기. 값이 작을수록 오래 미교체                  |
| `routine.morning_face_condition`  | FOUR_CHOICE   | `[1,2,3,4]`   | 기상 직후 얼굴 상태. 화면 라벨이 value 의미를 정의           |
| `routine.bedtime_routine`         | BOOLEAN       | `[1,0]`       | 취침 전 스킨케어 루틴 여부                                   |
| `routine.cleansing_before_sleep`  | BOOLEAN       | `[1,0]`       | 취침 전 세안 여부                                            |
| `product.owned_categories`        | MULTI_CHOICE  | `[1..17]`     | 현재 사용 중인 제품군 목록. 각 값은 화면 라벨 index에 매칭   |
| `category.selected`               | SINGLE_CHOICE | `[1..6]`      | 선택한 제품군. 각 값은 MVP 6개 category label에 매칭         |
| `context.usage_place`             | THREE_CHOICE  | `[1,2,3]`     | 사용 장소. 화면 라벨 예: 실내 / 야외 / 둘 다                 |
| `context.usage_time`              | THREE_CHOICE  | `[1,2,3]`     | 사용 시간대. 화면 라벨 예: 아침 / 밤 / 둘 다                 |
| `context.portable`                | BOOLEAN       | `[1,0]`       | 외출 시 휴대 필요 여부                                       |
| `context.eye_sting`               | BOOLEAN       | `[1,0]`       | 선크림 사용 시 눈시림 경험 여부                              |
| `context.white_cast_sensitive`    | BOOLEAN       | `[1,0]`       | 백탁에 민감한 여부                                           |
| `context.makeup_use`              | BOOLEAN       | `[1,0]`       | 선크림 위에 베이스 메이크업 사용 여부                        |
| `preference.fragrance_sensitive`  | BOOLEAN       | `[1,0]`       | 향료 민감 여부                                               |
| `preference.menthol_sensitive`    | BOOLEAN       | `[1,0]`       | 멘톨·화한 사용감 불편 여부                                   |

---

### Product Attribute 사전

`products.attributes` JSONB에 저장되는 제품군별 속성 key 목록.  
`category_attribute_definitions`에도 동일하게 등록된다.

#### 선크림 (sunscreen)

| key                    | value_type | 설명                  | 예시 값                            |
| ---------------------- | ---------- | --------------------- | ---------------------------------- |
| `spf`                  | NUMBER     | SPF 수치              | `50`                               |
| `pa`                   | ENUM       | PA 등급               | `+` / `++` / `+++` / `++++`        |
| `filter_type`          | ENUM       | 자외선 차단 필터 종류 | `physical` / `chemical` / `hybrid` |
| `eye_sting`            | ENUM       | 눈시림 위험 정도      | `none` / `low` / `medium` / `high` |
| `white_cast`           | ENUM       | 백탁 정도             | `none` / `low` / `medium` / `high` |
| `texture`              | ENUM       | 텍스처                | `light` / `medium` / `rich`        |
| `sticky`               | ENUM       | 끈적임 정도           | `none` / `low` / `medium` / `high` |
| `makeup_compatibility` | ENUM       | 메이크업 궁합         | `good` / `fair` / `poor`           |
| `portable`             | BOOLEAN    | 휴대형 여부           | `true` / `false`                   |
| `fragrance`            | BOOLEAN    | 향료 포함 여부        | `true` / `false`                   |

#### 세럼 (serum)

| key                    | value_type | 설명           | 예시 값                                             |
| ---------------------- | ---------- | -------------- | --------------------------------------------------- |
| `active_ingredients`   | MULTI_ENUM | 주요 활성 성분 | `retinol` / `vitamin_c` / `niacinamide` / `peptide` |
| `irritation_risk`      | ENUM       | 자극 가능성    | `low` / `medium` / `high`                           |
| `conflict_ingredients` | MULTI_ENUM | 병행 주의 성분 | `aha` / `bha` / `retinol` / `vitamin_c`             |
| `usage_time`           | ENUM       | 사용 시간대    | `morning` / `night` / `both`                        |
| `effect_timeline`      | ENUM       | 기대 시차      | `fast` / `gradual`                                  |
| `texture`              | ENUM       | 제형           | `water` / `oil` / `gel` / `cream`                   |
| `fragrance`            | BOOLEAN    | 향료 포함 여부 | `true` / `false`                                    |

#### 립케어 (lipcare)

| key                | value_type | 설명                | 예시 값                            |
| ------------------ | ---------- | ------------------- | ---------------------------------- |
| `menthol`          | BOOLEAN    | 멘톨 포함 여부      | `true` / `false`                   |
| `fragrance`        | BOOLEAN    | 향료 포함 여부      | `true` / `false`                   |
| `spf`              | NUMBER     | SPF 수치 (없으면 0) | `15` / `0`                         |
| `moisture_lasting` | ENUM       | 보습 지속력         | `low` / `medium` / `high`          |
| `form`             | ENUM       | 제형                | `stick` / `tube` / `balm` / `tint` |
| `portable`         | BOOLEAN    | 휴대 편의성         | `true` / `false`                   |

---

### Filter Key 사전

`product_filter_mappings.filter_key` 및 `product_matrix_filter_states.filters[].filter_key`에서 사용하는 전체 키 목록.

#### 선크림 (sunscreen)

| filter_key           | filter_type     | 설명                         |
| -------------------- | --------------- | ---------------------------- |
| `spf_50_plus`        | BASIC_CONDITION | SPF 50 이상                  |
| `pa_4_plus`          | BASIC_CONDITION | PA++++                       |
| `eye_sting_low`      | BASIC_CONDITION | 눈시림 낮음                  |
| `white_cast_low`     | BASIC_CONDITION | 백탁 적음                    |
| `makeup_compat_good` | BASIC_CONDITION | 메이크업 궁합                |
| `outdoor_use`        | PERSONALIZED    | 야외 활동 적합 (spf≥50)      |
| `no_eye_sting`       | PERSONALIZED    | 눈시림 경험 있는 사용자 맞춤 |
| `no_white_cast`      | PERSONALIZED    | 백탁 민감 사용자 맞춤        |
| `no_fragrance`       | PERSONALIZED    | 향료 민감 맞춤               |
| `portable`           | PERSONALIZED    | 휴대형                       |

#### 세럼 (serum)

| filter_key              | filter_type     | 설명              |
| ----------------------- | --------------- | ----------------- |
| `low_irritation`        | BASIC_CONDITION | 자극 가능성 낮음  |
| `no_fragrance`          | PERSONALIZED    | 향료 민감 맞춤    |
| `morning_use`           | PERSONALIZED    | 아침 사용 적합    |
| `night_use`             | PERSONALIZED    | 밤 사용 적합      |
| `no_conflict_retinol`   | PERSONALIZED    | 레티놀 병행 주의  |
| `no_conflict_vitamin_c` | PERSONALIZED    | 비타민C 병행 주의 |

#### 립케어 (lipcare)

| filter_key             | filter_type     | 설명                  |
| ---------------------- | --------------- | --------------------- |
| `high_moisture`        | BASIC_CONDITION | 보습 지속력 높음      |
| `no_menthol`           | BASIC_CONDITION | 멘톨 없음             |
| `low_fragrance`        | BASIC_CONDITION | 향료 적음             |
| `no_menthol_sensitive` | PERSONALIZED    | 멘톨 민감 사용자 맞춤 |
| `no_fragrance`         | PERSONALIZED    | 향료 민감 맞춤        |
| `spf_included`         | PERSONALIZED    | 야외 사용 SPF 포함    |
| `portable`             | PERSONALIZED    | 휴대형                |
