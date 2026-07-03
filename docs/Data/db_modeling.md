> 테이블 메타데이터
> 현실 문제를 DB 테이블로 매핑하는 과정이 정리되어있음

# Skincare Decision — DB 모델링

데이터 구조 (테이블, 컬럼)

---

## 0. 공통 규약 (Identity · Timestamp · Naming)

### 0.1 식별자 / 시각 컬럼 규약

- **식별자 기본은 UUIDv7** 이다. (시간 정렬 가능 / BTREE 친화적 / PK 분포 무작위 회피)  
  본 문서에서 `UUID PK`, `UUID FK …` 로 표기된 모든 컬럼이 해당된다.
- **내부 append-only 로그/스냅샷(`session_events`, `decision_runs`)의 PK 는 `BIGINT` identity** 다 (`BIGINT PK (IDENTITY)` 표기). 외부 노출·inbound FK 가 없고 대량 적재되므로 8바이트·단조 증가가 유리하다. (→ [ADR-0002](../../memory/ADR/ADR-0002-db-identity-and-fk-policy.md))
- **모든 시각 컬럼은 `TIMESTAMPTZ`** (UTC 저장, 표시 변환은 클라이언트 책임).
- 모든 테이블의 라이프사이클 컬럼은 다음 3종을 표준으로 둔다:

  | 컬럼         | 타입          | NULL? | 기본값                 | 갱신 시점                                |
  | ------------ | ------------- | ----- | ---------------------- | ---------------------------------------- |
  | `created_at` | `TIMESTAMPTZ` | NO    | `now()`                | INSERT 시 자동                           |
  | `updated_at` | `TIMESTAMPTZ` | YES   | (없음, INSERT 시 NULL) | UPDATE 발생 시 application/Prisma가 채움 |
  | `deleted_at` | `TIMESTAMPTZ` | YES   | (없음, 평소 NULL)      | 소프트 삭제 시 채움 → 조회 기본 필터링   |

  > **`updated_at` 는 INSERT 시 NULL** 이다. "한 번도 갱신되지 않았다" 와 "갱신 시각" 을 한 컬럼으로 표현한다.  
  > append-only / bridge / event 테이블(`session_events`, `decision_runs`, `priority_rule_conditions`, `question_visibility_conditions`, `product_ingredients`, `ingredient_group_members`, `reaction_report_products`, `suspected_causes`)은 `updated_at` / `deleted_at` 을 두지 않는다.  
  > **current-state 예외**: `user_responses`와 `product_matrix_filter_states`는 현재 상태 테이블이므로 `updated_at`은 두지만 `deleted_at`은 두지 않는다. 답변/필터 해제는 row 삭제 또는 JSON state 갱신으로 처리하고, 변경 이력은 `session_events`가 보존한다.
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
| Enum 타입           | `<table>_<column>_enum`                    | `users_role_enum`, `questions_answer_type_enum`           |

> **공용 enum 예외**: 동일 의미의 enum이 여러 테이블·컬럼에서 재사용되는 경우(예: 비교 연산자, REQUIRED/EXCLUDED 조건 상태)는 테이블별 분리 대신 의미 단위 단일 enum을 둔다. 본 문서에서는 `comparison_operator_enum`, `condition_state_enum` 두 가지만 예외로 인정한다. 자세한 매핑은 [db_schema_validation.md §0.2](db_schema_validation.md#02-enum-정의) 참조.

---

## 테이블 목록

| #   | 테이블명                          | 분류             |
| --- | --------------------------------- | ---------------- |
| 1   | users                             | 사용자           |
| 2   | devices                           | 사용자           |
| 3   | user_sessions                     | 사용자           |
| 4   | session_events                    | 사용자           |
| 5   | questions                         | 질문 기준        |
| 6   | question_variants                 | 질문 기준        |
| 7   | question_visibility_conditions    | 질문 조건        |
| 8   | user_responses                    | 질문 응답        |
| 9   | priority_rules                    | Priority Gate    |
| 10  | priority_rule_conditions          | Priority Gate    |
| 11  | decision_runs                     | 실행 이력 (공통) |
| 12  | brands                            | 제품 DB          |
| 13  | product_categories                | 제품 DB          |
| 14  | category_attribute_definitions    | 제품 DB          |
| 15  | products                          | 제품 DB          |
| 16  | product_filter_definitions        | Product Filter   |
| 17  | product_matrix_filter_definitions | Product Matrix   |
| 18  | question_filter_mappings          | Product Filter   |
| 19  | product_matrix_filter_states      | Product Matrix   |
| 20  | ingredients                       | 성분 / Traceback |
| 21  | product_ingredients               | 성분 / Traceback |
| 22  | ingredient_groups                 | 성분 / Traceback |
| 23  | ingredient_group_members          | 성분 / Traceback |
| 24  | reaction_reports                  | 성분 / Traceback |
| 25  | reaction_report_products          | 성분 / Traceback |
| 26  | suspected_causes                  | 성분 / Traceback |
| 27  | avoidance_rules                   | 성분 / Traceback |

### MVP에서 제거된 테이블

| 테이블명                  | 제거 이유                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| concern_groups            | Concern 태그는 프론트 상수로 관리. DB 불필요                                              |
| concern_tags              | 동일                                                                                      |
| concern_category_mappings | 동일. 태그 → `preset_facts`, `suggested_category`, `suggested_filters`는 코드 상수로 처리 |

> **Concern Mapper / 고민 캐러셀은 DB 관리 대상이 아니다.**  
> 태그 목록과 태그 → `preset_facts` / `suggested_category` / `suggested_filters` 매핑은 프론트엔드 상수(코드)로 관리한다.  
> 태그 클릭 이벤트는 `session_events`에 `concern_clicked`로 저장하고,  
> `user_responses`에는 `source = concern` row로 concern 내부값을 저장하고, 필요하면 `preset_facts`도 같은 source로 저장할 수 있다.  
> 단 `source = concern`은 확정 답변이 아니라 초기 선택 상태이며, 이후 `priority_gate` / `context`에서 사용자가 직접 답한 값이 최종 판단에 우선한다.
>
> 예시 흐름:
>
> ```
> [여드름] 클릭
>   → session_events: { event_name: "concern_clicked", payload: { concern: "acne" } }
>   → 프론트 상수에서 `suggested_category = "cleanser"` 등 추천 힌트 결정
>   → user_responses: { question_id: "<flow.concern question id>", value: [1], source: "concern" }
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
 ├─ user_responses                  (device_id + user_id nullable)
 ├─ decision_runs                   (device_id + user_id nullable)
 ├─ product_matrix_filter_states    (device_id + user_id nullable)
 ├─ reaction_reports                (device_id + user_id nullable)
 │    ├─ reaction_report_products
 │    └─ suspected_causes
 └─ avoidance_rules                 (device_id + user_id nullable)

questions
 ├─ question_variants
 │    └─ question_visibility_conditions
 ├─ user_responses                  (canonical question_id)
 ├─ priority_rule_conditions
 └─ question_filter_mappings        (trigger_question_id)

priority_rules
 ├─ priority_rule_conditions
 └─ decision_runs

product_categories
 ├─ category_attribute_definitions  ← product_filter_definitions
 │                                       ↑ product_matrix_filter_definitions (attribute-backed only)
 ├─ product_matrix_filter_definitions
 │                                       ↑ question_filter_mappings (matrix_filter_definition_id)
 │                                       ↑ product_matrix_filter_states.filters[].matrix_filter_definition_id
 ├─ products
 └─ product_matrix_filter_states

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
| id         | BIGINT PK (IDENTITY)    | 이벤트 ID         |
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

| 컬럼         | 타입                                                     | 설명                                          |
| ------------ | -------------------------------------------------------- | --------------------------------------------- |
| id           | UUID PK                                                  | 질문 variant ID                               |
| question_id  | UUID FK → questions.id ON DELETE CASCADE                 | 연결 기준 질문 (canonical 삭제 시 함께 정리)  |
| title        | TEXT                                                     | 관리자용 질문명 또는 사용자 노출 제목         |
| answers      | TEXT[]                                                   | 화면별 노출 답변 라벨 배열                    |
| answer_count | INTEGER GENERATED                                        | `cardinality(answers)` 저장 생성 컬럼         |
| screen       | ENUM('priority_gate','context')                          | 노출 화면                                     |
| ui_section   | ENUM('life_routine','owned_products','basic','category') | 화면 내 박스 (priority_gate / context 박스별) |
| sort_order   | INTEGER DEFAULT 0                                        | 노출 순서                                     |
| is_active    | BOOLEAN DEFAULT true                                     | 활성 여부                                     |
| created_at   | TIMESTAMPTZ                                              | 생성일                                        |
| updated_at   | TIMESTAMPTZ                                              | 수정일                                        |

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

위 두 질문은 답변 라벨은 다르지만 같은 `questions`을 참조한다. 사용자가 첫 번째 답변을 고르면 `user_responses.question_id = <uuid of life.outdoor_activity>`, `value = [3]`으로 저장된다. 복수 선택이면 같은 배열에 여러 정수가 들어간다. 사용자가 본 화면 variant 추적은 `session_events.value_change` payload 에서 처리한다.

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

화면에 보여지는지 여부는 canonical `questions`가 아니라 실제 노출되는 `question_variants`를 기준으로 평가한다. 따라서 조건 row 는 대상 variant 만 FK 로 잡고, 어떤 user_response 와 매칭할지는 service 가 같은 variant 의 canonical question 답변을 기준으로 평가한다.

| 컬럼                | 타입                                         | 설명              |
| ------------------- | -------------------------------------------- | ----------------- |
| id                  | UUID PK                                      | 조건 ID           |
| question_variant_id | UUID FK → question_variants.id               | 대상 질문 variant |
| operator            | ENUM('EQ','IN','CONTAINS','GTE','LTE','NEQ') | 연산자            |
| value               | INTEGER                                      | 비교값            |
| state               | ENUM('REQUIRED','EXCLUDED')                  | 조건 상태         |
| created_at          | TIMESTAMPTZ                                  | 생성일            |
| updated_at          | TIMESTAMPTZ NULLABLE                         | 마지막 변경일     |

**노출 조건 판단 기준:**

- `REQUIRED` 조건이 있으면 모두 충족해야 질문 variant 가 노출된다.
- `EXCLUDED` 조건이 하나라도 맞으면 노출되지 않는다.
- 조건이 없는 variant 는 항상 노출된다.

**평가 흐름:**

각 조건 row 는 대상 variant 만 FK 로 잡는다. 어떤 user_response 와 비교할지는 service 가 결정한다 — MVP 에서는 사용자의 현재 `user_responses` 묶음을 입력으로 받아, `(operator, value)` 페어를 카테고리/맥락 변수와 매칭하는 평가기를 service 가 책임진다. seed/admin UI 는 variant 별로 노출 조건을 등록한다.

예시 (의도):

```
질문 variant: "선크림을 바르면 눈이 시린 편인가요?" (sunscreen Box2)
REQUIRED: EQ 1   ← 선크림 카테고리 진입 시만 노출 (service 가 category 컨텍스트로 평가)

질문 variant: "레티놀과 병행할 예정인가요?" (serum Box2)
REQUIRED: CONTAINS 13   ← 레티놀 사용 중인 경우 (owned_categories 평가)
EXCLUDED: EQ 1          ← 최근 자극이 있으면 숨김
```

> 위 예시는 의도만 표기한 것이며, 어떤 canonical question 의 답변을 가져와 비교할지는 service 의 평가기 책임이다. DB 는 대상 variant + operator + value + state 만 보관한다.

---

### user_responses

사용자가 실제로 답한 현재 값. 화면 라벨과 선택 index는 저장하지 않고, canonical `question_id`와 내부 `value`만 저장한다.

| 컬럼        | 타입                                                  | 설명                                                        |
| ----------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| id          | UUID PK                                               | 응답 ID                                                     |
| device_id   | UUID FK → devices.id                                  | 기기 ID                                                     |
| user_id     | UUID FK → users.id NULLABLE                           | 로그인 시 병합, 비로그인 null                               |
| question_id | UUID FK → questions.id                                | canonical question ID. 복원/평가/필터 매핑의 기준           |
| value       | INTEGER[]                                             | 내부 로직용 값. 단일 선택도 길이 1 배열로 저장 (e.g. `[3]`) |
| source      | ENUM('priority_gate','context','concern','traceback') | 입력 출처                                                   |
| created_at  | TIMESTAMPTZ                                           | 최초 입력일                                                 |
| updated_at  | TIMESTAMPTZ NULLABLE                                  | 마지막 변경일. 최초 INSERT 후 변경 전까지 null              |

**인덱스 / 제약**

- `pk_user_responses` (PK)
- `uq_user_responses_anonymous_device_question` (UNIQUE on `device_id, question_id WHERE user_id IS NULL`) — 비로그인 device별 질문 1 row
- `uq_user_responses_user_question` (UNIQUE on `user_id, question_id WHERE user_id IS NOT NULL`) — 로그인 사용자별 질문 1 row
- `fk_user_responses_question_id` (FK on `question_id` → `questions.id`)

> current-state 테이블. 답변 수정 시 새 row를 INSERT하지 않고 같은 질문 row를 UPDATE한다.  
> 비로그인 조회: `WHERE device_id = ? AND user_id IS NULL` / 로그인 조회: `WHERE user_id = ?`  
> 사용자 1명이 답할 수 있는 canonical question이 30개라면 active row도 최대 30개다. 아직 답하지 않은 질문 row는 만들지 않는다.
>
> `source = concern` row는 확정 답변이 아니라 concern preset에서 온 초기 선택 상태다. 이 경우에도 `question_id`는 반드시 canonical `questions.id`를 참조한다.
>
> 같은 canonical question 을 여러 화면 variant 로 묻더라도 응답 row 는 question_id 단위로 하나뿐이다. "사용자가 마지막에 어떤 variant 를 답했는지" 는 `session_events` 의 `value_change` 이벤트 payload (`question_variant_id` 포함) 로 추적한다.
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

응답 저장은 위 unique index 중 현재 신원 상태에 맞는 제약을 기준으로 UPSERT한다. UPDATE 시 `value`, `source`, `updated_at`을 갱신한다. 로그인 병합 중 같은 `user_id + question_id` row가 이미 있으면 `updated_at`이 더 최신인 값을 유지한다. 어느 세션/variant 에서 답했는지는 별도 컬럼이 아니라 `session_events`의 `value_change` 이벤트 payload 로 추적한다.

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
  "question_id": "q_study_focus",
  "value": [1],
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

| 컬럼                  | 타입                                                  | 설명                                               |
| --------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| id                    | UUID PK                                               | Rule ID                                            |
| name                  | VARCHAR(200)                                          | Rule 이름                                          |
| priority              | INTEGER                                               | 우선순위                                           |
| is_active             | BOOLEAN DEFAULT true                                  | 활성 여부                                          |
| result_type           | ENUM('STOP','HOLD','CAUTION','PASS','ROUTE_CATEGORY') | 결과 타입                                          |
| result_title          | TEXT                                                  | 결과 제목                                          |
| result_description    | TEXT                                                  | 결과 설명                                          |
| hold_categories       | JSONB NULLABLE                                        | 보류 제품군 (배열 객체: `[{category_id, reason}]`) |
| recommend_category_id | UUID FK → product_categories.id NULLABLE              | 추천 제품군                                        |
| cta_label             | VARCHAR(100) NULLABLE                                 | CTA 문구                                           |
| cta_target            | VARCHAR(255) NULLABLE                                 | CTA 이동 경로                                      |
| created_at            | TIMESTAMPTZ                                           | 생성일                                             |
| updated_at            | TIMESTAMPTZ                                           | 수정일                                             |

예시:

```json
{
  "name": "최근 자극 반복 → 새 제품 보류",
  "priority": 1,
  "result_type": "HOLD",
  "result_title": "지금은 새 제품보다 피부 반응 안정화가 먼저예요.",
  "hold_categories": [
    { "category_id": "<uuid of serum>", "reason": "기능성 제품은 자극 안정화 이후" },
    { "category_id": "<uuid of toner>", "reason": "새 제품 추가 전 루틴 단순화 필요" }
  ]
}
```

---

### priority_rule_conditions

Priority Rule 발동 조건.

| 컬럼        | 타입                                         | 설명          |
| ----------- | -------------------------------------------- | ------------- |
| id          | UUID PK                                      | 조건 ID       |
| rule_id     | UUID FK → priority_rules.id                  | Rule ID       |
| question_id | UUID FK → questions.id                       | 기준 질문 ID  |
| operator    | ENUM('EQ','IN','CONTAINS','GTE','LTE','NEQ') | 연산자        |
| value       | INTEGER[]                                    | 비교값        |
| state       | ENUM('REQUIRED','EXCLUDED')                  | 조건 상태     |
| created_at  | TIMESTAMPTZ                                  | 생성일        |
| updated_at  | TIMESTAMPTZ NULLABLE                         | 마지막 변경일 |

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

| 컬럼                     | 타입                                    | 설명                                                                                                                     |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| id                       | BIGINT PK (IDENTITY)                    | 실행 기록 ID                                                                                                             |
| device_id                | UUID FK → devices.id                    | 기기 ID                                                                                                                  |
| user_id                  | UUID FK → users.id NULLABLE             | 로그인 시 병합, 비로그인 null                                                                                            |
| session_id               | UUID FK → user_sessions.id              | 세션 ID                                                                                                                  |
| decision_type            | VARCHAR(50)                             | 결과 종류 (`PRIORITY_GATE` / `CATEGORY_DECISION` / `PRODUCT_MATRIX` / `REACTION_TRACEBACK` — application enum 으로 검증) |
| source_screen            | VARCHAR(100)                            | 발생 화면                                                                                                                |
| category_id              | UUID NULLABLE (FK 없음 · 스냅샷 기록용) | 대상 제품군 (당시 값 기록)                                                                                               |
| filter_state_id          | UUID NULLABLE (FK 없음 · 스냅샷 기록용) | 적용된 필터 상태 (당시 값 기록)                                                                                          |
| result_type              | VARCHAR(50) NULLABLE                    | 결과 타입 snapshot                                                                                                       |
| result_title             | TEXT NULLABLE                           | 결과 제목 snapshot                                                                                                       |
| result_description       | TEXT NULLABLE                           | 결과 설명 snapshot                                                                                                       |
| cta_label                | VARCHAR(100) NULLABLE                   | CTA 문구 snapshot                                                                                                        |
| cta_target               | VARCHAR(255) NULLABLE                   | CTA 경로 snapshot                                                                                                        |
| input_snapshot           | JSONB                                   | 당시 입력값 (user_responses 등)                                                                                          |
| applied_filters_snapshot | JSONB                                   | 적용된 필터 목록 + attribute 조건                                                                                        |
| result_snapshot          | JSONB                                   | 조회된 제품 목록, tags, cautions 등                                                                                      |
| created_at               | TIMESTAMPTZ                             | 생성일                                                                                                                   |

예시 (Product Matrix 결과):

```json
{
  "decision_type": "PRODUCT_MATRIX",
  "source_screen": "product_matrix",
  "category_id": "cat_sunscreen",
  "applied_filters_snapshot": {
    "filters": [
      {
        "matrix_filter_definition_id": "matrix_filter_eye_sting_low",
        "label": "눈시림 위험",
        "attribute_key": "eye_sting",
        "operator": "IN",
        "value": ["none", "low"]
      },
      {
        "matrix_filter_definition_id": "matrix_filter_spf_50_plus",
        "label": "SPF",
        "attribute_key": "spf",
        "operator": "GTE",
        "value": 50
      }
    ],
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
        "price_krw": 18000
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
| sort_order  | INTEGER             | 노출 순서 |
| created_at  | TIMESTAMPTZ         | 생성일    |
| updated_at  | TIMESTAMPTZ         | 수정일    |

예시: `{ "key": "sunscreen", "name": "선크림", "sort_order": 20 }`

---

### category_attribute_definitions

제품군별 속성 정의.

| 컬럼        | 타입                                                  | 설명         |
| ----------- | ----------------------------------------------------- | ------------ |
| id          | UUID PK                                               | 속성 정의 ID |
| category_id | UUID FK → product_categories.id                       | 제품군 ID    |
| key         | VARCHAR(100)                                          | 속성 키      |
| label       | VARCHAR(200)                                          | 속성 이름    |
| value_type  | ENUM('BOOLEAN','ENUM','NUMBER','MULTI_ENUM','STRING') | 값 타입      |
| options     | JSONB NULLABLE                                        | 선택지       |
| is_required | BOOLEAN DEFAULT false                                 | 필수 여부    |
| sort_order  | INTEGER DEFAULT 0                                     | 노출 순서    |
| created_at  | TIMESTAMPTZ                                           | 생성일       |
| updated_at  | TIMESTAMPTZ                                           | 수정일       |

예시 (선크림):

```json
{ "key": "spf", "label": "SPF", "value_type": "NUMBER" }
{ "key": "eye_sting", "label": "눈시림 위험", "value_type": "ENUM", "options": ["none","low","medium","high"] }
```

---

### products

| 컬럼          | 타입                                  | 설명                                             |
| ------------- | ------------------------------------- | ------------------------------------------------ |
| id            | UUID PK                               | 제품 ID                                          |
| brand_id      | UUID FK → brands.id                   | 브랜드 ID                                        |
| category_id   | UUID FK → product_categories.id       | 제품군 ID                                        |
| name          | VARCHAR(500)                          | 제품명 (브랜드 + 제품명 + 옵션 함께 들어갈 여유) |
| price_krw     | INTEGER                               | 가격 (KRW)                                       |
| volume_amount | NUMERIC(10,2) NULLABLE                | 액체/내용량 수치                                 |
| volume_unit   | ENUM('ML','G','L','MG') NULLABLE      | 내용량 단위                                      |
| count_amount  | INTEGER NULLABLE                      | 개수/장수 (시트 마스크 등)                       |
| count_unit    | ENUM('SHEET','PIECE','PACK') NULLABLE | 개수 단위 (장 / 매 / 개 / 팩)                    |
| volume_label  | VARCHAR(100) NULLABLE                 | 화면 표시용 원문 (예: `70매 / 160ml`)            |
| image_url     | TEXT NULLABLE                         | 이미지                                           |
| purchase_url  | TEXT NULLABLE                         | 구매 링크                                        |
| attributes    | JSONB                                 | 제품군별 속성                                    |
| sort_order    | INTEGER DEFAULT 0                     | 관리자 큐레이션 순서                             |
| is_active     | BOOLEAN DEFAULT true                  | 노출 여부                                        |
| created_at    | TIMESTAMPTZ                           | 생성일                                           |
| updated_at    | TIMESTAMPTZ                           | 수정일                                           |

> 바코드는 실제로는 "스캔 시 제품 정보를 외부 lookup 한 뒤 검색"하는 경로로 사용되므로 본 테이블에는 보관하지 않는다. 필요해지면 별도 컬럼 또는 매핑 테이블로 후속 도입.
>
> 가격대(`price_band`)는 카테고리마다 기준이 달라질 수 있어 DB 컬럼이 아니라 service/UI 레이어 계산값으로 둔다. 제품별로는 `price_krw` 만 보관.
>
> 용량은 액체/그램(`volume_*`)과 개수/장수(`count_*`)를 분리해서 보관하고, 화면 표시 원문은 `volume_label` 로 따로 보관한다. 둘 다 nullable 이라 한쪽만 채워진 제품(예: 시트 마스크 70매)도 자연스럽게 표현된다.

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

## 5. Product Filter (정의 + 자동 선택 룰)

Product Matrix 의 필터 시스템은 네 가지 책임으로 분리된다.

1. **`product_filter_definitions`** — product attribute 하나를 어떻게 필터링할 수 있는지 정의하는 원자 필터.
2. **`product_matrix_filter_definitions`** — Product Matrix 에 노출/자동 적용되는 UI 필터 카탈로그. attribute-backed 일 수도, computed/system 필터일 수도 있다.
3. **`question_filter_mappings`** — 사용자 답변이 특정 조건을 만족할 때 어떤 matrix filter 를 자동 선택할지.
4. **`product_matrix_filter_states`** (다음 §6) — 사용자가 Product Matrix 에서 현재 활성화한 필터 묶음 (state).

`category_attribute_definitions` 는 제품 attribute 스키마(`products.attributes` JSONB 의 key/type/options) 만 정의한다. 필터 가능 여부와 Matrix 노출 정책은 별도 테이블이 담당한다.

### product_filter_definitions

Product attribute 하나에 대해 사용자가 선택할 수 있는 operator/value/input 형태를 정의한다. Matrix 노출 정책(`기본 적용`, `+ 버튼 노출`)은 여기서 다루지 않는다.

| 컬럼                    | 타입                                             | 설명                                                        |
| ----------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| id                      | UUID PK                                          | 필터 정의 ID                                                |
| attribute_definition_id | UUID FK → category_attribute_definitions.id      | 어떤 product attribute 를 필터링할지                        |
| label                   | VARCHAR(100)                                     | 사용자에게 보이는 필터명 (예: `SPF`, `눈시림 위험`, `백탁`) |
| default_operator        | comparison_operator_enum                         | 기본 연산자                                                 |
| allowed_operators       | comparison_operator_enum[]                       | 사용자가 선택할 수 있는 연산자 목록                         |
| default_value           | JSONB                                            | 기본값                                                      |
| input_type              | ENUM('NUMBER','SELECT','MULTI_SELECT','BOOLEAN') | UI 입력 위젯 종류                                           |
| options                 | JSONB NULLABLE                                   | `SELECT` / `MULTI_SELECT` 선택지 (그 외 input_type 은 null) |
| sort_order              | INTEGER DEFAULT 0                                | 표시 순서                                                   |
| is_active               | BOOLEAN DEFAULT true                             | 활성 여부                                                   |
| created_at              | TIMESTAMPTZ                                      | 생성일                                                      |
| updated_at              | TIMESTAMPTZ                                      | 수정일                                                      |

**예시 (선크림):**

| label         | attribute (via attribute_definition_id) | default_operator | default_value    | input_type   | options                          |
| ------------- | --------------------------------------- | ---------------- | ---------------- | ------------ | -------------------------------- |
| `SPF`         | sunscreen.`spf`                         | `GTE`            | `50`             | NUMBER       | null                             |
| `PA`          | sunscreen.`pa`                          | `EQ`             | `"++++"`         | SELECT       | `["+","++","+++","++++"]`        |
| `눈시림 위험` | sunscreen.`eye_sting`                   | `IN`             | `["none","low"]` | MULTI_SELECT | `["none","low","medium","high"]` |
| `백탁`        | sunscreen.`white_cast`                  | `IN`             | `["none","low"]` | MULTI_SELECT | `["none","low","medium","high"]` |
| `향료 없음`   | (공통) `fragrance`                      | `EQ`             | `false`          | BOOLEAN      | null                             |

> `category_id` 는 별도 컬럼으로 두지 않는다. `attribute_definition_id → category_attribute_definitions.category_id` 로 도달.
>
> 필터 카탈로그는 attribute schema (`category_attribute_definitions`) 와 분리된다 — 같은 attribute(예: `eye_sting`) 에 대해 의미가 다른 여러 filter_definition 을 둘 수 있다.
>
> `allowed_operators` 는 `default_operator` 를 반드시 포함해야 한다. `default_value` / `options` 의 shape 검증은 `input_type` 과 attribute value_type 을 함께 보며 application/Zod validation 에서 강제한다.
>
> `is_default`, `is_manual_selectable` 은 이 테이블에 두지 않는다. Matrix 노출 정책은 attribute-backed 필터와 1:1로 맞지 않을 수 있으므로 `product_matrix_filter_definitions` 로 분리한다.

---

### product_matrix_filter_definitions

Product Matrix 에 실제로 노출되거나 자동 적용되는 UI 필터 카탈로그. 단순 attribute 필터는 `product_filter_definition_id` 로 연결하고, 복합/시스템 필터는 `computed_filter_key` + `condition_payload` 로 service 가 해석한다.

| 컬럼                         | 타입                                             | 설명                                                        |
| ---------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| id                           | UUID PK                                          | Matrix 필터 정의 ID                                         |
| category_id                  | UUID FK → product_categories.id                  | 제품군                                                      |
| product_filter_definition_id | UUID FK → product_filter_definitions.id NULLABLE | attribute-backed 필터일 때 참조                             |
| key                          | VARCHAR(100)                                     | 카테고리 내 seed/admin/debug용 slug                         |
| label                        | VARCHAR(100)                                     | 사용자에게 보이는 필터명                                    |
| definition_kind              | ENUM('ATTRIBUTE','COMPUTED')                     | attribute-backed 필터인지 computed/system 필터인지          |
| computed_filter_key          | VARCHAR(100) NULLABLE                            | `definition_kind='COMPUTED'` 일 때 application handler key  |
| operator_override            | comparison_operator_enum NULLABLE                | attribute-backed 기본 operator 를 Matrix 필터별로 덮어쓸 때 |
| value_override               | JSONB NULLABLE                                   | attribute-backed 기본 value 를 Matrix 필터별로 덮어쓸 때    |
| condition_payload            | JSONB NULLABLE                                   | computed/system 필터 조건 payload                           |
| is_default                   | BOOLEAN DEFAULT false                            | 카테고리 진입 시 기본 적용 여부 (구 `BASIC_CONDITION`)      |
| is_manual_selectable         | BOOLEAN DEFAULT true                             | "+ 필터 추가" 버튼에 노출 여부                              |
| sort_order                   | INTEGER DEFAULT 0                                | 표시 순서                                                   |
| is_active                    | BOOLEAN DEFAULT true                             | 활성 여부                                                   |
| created_at                   | TIMESTAMPTZ                                      | 생성일                                                      |
| updated_at                   | TIMESTAMPTZ                                      | 수정일                                                      |

**예시:**

| key               | definition_kind | product_filter_definition | computed_filter_key | is_default | is_manual_selectable |
| ----------------- | --------------- | ------------------------- | ------------------- | ---------- | -------------------- |
| `spf_50_plus`     | ATTRIBUTE       | sunscreen.`spf`           | null                | true       | true                 |
| `eye_sting_low`   | ATTRIBUTE       | sunscreen.`eye_sting`     | null                | false      | true                 |
| `clear_purpose`   | COMPUTED        | null                      | `clear_purpose`     | true       | false                |
| `triple_moisture` | COMPUTED        | null                      | `triple_moisture`   | false      | true                 |

> `definition_kind='ATTRIBUTE'` 이면 `product_filter_definition_id` 가 필요하고, `definition_kind='COMPUTED'` 이면 `computed_filter_key` 가 필요하다. 이 XOR 제약은 DB CHECK 또는 application validation 으로 강제한다.
>
> default/manual 노출 여부는 Matrix UI 책임이므로 본 테이블에 둔다.

---

### question_filter_mappings

사용자 답변(`user_responses.value`)이 특정 조건을 만족할 때 어떤 Matrix 필터를 자동으로 선택할지 정의하는 룰 테이블. (구 `product_filter_mappings` 의 rename — 이제는 attribute 조건을 직접 들고 있지 않고, Matrix filter definition 을 가리키기만 한다.)

| 컬럼                        | 타입                                           | 설명                                |
| --------------------------- | ---------------------------------------------- | ----------------------------------- |
| id                          | UUID PK                                        | 매핑 ID                             |
| trigger_question_id         | UUID FK → questions.id                         | 사용자 답변 기준 질문               |
| trigger_operator            | comparison_operator_enum                       | trigger 연산자                      |
| trigger_value               | INTEGER[]                                      | trigger 비교값 (단일도 길이 1 배열) |
| matrix_filter_definition_id | UUID FK → product_matrix_filter_definitions.id | 자동 선택할 Matrix 필터 정의        |
| created_at                  | TIMESTAMPTZ                                    | 생성일                              |
| updated_at                  | TIMESTAMPTZ NULLABLE                           | 수정일                              |

> 발동 시 Matrix filter definition 이 attribute-backed 이면 연결된 `product_filter_definition` 의 `default_operator` / `default_value` 를 쓰고, `operator_override` / `value_override` 가 있으면 그것을 우선한다. computed/system 필터는 `computed_filter_key` 와 `condition_payload` 를 service 가 해석한다.
>
> 카테고리 진입 시 기본 필터(구 `BASIC_CONDITION`)는 본 테이블이 아니라 `product_matrix_filter_definitions.is_default = true` 로 결정된다. 즉 본 테이블은 "사용자 답변에 기반한 개인화 자동 선택"(구 `PERSONALIZED`)만 담당한다.

**매핑 예시 (선크림):**

| trigger 기준 질문 (key)          | trigger 조건 | matrix_filter_definition (label) |
| -------------------------------- | ------------ | -------------------------------- |
| `context.eye_sting`              | `EQ [1]`     | `눈시림 위험`                    |
| `life.outdoor_activity`          | `IN [3,2]`   | `SPF` (default `GTE 50`)         |
| `context.white_cast_sensitive`   | `EQ [1]`     | `백탁`                           |
| `preference.fragrance_sensitive` | `EQ [1]`     | `향료 없음`                      |

---

### Product Matrix 조회 방식

```
1. 진입 시 활성 product_matrix_filter_states row 확보
   - DIRECT: 해당 category 의 가장 최근 row 복원
   - CATEGORY_DECISION_CTA: 새 row INSERT (아래 2 절차로 filters 합성)

2. filters 합성 (CTA 진입 시):
   a. product_matrix_filter_definitions WHERE category_id=? AND is_default = true
      → 각 Matrix 정의의 기본 operator/value 또는 computed payload 로 filters[] 항목 생성
   b. question_filter_mappings 중 trigger_question_id 가 user_responses 와 매칭되고 trigger_operator/value 가 맞는 row
      → 그 row 의 matrix_filter_definition_id 로 filters[] 항목 추가
   c. 중복 matrix_filter_definition_id 는 합치고, 사용자가 손댄 항목은 그대로 유지

3. 사용자가 + 버튼 클릭:
   product_matrix_filter_definitions WHERE category_id=? AND is_manual_selectable = true
   → 드롭다운 후보. 선택 시 product_matrix_filter_states.filters UPDATE + session_events 이벤트

4. 실제 SQL 생성:
   각 filters[] 항목별로
     matrix_filter_definition_id → product_matrix_filter_definitions
       - ATTRIBUTE: product_filter_definition_id → category_attribute_definitions.key
       - COMPUTED: computed_filter_key handler
     → products.attributes 또는 computed handler 조건 생성

5. avoidance_rules 후처리 (AVOID 제외 / CAUTION 태그)
6. products.sort_order 정렬
7. decision_runs.applied_filters_snapshot 에 결과 snapshot 저장
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

## 6. Product Matrix State

### product_matrix_filter_states

사용자가 Product Matrix 에서 현재 활성화한 필터 묶음. Matrix 필터 정의 자체는 `product_matrix_filter_definitions` 가 들고 있고, 이 테이블은 그 정의 중 어떤 것을 선택했는지와 사용자가 손댄 비교 조건만 보관한다.

| 컬럼        | 타입                                                       | 설명                                                                       |
| ----------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| id          | UUID PK                                                    | ID                                                                         |
| device_id   | UUID FK → devices.id                                       | 기기 ID                                                                    |
| user_id     | UUID FK → users.id NULLABLE                                | 로그인 시 병합, 비로그인 null                                              |
| category_id | UUID FK → product_categories.id                            | 제품군                                                                     |
| source      | ENUM('DIRECT','CATEGORY_DECISION_CTA','MANUAL','RESTORED') | 필터 상태 생성 경로                                                        |
| filters     | JSONB                                                      | `[{matrix_filter_definition_id, operator, value}]` 형태의 적용된 필터 배열 |
| created_at  | TIMESTAMPTZ                                                | 생성일                                                                     |
| updated_at  | TIMESTAMPTZ                                                | 수정일                                                                     |

> `is_active` 컬럼은 두지 않는다. 활성 상태는 row 의 `updated_at` 으로 정렬해 가장 최근 row 를 현재 상태로 본다. 과거 row 가 필요하면 `created_at` 기준 history 로 조회한다.

**source 정의:**

| source                  | 설명                                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIRECT`                | 직접 Product Matrix 접근 (기존 상태 복원)                                                                                                            |
| `CATEGORY_DECISION_CTA` | Category Decision 결과에서 CTA로 진입. `product_matrix_filter_definitions.is_default = true` + `question_filter_mappings` trigger 매칭으로 자동 합성 |
| `MANUAL`                | 사용자가 필터를 직접 추가/삭제                                                                                                                       |
| `RESTORED`              | 이전 방문/저장 상태에서 복원                                                                                                                         |

**filters JSON 구조:**

각 항목은 `product_matrix_filter_definitions.id` 하나(`matrix_filter_definition_id`)와 현재 비교 조건(`operator`, `value`)을 가진다. 사용자가 손대지 않았으면 Matrix 정의가 가리키는 기본 operator/value 가 들어 있고, 손댔으면 그 값으로 덮어쓰여 있다.

```json
{
  "category_id": "<uuid of sunscreen>",
  "source": "CATEGORY_DECISION_CTA",
  "filters": [
    { "matrix_filter_definition_id": "<uuid of SPF>", "operator": "GTE", "value": 50 },
    {
      "matrix_filter_definition_id": "<uuid of 눈시림 위험>",
      "operator": "IN",
      "value": ["none", "low"]
    }
  ]
}
```

> filter 의 표시 라벨, 입력 위젯, 선택 가능 연산자 등 UI 메타데이터는 본 row 가 아니라 `matrix_filter_definition_id → product_matrix_filter_definitions → product_filter_definitions` join 으로 조회한다. state 에 snapshot 처럼 중복 저장하지 않는다.
>
> 당시 사용자에게 실제로 보여준 결과는 본 row 가 아니라 `decision_runs.applied_filters_snapshot` 에 별도로 저장된다.
>
> `filters[]` 에는 `label`, `attribute_key`, `source_type` 같은 snapshot/display 필드를 넣지 않는다. 현재 상태는 `matrix_filter_definition_id`, 사용자가 선택한 `operator`, `value` 만 보관한다.

**동작 방식:**

- Product Matrix 단순 접근 시: 해당 category 의 최근 row 를 복원 (가장 최신 `updated_at`).
- Category Decision CTA 진입 시: §5 "Product Matrix 조회 방식" 의 2번 절차로 filters 합성 후 새 row INSERT.
- 사용자가 필터 추가/삭제: 같은 row UPDATE + `session_events` 이벤트.
- 실제 조회 결과는 `decision_runs` snapshot 으로 보존.

> 화면 재조회는 `decision_runs` snapshot 을 재사용하지 말고, `product_matrix_filter_states` 기준으로 현재 `products` 를 다시 조회한다. snapshot 은 이력/고객지원용이다.

---

## 7. 성분 / Reaction Traceback

### ingredients

| 컬럼       | 타입                  | 설명                                                                  |
| ---------- | --------------------- | --------------------------------------------------------------------- |
| id         | UUID PK               | 성분 ID                                                               |
| name_ko    | VARCHAR(200)          | 한글 성분명                                                           |
| name_en    | VARCHAR(200) NULLABLE | 영문 성분명. CSV seed 단계에서는 `NULL`, admin/API enrichment 후 저장 |
| inci_name  | VARCHAR(300) NULLABLE | INCI 이름                                                             |
| created_at | TIMESTAMPTZ           | 생성일                                                                |
| updated_at | TIMESTAMPTZ           | 수정일                                                                |

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

제약:

- `UNIQUE (product_id, ingredient_id)` — 같은 제품에 같은 성분 중복 방지
- `UNIQUE (product_id, order_index)` — 같은 제품의 전성분 순서 중복 방지

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

Production seed 구현 위치:

- `backend/src/seed/data/attributes.ts`: 카테고리별 attribute definition
- `backend/src/seed/data/filters.ts`: product/matrix filter definition 및 question mapping
- `backend/src/seed/data/toner-products.ts`: CSV 정규화 완료된 25개 토너 제품 상수
- `backend/prisma/seed.ts`: `seedReferenceData(prisma)` 후 `seedProductCatalog(prisma)` 실행

#### 토너 (toner)

Toner seed는 `docs/화장품 성분비교.CSV`를 한 번 정규화한 TypeScript 상수를 사용하며 runtime CSV parsing을 하지 않는다. `피부타입메모`는 product attribute가 아니므로 seed하지 않는다.

| key                     | value_type | 설명                  | 예시 값                                                             |
| ----------------------- | ---------- | --------------------- | ------------------------------------------------------------------- |
| `form`                  | ENUM       | 제형                  | `water` / `viscous` / `milky` / `pad` / `mist`                      |
| `application_methods`   | MULTI_ENUM | 사용 방식             | `wipe` / `press` / `pack` / `mist`                                  |
| `role_tags`             | MULTI_ENUM | 실사용 역할           | `hydration` / `calming` / `exfoliation` / `oil_control` / `barrier` |
| `ph_label`              | ENUM       | pH 구간               | `weak_acidic` / `neutral` / `unknown`                               |
| `ph_value`              | NUMBER     | 숫자 pH               | `3.6`                                                               |
| `irritation_risk`       | ENUM       | 자극 가능성           | `low` / `medium` / `high`                                           |
| `exfoliation_type`      | ENUM       | 각질 케어 타입        | `none` / `aha` / `bha` / `pha` / `lha` / `enzyme` / `mixed`         |
| `alcohol`               | BOOLEAN    | 알코올 포함 여부      | `true` / `false`                                                    |
| `fragrance`             | BOOLEAN    | 향료/향료성 오일 여부 | `true` / `false`                                                    |
| `astringent_level`      | ENUM       | 수렴 성격             | `none` / `low` / `medium` / `high`                                  |
| `oil_control`           | ENUM       | 피지 조절             | `none` / `low` / `medium` / `high`                                  |
| `active_ingredients`    | MULTI_ENUM | 주요 성분             | `hyaluronic_acid` / `panthenol` / `ceramide`                        |
| `absorption_speed`      | ENUM       | 흡수 속도             | `slow` / `medium` / `fast`                                          |
| `layer_compatibility`   | ENUM       | 레이어링 적합도       | `good` / `fair` / `poor`                                            |
| `photosensitive`        | BOOLEAN    | 광민감성/낮 사용 주의 | `true` / `false`                                                    |
| `recommended_frequency` | ENUM       | 권장 사용 빈도        | `daily` / `weekly_1_3` / `as_needed`                                |

Deprecated toner keys: `hydration_level`, `emollient_level`, `film_level`, `finish`, `exfoliation_strength`, `essential_oil`, `cooling_feel`, `wipe_caution`, `cotton_pad_fit`, `sun_caution`.

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

### 필터 라벨 사전 (seed slug 참고용)

`product_matrix_filter_definitions.key` / `.label` 에 들어가는 표준 슬러그 카탈로그. `is_default = true` 가 구 BASIC_CONDITION (카테고리 진입 시 기본 적용), `false` 는 `question_filter_mappings` trigger 또는 사용자 + 버튼으로만 켜진다.

#### 선크림 (sunscreen)

| slug                 | is_default | label                        |
| -------------------- | ---------- | ---------------------------- |
| `spf_50_plus`        | true       | SPF 50 이상                  |
| `pa_4_plus`          | true       | PA++++                       |
| `eye_sting_low`      | true       | 눈시림 낮음                  |
| `white_cast_low`     | true       | 백탁 적음                    |
| `makeup_compat_good` | true       | 메이크업 궁합                |
| `outdoor_use`        | false      | 야외 활동 적합 (spf≥50)      |
| `no_eye_sting`       | false      | 눈시림 경험 있는 사용자 맞춤 |
| `no_white_cast`      | false      | 백탁 민감 사용자 맞춤        |
| `no_fragrance`       | false      | 향료 민감 맞춤               |
| `portable`           | false      | 휴대형                       |

#### 세럼 (serum)

| slug                    | is_default | label             |
| ----------------------- | ---------- | ----------------- |
| `low_irritation`        | true       | 자극 가능성 낮음  |
| `no_fragrance`          | false      | 향료 민감 맞춤    |
| `morning_use`           | false      | 아침 사용 적합    |
| `night_use`             | false      | 밤 사용 적합      |
| `no_conflict_retinol`   | false      | 레티놀 병행 주의  |
| `no_conflict_vitamin_c` | false      | 비타민C 병행 주의 |

#### 립케어 (lipcare)

| slug                   | is_default | label                 |
| ---------------------- | ---------- | --------------------- |
| `high_moisture`        | true       | 보습 지속력 높음      |
| `no_menthol`           | true       | 멘톨 없음             |
| `low_fragrance`        | true       | 향료 적음             |
| `no_menthol_sensitive` | false      | 멘톨 민감 사용자 맞춤 |
| `no_fragrance`         | false      | 향료 민감 맞춤        |
| `spf_included`         | false      | 야외 사용 SPF 포함    |
| `portable`             | false      | 휴대형                |
