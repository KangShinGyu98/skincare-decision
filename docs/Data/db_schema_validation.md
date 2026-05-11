> prisma.schema 가 PostgreSQL Table 로 변경되는 과정에서 문제가 없는지 확인하기 위한 1회성 문서 

# DB 스키마 자료형·인덱스 검증

> **기준 파일**
>
> - [backend/prisma/schema.prisma](../backend/prisma/schema.prisma)
> - [backend/prisma/migrations/20260508175123_init/migration.sql](../backend/prisma/migrations/20260508175123_init/migration.sql)
>
> **교차 검증 대상**: [docs/db_modeling.md](db_modeling.md)
>
> 모든 표는 위 두 파일의 실제 정의를 1차 진실로 삼고, db_modeling.md와 불일치하는 항목은 ⚠ 표시로 따로 기록한다.

---

## 0. 사전 정보

### 0.1 Prisma → PostgreSQL 자료형 매핑

| Prisma                        | PostgreSQL                                                 | 비고                                                                     |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `String @db.Uuid`             | `UUID`                                                     | Prisma 클라이언트가 v4 UUID를 발급 (DB default 없음)                     |
| `String @db.VarChar(N)`       | `VARCHAR(N)`                                               | 길이 제한                                                                |
| `String @db.Text`             | `TEXT`                                                     | 길이 무제한                                                              |
| `Int`                         | `INTEGER`                                                  | 32-bit                                                                   |
| `Boolean`                     | `BOOLEAN`                                                  |                                                                          |
| `Json`                        | `JSONB`                                                    | 인덱싱 가능, 단 GIN 인덱스는 별도 추가 필요                              |
| `DateTime @default(now())`    | `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`          | 밀리초 정밀도, **타임존 없음**                                           |
| `DateTime @updatedAt`         | `TIMESTAMP(3) NOT NULL`                                    | DB default 없음. Prisma 클라이언트가 UPDATE마다 갱신                     |
| `enum X { A B }`              | `CREATE TYPE "X" AS ENUM ('A','B')` + 컬럼 타입 `"X"`      | enum 이름이 SQL 타입으로 그대로 노출됨 (큰따옴표 포함)                   |
| `String? ...`                 | 동일 타입 (NULL 허용)                                      | 모든 nullable은 `NOT NULL`을 떼고 생성됨                                 |

### 0.2 enum 정의

| enum                              | 값                                                                 | 사용 컬럼                                                                              |
| --------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `UserRole`                        | `USER`, `ADMIN`                                                    | `users.role`                                                                           |
| `SessionStatus`                   | `ACTIVE`, `COMPLETED`, `EXPIRED`                                   | `user_sessions.status`                                                                 |
| `FactGroup`                       | `LIFE`, `ROUTINE`, `PRODUCT`, `CONTEXT`, `CATEGORY`, `REACTION`    | `fact_definitions.group`                                                               |
| `FactValueType`                   | `BOOLEAN`, `ENUM`, `MULTI_ENUM`, `NUMBER`, `JSON`                  | `fact_definitions.value_type`                                                          |
| `AttributeValueType`              | `BOOLEAN`, `ENUM`, `NUMBER`, `MULTI_ENUM`, `STRING`                | `category_attribute_definitions.value_type`                                            |
| `QuestionInputType`               | `BOOLEAN`, `SINGLE_SELECT`, `MULTI_SELECT`, `CHECKBOX`, `TAG`      | `context_questions.input_type`                                                         |
| `QuestionScreen`                  | `priority_gate`, `context`                                         | `context_questions.screen`                                                             |
| `ComparisonOperator`              | `EQ`, `IN`, `CONTAINS`, `GTE`, `LTE`, `NEQ`                        | `question_visibility_conditions.operator`, `priority_rule_conditions.operator`, `product_filter_mappings.source_operator` / `.attribute_operator` |
| `ConditionState`                  | `REQUIRED`, `EXCLUDED`                                             | `question_visibility_conditions.state`, `priority_rule_conditions.state`               |
| `UserFactSource`                  | `priority_gate`, `context`, `concern`, `traceback`                 | `user_facts.source`                                                                    |
| `PriorityResultType`              | `STOP`, `HOLD`, `CAUTION`, `PASS`, `ROUTE_CATEGORY`                | `priority_rules.result_type`                                                           |
| `DecisionType`                    | `PRIORITY_GATE`, `CATEGORY_DECISION`, `PRODUCT_MATRIX`, `REACTION_TRACEBACK` | `decision_runs.decision_type`                                                |
| `PriceBand`                       | `UNDER_20000`, `BETWEEN_20000_50000`, `OVER_50000`                 | `products.price_band`                                                                  |
| `FilterMode`                      | `HARD_FILTER`, `EXCLUDE`, `CAUTION`, `SORT`, `TAG`                 | `product_filter_mappings.filter_mode`                                                  |
| `FilterType`                      | `BASIC_CONDITION`, `PERSONALIZED`                                  | `product_filter_mappings.filter_type`                                                  |
| `ProductMatrixFilterStateSource`  | `DIRECT`, `CATEGORY_DECISION_CTA`, `MANUAL`, `RESTORED`            | `product_matrix_filter_states.source`                                                  |
| `ReactionReportProductType`       | `PROBLEM`, `OK`                                                    | `reaction_report_products.type`                                                        |
| `ConfidenceLevel`                 | `LOW`, `MEDIUM`, `HIGH`                                            | `suspected_causes.confidence`                                                          |
| `AvoidanceAction`                 | `AVOID`, `CAUTION`                                                 | `avoidance_rules.action`                                                               |

### 0.3 검출된 docs ↔ 실제 스키마 불일치 (요약)

| #   | 위치                                            | docs/db_modeling.md           | 실제 schema/migration                | 영향                                                  |
| --- | ----------------------------------------------- | ----------------------------- | ------------------------------------ | ----------------------------------------------------- |
| 1   | 모든 `created_at`/`updated_at` 류 컬럼          | `TIMESTAMP WITH TIME ZONE`    | `TIMESTAMP(3)` (타임존 없음)         | 타임존 처리 정책 결정 필요. 글로벌 사용자 시 주의     |
| 2   | `user_sessions.segment`                         | `ENUM('A','B','C','D') NULL`  | **컬럼 없음**                        | 세그먼트 측정 불가. 추가 마이그레이션 필요 시 결정    |
| 3   | `products.attributes` JSONB 조회                | "동적 SQL로 `attributes->>` 조회" | GIN 인덱스 없음                  | 제품 수 증가 시 풀스캔. GIN 인덱스 추가 검토          |
| 4   | 모든 `*Source: 'concern'` 표현 (소문자 enum)    | 소문자                         | `UserFactSource`는 소문자 enum 그대로 유지 (`priority_gate` 등) | OK |
| 5   | `priority_rules.hold_categories` 구조           | "보류 제품군 (JSONB)" 만 명시  | JSONB는 맞으나 스키마 미정의         | 런타임 검증 위치(Service)에서 Zod 스키마 정의 필요    |

각 표 본문에서 동일 불일치를 ⚠ 표시로 다시 짚는다.

---

## 1. 사용자 / 기기 / 세션 / 이벤트

### 1.1 `users`

| 필드 (DB 컬럼)              | Prisma 타입                | SQL 타입       | 제약                                | 설명                                                 | 예시                                       |
| --------------------------- | -------------------------- | -------------- | ----------------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| `id`                        | `String @id @db.Uuid`      | `UUID`         | PK, NOT NULL, 클라이언트 v4 발급    | 유저 UUID                                            | `8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d`     |
| `email`                     | `String @db.VarChar(255)`  | `VARCHAR(255)` | NOT NULL, UNIQUE                    | 로그인 이메일                                        | `user@example.com`                         |
| `name`                      | `String @db.VarChar(100)`  | `VARCHAR(100)` | NOT NULL                            | 표시 이름                                            | `홍길동`                                   |
| `role`                      | `UserRole`                 | `"UserRole"`   | NOT NULL                            | 권한 enum                                            | `USER`                                     |
| `createdAt` (`created_at`)  | `DateTime @default(now())` | `TIMESTAMP(3)` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 가입 시각                                            | `2026-05-08T10:00:00.000`                  |
| `updatedAt` (`updated_at`)  | `DateTime @updatedAt`      | `TIMESTAMP(3)` | NOT NULL, Prisma가 UPDATE마다 갱신  | 최종 갱신 시각                                       | `2026-05-08T10:05:23.123`                  |

**인덱스**

- `users_pkey` (PK on `id`)
- `users_email_key` (UNIQUE on `email`)

**설명**: 로그인 계정. 비로그인 사용자도 서비스를 쓸 수 있어서 모든 사용자 데이터의 진입점은 아니다. 로그인 시 `devices.user_id`를 채워 연결한다.

---

### 1.2 `devices`

| 필드            | Prisma 타입                  | SQL 타입       | 제약                                                            | 설명                                                                | 예시                                      |
| --------------- | ---------------------------- | -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `id`            | `String @id @db.Uuid`        | `UUID`         | PK, NOT NULL                                                    | 브라우저 cookie/localStorage에 저장되는 device_id                   | `dev-aa11...bb22`                         |
| `user_id`       | `String? @db.Uuid`           | `UUID`         | NULLABLE, FK → `users.id` ON DELETE SET NULL ON UPDATE CASCADE  | 로그인 시 연결되는 사용자                                           | `8a7b9c1d-...`                            |
| `last_seen_at`  | `DateTime @default(now())`   | `TIMESTAMP(3)` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                           | 마지막 활동 시각 (앱 hit 시 application 측에서 touch)               | `2026-05-08T10:00:00.000`                 |
| `created_at`    | `DateTime @default(now())`   | `TIMESTAMP(3)` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                           | 최초 방문 시각                                                      | `2026-04-30T08:11:42.000`                 |

**인덱스**

- `devices_pkey` (PK on `id`)
- `devices_user_id_idx` (on `user_id`) — 로그인 사용자별 device 조회용

**설명**: 브라우저/기기 단위 영구 신원. 시크릿 모드/쿠키 초기화 시 새 `device_id` 발급 → 이전 데이터와 단절(의도된 동작).

**설계 이유**: 회원 추적/광고 ID 없이 익명 사용을 1차로 두는 정책 때문에, "기기"가 비로그인 상태의 최소 신원 단위가 된다. `user_id`가 NULL 가능하므로 모든 자식 테이블도 `(device_id NOT NULL, user_id NULLABLE)` 패턴을 그대로 따른다.

---

### 1.3 `user_sessions`

| 필드             | Prisma 타입                   | SQL 타입         | 제약                                                              | 설명                                                       | 예시                                       |
| ---------------- | ----------------------------- | ---------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `id`             | `String @id @db.Uuid`         | `UUID`           | PK, NOT NULL                                                      | 세션 ID                                                    | `sess-...`                                 |
| `device_id`      | `String @db.Uuid`             | `UUID`           | NOT NULL, FK → `devices.id` ON DELETE RESTRICT                    | 소유 기기                                                  | `dev-aa11...`                              |
| `user_id`        | `String? @db.Uuid`            | `UUID`           | NULLABLE, FK → `users.id` ON DELETE SET NULL                      | 로그인 사용자 (있을 때만)                                  | `null` / UUID                              |
| `ab_variant`     | `String? @db.VarChar(100)`    | `VARCHAR(100)`   | NULLABLE                                                          | A/B 테스트 그룹                                            | `variant_b`                                |
| `status`         | `SessionStatus`               | `"SessionStatus"`| NOT NULL                                                          | 세션 상태                                                  | `ACTIVE`                                   |
| `entry_path`     | `String @db.VarChar(255)`     | `VARCHAR(255)`   | NOT NULL                                                          | 진입 경로 (`/`, `/concern/acne` 등)                        | `/`                                        |
| `referrer`       | `String? @db.Text`            | `TEXT`           | NULLABLE                                                          | 외부 referrer                                              | `https://instagram.com/...`                |
| `started_at`     | `DateTime @default(now())`    | `TIMESTAMP(3)`   | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                             | 세션 시작                                                  | `2026-05-08T10:00:00.000`                  |
| `last_seen_at`   | `DateTime @default(now())`    | `TIMESTAMP(3)`   | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                             | 마지막 활동 (30분 timeout 측정용)                          | `2026-05-08T10:25:00.000`                  |
| `completed_at`   | `DateTime?`                   | `TIMESTAMP(3)`   | NULLABLE                                                          | Priority Gate / 결과 도달 시각                             | `null` / 타임스탬프                        |
| `expires_at`     | `DateTime`                    | `TIMESTAMP(3)`   | NOT NULL                                                          | 만료 시각 (보통 `started_at + 30m`)                        | `2026-05-08T10:30:00.000`                  |
| `created_at`     | `DateTime @default(now())`    | `TIMESTAMP(3)`   | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                             | row 생성 시각                                              | `2026-05-08T10:00:00.000`                  |
| `updated_at`     | `DateTime @updatedAt`         | `TIMESTAMP(3)`   | NOT NULL                                                          | row 갱신 시각                                              | `2026-05-08T10:25:00.001`                  |

**인덱스**

- `user_sessions_pkey` (PK)
- `user_sessions_device_id_idx`
- `user_sessions_user_id_idx`

**설명**: 탭/유입 단위 활동창. 30분 비활동 시 `EXPIRED`. 유입 경로 분석·A/B 측정에 사용.

**⚠ 불일치**: db_modeling.md는 `segment ENUM('A','B','C','D') NULLABLE` 컬럼을 정의하지만 실제 스키마/마이그레이션에는 없다. 세그먼트 측정이 필요하면 별도 마이그레이션으로 추가 결정.

---

### 1.4 `session_events`

| 필드           | Prisma 타입                | SQL 타입       | 제약                                                       | 설명                                | 예시                                  |
| -------------- | -------------------------- | -------------- | ---------------------------------------------------------- | ----------------------------------- | ------------------------------------- |
| `id`           | `String @id @db.Uuid`      | `UUID`         | PK, NOT NULL                                               | 이벤트 ID                           | `evt-...`                             |
| `session_id`   | `String @db.Uuid`          | `UUID`         | NOT NULL, FK → `user_sessions.id` ON DELETE RESTRICT       | 소속 세션                           | UUID                                  |
| `device_id`    | `String @db.Uuid`          | `UUID`         | NOT NULL, FK → `devices.id` ON DELETE RESTRICT             | 분석용 비정규화 컬럼                | UUID                                  |
| `event_name`   | `String @db.VarChar(100)`  | `VARCHAR(100)` | NOT NULL                                                   | 이벤트 키                           | `concern_clicked`                     |
| `screen`       | `String @db.VarChar(100)`  | `VARCHAR(100)` | NOT NULL                                                   | 발생 화면                           | `landing`                             |
| `element_id`   | `String? @db.VarChar(100)` | `VARCHAR(100)` | NULLABLE                                                   | 버튼/카드 식별자                    | `segment_A`                           |
| `payload`      | `Json`                     | `JSONB`        | NOT NULL                                                   | 부가 정보                           | `{"concern":"acne","position":3}`     |
| `created_at`   | `DateTime @default(now())` | `TIMESTAMP(3)` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                      | 발생 시각                           | `2026-05-08T10:00:01.234`             |

**인덱스**

- `session_events_pkey` (PK)
- `session_events_device_id_idx`
- `session_events_session_id_idx`

**설명**: 클릭/노출/CTA 이벤트 로그. user_id 컬럼이 없는 것이 의도된 설계 — 로그인 사용자 추적은 `session_id → user_sessions.user_id` JOIN으로 수행한다.

**설계 이유**: 이벤트가 대량으로 들어오기 때문에 컬럼 수를 최소화한다. `device_id`는 분석 시 JOIN 줄이려고 비정규화로 직접 보관한다.

---

## 2. Fact / 질문 구조

### 2.1 `fact_definitions`

| 필드           | Prisma 타입                | SQL 타입            | 제약                                  | 설명                                              | 예시                              |
| -------------- | -------------------------- | ------------------- | ------------------------------------- | ------------------------------------------------- | --------------------------------- |
| `id`           | `String @id @db.Uuid`      | `UUID`              | PK, NOT NULL                          | 내부 PK (외부 참조는 `key`)                       | UUID                              |
| `key`          | `String @db.VarChar(100)`  | `VARCHAR(100)`      | NOT NULL, UNIQUE                      | 외부 참조용 식별자                                | `life.outdoor_activity`           |
| `label`        | `String @db.VarChar(200)`  | `VARCHAR(200)`      | NOT NULL                              | 관리자 표시명                                     | `낮 야외 활동 시간`               |
| `group`        | `FactGroup`                | `"FactGroup"`       | NOT NULL                              | 분류                                              | `LIFE`                            |
| `value_type`   | `FactValueType`            | `"FactValueType"`   | NOT NULL                              | value JSONB의 형 (BOOLEAN/ENUM/MULTI_ENUM/NUMBER/JSON) | `ENUM`                       |
| `options`      | `Json?`                    | `JSONB`             | NULLABLE                              | ENUM/MULTI_ENUM 선택지 배열                       | `["under_1h","1_3h","over_3h"]`   |
| `is_active`    | `Boolean @default(true)`   | `BOOLEAN`           | NOT NULL, DEFAULT `true`              | 비활성화 시 신규 질문/조건에서 제외               | `true`                            |
| `created_at`   | `DateTime @default(now())` | `TIMESTAMP(3)`      | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 생성                                              | `2026-04-01T00:00:00.000`         |
| `updated_at`   | `DateTime @updatedAt`      | `TIMESTAMP(3)`      | NOT NULL                              | 갱신                                              | `2026-05-08T10:00:00.000`         |

**인덱스**

- `fact_definitions_pkey` (PK)
- `fact_definitions_key_key` (UNIQUE on `key`)

**설명**: 시스템 전체에서 사용 가능한 fact_key의 마스터 카탈로그. 5개 자식 테이블(`context_questions`, `question_visibility_conditions`, `user_facts`, `priority_rule_conditions`, `product_filter_mappings`)이 `key`를 참조한다.

**설계 이유**: 외부 참조를 `id` 대신 `key`로 노출하는 이유 — 코드/문서/관리자 UI에서 사람이 읽기 쉬운 식별자가 필요하고, fact_key는 사실상 도메인 식별자이기 때문이다. UUID PK는 내부 join 효율용으로 유지.

---

### 2.2 `context_questions`

| 필드            | Prisma 타입                | SQL 타입              | 제약                                                                  | 설명                                | 예시                                 |
| --------------- | -------------------------- | --------------------- | --------------------------------------------------------------------- | ----------------------------------- | ------------------------------------ |
| `id`            | `String @id @db.Uuid`      | `UUID`                | PK, NOT NULL                                                          | 질문 ID                             | UUID                                 |
| `fact_key`      | `String @db.VarChar(100)`  | `VARCHAR(100)`        | NOT NULL, FK → `fact_definitions.key` ON DELETE RESTRICT              | 답변을 저장할 fact                  | `context.eye_sting`                  |
| `title`         | `String @db.VarChar(200)`  | `VARCHAR(200)`        | NOT NULL                                                              | 관리자 표시명                       | `눈시림 여부`                        |
| `question`      | `String @db.Text`          | `TEXT`                | NOT NULL                                                              | 사용자 노출 문구                    | `선크림을 바르면 눈이 시린 편인가요?`|
| `input_type`    | `QuestionInputType`        | `"QuestionInputType"` | NOT NULL                                                              | 입력 UI 종류                        | `BOOLEAN`                            |
| `options`       | `Json?`                    | `JSONB`               | NULLABLE                                                              | 노출 선택지 (label 포함)            | `[{"value":"daily","label":"매일"}]` |
| `screen`        | `QuestionScreen`           | `"QuestionScreen"`    | NOT NULL                                                              | 노출 화면 (priority_gate / context) | `priority_gate`                      |
| `ui_section`    | `String @db.VarChar(100)`  | `VARCHAR(100)`        | NOT NULL                                                              | 화면 내 박스 식별자                 | `life_routine`                       |
| `sort_order`    | `Int @default(0)`          | `INTEGER`             | NOT NULL, DEFAULT `0`                                                 | 노출 순서                           | `10`                                 |
| `is_active`     | `Boolean @default(true)`   | `BOOLEAN`             | NOT NULL, DEFAULT `true`                                              | 노출 여부                           | `true`                               |
| `created_at`    | `DateTime @default(now())` | `TIMESTAMP(3)`        | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                                 | 생성                                | 타임스탬프                           |
| `updated_at`    | `DateTime @updatedAt`      | `TIMESTAMP(3)`        | NOT NULL                                                              | 갱신                                | 타임스탬프                           |

**인덱스**

- `context_questions_pkey` (PK)
- `context_questions_fact_key_idx` (on `fact_key`)

**설명**: 사용자에게 실제로 노출되는 질문 정의. `fact_definitions`는 "값의 형", `context_questions`는 "표현"으로 역할 분리.

---

### 2.3 `question_visibility_conditions`

| 필드            | Prisma 타입                | SQL 타입               | 제약                                                                  | 설명                                 | 예시              |
| --------------- | -------------------------- | ---------------------- | --------------------------------------------------------------------- | ------------------------------------ | ----------------- |
| `id`            | `String @id @db.Uuid`      | `UUID`                 | PK, NOT NULL                                                          | 조건 ID                              | UUID              |
| `question_id`   | `String @db.Uuid`          | `UUID`                 | NOT NULL, FK → `context_questions.id` ON DELETE RESTRICT              | 대상 질문                            | UUID              |
| `fact_key`      | `String @db.VarChar(100)`  | `VARCHAR(100)`         | NOT NULL, FK → `fact_definitions.key` ON DELETE RESTRICT              | 비교 대상 fact                       | `category.selected` |
| `operator`      | `ComparisonOperator`       | `"ComparisonOperator"` | NOT NULL                                                              | 연산자                               | `EQ`              |
| `value`         | `Json`                     | `JSONB`                | NOT NULL                                                              | 비교값                               | `"sunscreen"`     |
| `state`         | `ConditionState`           | `"ConditionState"`     | NOT NULL                                                              | REQUIRED(모두 충족 시 노출) / EXCLUDED(하나라도 맞으면 숨김) | `REQUIRED` |
| `created_at`    | `DateTime @default(now())` | `TIMESTAMP(3)`         | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                                 | 생성                                 | 타임스탬프        |

**인덱스**

- `question_visibility_conditions_pkey` (PK)
- `question_visibility_conditions_fact_key_idx`
- `question_visibility_conditions_question_id_idx`

**설명**: 질문 노출 조건. 한 질문에 여러 조건이 매달리며 REQUIRED는 AND, EXCLUDED는 단일 매칭만으로 비노출 처리.

---

### 2.4 `user_facts`

| 필드          | Prisma 타입                | SQL 타입             | 제약                                                                | 설명                                  | 예시                  |
| ------------- | -------------------------- | -------------------- | ------------------------------------------------------------------- | ------------------------------------- | --------------------- |
| `id`          | `String @id @db.Uuid`      | `UUID`               | PK, NOT NULL                                                        | 답변 row ID                           | UUID                  |
| `device_id`   | `String @db.Uuid`          | `UUID`               | NOT NULL, FK → `devices.id` ON DELETE RESTRICT                      | 기기                                  | UUID                  |
| `user_id`     | `String? @db.Uuid`         | `UUID`               | NULLABLE, FK → `users.id` ON DELETE SET NULL                        | 로그인 시 자동 병합                   | UUID / null           |
| `session_id`  | `String @db.Uuid`          | `UUID`               | NOT NULL, FK → `user_sessions.id` ON DELETE RESTRICT                | 답한 세션                             | UUID                  |
| `fact_key`    | `String @db.VarChar(100)`  | `VARCHAR(100)`       | NOT NULL, FK → `fact_definitions.key` ON DELETE RESTRICT            | 어떤 fact에 대한 답인지               | `life.outdoor_activity` |
| `value`       | `Json`                     | `JSONB`              | NOT NULL                                                            | 답변값 (fact의 value_type을 따름)     | `"over_3h"`           |
| `source`      | `UserFactSource`           | `"UserFactSource"`   | NOT NULL                                                            | 어디서 입력했는지                     | `priority_gate`       |
| `created_at`  | `DateTime @default(now())` | `TIMESTAMP(3)`       | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                               | 답한 시각                             | 타임스탬프            |

**인덱스**

- `user_facts_pkey` (PK)
- `user_facts_device_id_fact_key_created_at_idx` (on `device_id, fact_key, created_at`) — 비로그인 최신 값 조회
- `user_facts_session_id_idx`
- `user_facts_user_id_fact_key_created_at_idx` (on `user_id, fact_key, created_at`) — 로그인 최신 값 조회

**설명**: append-only 답변 이력. 같은 fact_key에 대해 row가 여러 개 쌓이고, 최신값은 `ORDER BY created_at DESC LIMIT 1`.

**설계 이유**: UPDATE로 덮어쓰지 않는 이유는 ① 사용자가 답을 바꾼 흐름 자체가 분석 대상이고, ② 로그인 병합 시 device 이력과 user 이력을 손실 없이 합치려면 row 단위 timeline이 필요하기 때문. 복합 인덱스 `(device_id|user_id, fact_key, created_at)`로 최신값 조회 성능 보장.

---

## 3. Priority Gate

### 3.1 `priority_rules`

| 필드                       | Prisma 타입                | SQL 타입             | 제약                                                                          | 설명                                | 예시                       |
| -------------------------- | -------------------------- | -------------------- | ----------------------------------------------------------------------------- | ----------------------------------- | -------------------------- |
| `id`                       | `String @id @db.Uuid`      | `UUID`               | PK, NOT NULL                                                                  | Rule ID                             | UUID                       |
| `name`                     | `String @db.VarChar(200)`  | `VARCHAR(200)`       | NOT NULL                                                                      | 관리자용 Rule 이름                  | `선크림 루틴 우선`         |
| `priority`                 | `Int`                      | `INTEGER`            | NOT NULL                                                                      | 평가 순서 (낮을수록 우선)           | `1`                        |
| `is_active`                | `Boolean @default(true)`   | `BOOLEAN`            | NOT NULL, DEFAULT `true`                                                      | 평가 대상 여부                      | `true`                     |
| `result_type`              | `PriorityResultType`       | `"PriorityResultType"` | NOT NULL                                                                    | 결과 종류                           | `ROUTE_CATEGORY`           |
| `result_title`             | `String @db.Text`          | `TEXT`               | NOT NULL                                                                      | 사용자에 보여줄 결과 제목           | `세럼보다 선크림이 먼저예요` |
| `result_description`       | `String @db.Text`          | `TEXT`               | NOT NULL                                                                      | 결과 설명                           | (긴 문단)                  |
| `hold_categories`          | `Json?`                    | `JSONB`              | NULLABLE                                                                      | HOLD 결과 시 보류할 제품군 키 배열  | `["serum","retinol"]`      |
| `recommend_category_id`    | `String? @db.Uuid`         | `UUID`               | NULLABLE, FK → `product_categories.id` ON DELETE SET NULL                     | ROUTE_CATEGORY 시 추천 제품군       | UUID                       |
| `cta_label`                | `String? @db.VarChar(100)` | `VARCHAR(100)`       | NULLABLE                                                                      | CTA 버튼 문구                       | `선크림 보러가기`          |
| `cta_target`               | `String? @db.VarChar(255)` | `VARCHAR(255)`       | NULLABLE                                                                      | CTA 이동 경로                       | `/category/sunscreen`      |
| `created_at`               | `DateTime @default(now())` | `TIMESTAMP(3)`       | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                                         | 생성                                | 타임스탬프                 |
| `updated_at`               | `DateTime @updatedAt`      | `TIMESTAMP(3)`       | NOT NULL                                                                      | 갱신                                | 타임스탬프                 |

**인덱스**

- `priority_rules_pkey` (PK)
- `priority_rules_priority_is_active_idx` (on `priority, is_active`) — 활성 Rule을 우선순위 정렬로 한 번에
- `priority_rules_recommend_category_id_idx`

**설명**: Priority Gate 평가의 출력 정의. 조건은 자식 테이블 `priority_rule_conditions`에 분리.

**⚠ 불일치**: `hold_categories` JSONB의 구조(키 배열인지 객체인지)가 schema/migration에는 강제되지 않는다. Service 레이어에서 Zod로 `string[]` 형태 검증 필요.

---

### 3.2 `priority_rule_conditions`

| 필드          | Prisma 타입                | SQL 타입               | 제약                                                                | 설명                       | 예시                       |
| ------------- | -------------------------- | ---------------------- | ------------------------------------------------------------------- | -------------------------- | -------------------------- |
| `id`          | `String @id @db.Uuid`      | `UUID`                 | PK, NOT NULL                                                        | 조건 ID                    | UUID                       |
| `rule_id`     | `String @db.Uuid`          | `UUID`                 | NOT NULL, FK → `priority_rules.id` ON DELETE RESTRICT               | 소속 Rule                  | UUID                       |
| `fact_key`    | `String @db.VarChar(100)`  | `VARCHAR(100)`         | NOT NULL, FK → `fact_definitions.key` ON DELETE RESTRICT            | 평가할 fact                | `life.outdoor_activity`    |
| `operator`    | `ComparisonOperator`       | `"ComparisonOperator"` | NOT NULL                                                            | 연산자                     | `IN`                       |
| `value`       | `Json`                     | `JSONB`                | NOT NULL                                                            | 비교값                     | `["1_3h","over_3h"]`       |
| `state`       | `ConditionState`           | `"ConditionState"`     | NOT NULL                                                            | REQUIRED / EXCLUDED        | `REQUIRED`                 |
| `created_at`  | `DateTime @default(now())` | `TIMESTAMP(3)`         | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                               | 생성                       | 타임스탬프                 |

**인덱스**

- `priority_rule_conditions_pkey` (PK)
- `priority_rule_conditions_fact_key_idx`
- `priority_rule_conditions_rule_id_idx`

**설명**: Rule 발동 조건. REQUIRED는 모두 충족이 AND, EXCLUDED는 하나라도 맞으면 해당 Rule 탈락.

---

### 3.3 `decision_runs`

| 필드                        | Prisma 타입                | SQL 타입         | 제약                                                                        | 설명                                              | 예시                       |
| --------------------------- | -------------------------- | ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------- |
| `id`                        | `String @id @db.Uuid`      | `UUID`           | PK, NOT NULL                                                                | 실행 기록 ID                                      | UUID                       |
| `device_id`                 | `String @db.Uuid`          | `UUID`           | NOT NULL, FK → `devices.id` ON DELETE RESTRICT                              | 기기                                              | UUID                       |
| `user_id`                   | `String? @db.Uuid`         | `UUID`           | NULLABLE, FK → `users.id` ON DELETE SET NULL                                | 로그인 사용자                                     | UUID / null                |
| `session_id`                | `String @db.Uuid`          | `UUID`           | NOT NULL, FK → `user_sessions.id` ON DELETE RESTRICT                        | 세션                                              | UUID                       |
| `decision_type`             | `DecisionType`             | `"DecisionType"` | NOT NULL                                                                    | 종류 (PRIORITY_GATE / CATEGORY_DECISION / PRODUCT_MATRIX / REACTION_TRACEBACK) | `PRODUCT_MATRIX` |
| `source_screen`             | `String @db.VarChar(100)`  | `VARCHAR(100)`   | NOT NULL                                                                    | 발생 화면                                         | `product_matrix`           |
| `category_id`               | `String? @db.Uuid`         | `UUID`           | NULLABLE, FK → `product_categories.id` ON DELETE SET NULL                   | 관련 제품군                                       | UUID                       |
| `filter_state_id`           | `String? @db.Uuid`         | `UUID`           | NULLABLE, FK → `product_matrix_filter_states.id` ON DELETE SET NULL         | 사용된 필터 상태                                  | UUID / null                |
| `result_type`               | `String? @db.VarChar(50)`  | `VARCHAR(50)`    | NULLABLE                                                                    | 결과 타입 snapshot (Priority Gate면 `HOLD` 등)    | `HOLD`                     |
| `result_title`              | `String? @db.Text`         | `TEXT`           | NULLABLE                                                                    | 결과 제목 snapshot                                | 텍스트                     |
| `result_description`        | `String? @db.Text`         | `TEXT`           | NULLABLE                                                                    | 결과 설명 snapshot                                | 텍스트                     |
| `cta_label`                 | `String? @db.VarChar(100)` | `VARCHAR(100)`   | NULLABLE                                                                    | CTA 문구 snapshot                                 | `선크림 보러가기`          |
| `cta_target`                | `String? @db.VarChar(255)` | `VARCHAR(255)`   | NULLABLE                                                                    | CTA 경로 snapshot                                 | `/category/sunscreen`      |
| `input_snapshot`            | `Json`                     | `JSONB`          | NOT NULL                                                                    | 당시 user_facts 등 입력값 묶음                    | `{ "facts": {...} }`       |
| `applied_filters_snapshot`  | `Json`                     | `JSONB`          | NOT NULL                                                                    | 적용된 필터 + attribute 조건                      | `{ "filters": [...] }`     |
| `result_snapshot`           | `Json`                     | `JSONB`          | NOT NULL                                                                    | 조회된 제품/태그 등 최종 결과                     | `{ "products": [...] }`    |
| `created_at`                | `DateTime @default(now())` | `TIMESTAMP(3)`   | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                                       | 발생 시각                                         | 타임스탬프                 |

**인덱스**

- `decision_runs_pkey` (PK)
- `decision_runs_category_id_idx`
- `decision_runs_device_id_decision_type_created_at_idx` (`device_id, decision_type, created_at`) — 사용자 이력 화면
- `decision_runs_filter_state_id_idx`
- `decision_runs_session_id_idx`
- `decision_runs_user_id_decision_type_created_at_idx` (`user_id, decision_type, created_at`)

**설명**: Priority Gate / Category Decision / Product Matrix / Reaction Traceback이 사용자에게 실제로 보여준 결과 snapshot. 이력 조회·결과 복구·고객지원·분석에 사용.

**설계 이유**: 화면 재조회는 `decision_runs`가 아니라 `product_matrix_filter_states`를 기준으로 다시 `products` 쿼리한다(db_modeling.md:736). snapshot은 "당시 본 화면 복원"이 목적이고, 실시간 진열은 항상 최신 데이터 기준이어야 하기 때문. `result_snapshot` 등을 NOT NULL JSONB로 강제해 누락 방지.

---

## 4. 제품 DB

### 4.1 `brands`

| 필드          | Prisma 타입                | SQL 타입       | 제약                                  | 설명         | 예시           |
| ------------- | -------------------------- | -------------- | ------------------------------------- | ------------ | -------------- |
| `id`          | `String @id @db.Uuid`      | `UUID`         | PK, NOT NULL                          | 브랜드 ID    | UUID           |
| `name`        | `String @db.VarChar(200)`  | `VARCHAR(200)` | NOT NULL, UNIQUE                      | 브랜드명     | `라운드랩`     |
| `created_at`  | `DateTime @default(now())` | `TIMESTAMP(3)` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 생성         | 타임스탬프     |
| `updated_at`  | `DateTime @updatedAt`      | `TIMESTAMP(3)` | NOT NULL                              | 갱신         | 타임스탬프     |

**인덱스**

- `brands_pkey` (PK)
- `brands_name_key` (UNIQUE on `name`)

---

### 4.2 `product_categories`

| 필드           | Prisma 타입                | SQL 타입       | 제약                                  | 설명               | 예시         |
| -------------- | -------------------------- | -------------- | ------------------------------------- | ------------------ | ------------ |
| `id`           | `String @id @db.Uuid`      | `UUID`         | PK, NOT NULL                          | 제품군 ID          | UUID         |
| `key`          | `String @db.VarChar(100)`  | `VARCHAR(100)` | NOT NULL, UNIQUE                      | 영문 키            | `sunscreen`  |
| `name`         | `String @db.VarChar(100)`  | `VARCHAR(100)` | NOT NULL                              | 한글명             | `선크림`     |
| `description`  | `String? @db.Text`         | `TEXT`         | NULLABLE                              | 설명               | 텍스트       |
| `created_at`   | `DateTime @default(now())` | `TIMESTAMP(3)` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 생성               | 타임스탬프   |
| `updated_at`   | `DateTime @updatedAt`      | `TIMESTAMP(3)` | NOT NULL                              | 갱신               | 타임스탬프   |

**인덱스**

- `product_categories_pkey` (PK)
- `product_categories_key_key` (UNIQUE on `key`)

**설명**: 6개 카테고리(toner/sunscreen/serum/lipcare/moisturizer/cleanser) 등록. 코드 상수로 `key`를 참조한다.

---

### 4.3 `category_attribute_definitions`

| 필드             | Prisma 타입                | SQL 타입                | 제약                                                              | 설명                          | 예시                                  |
| ---------------- | -------------------------- | ----------------------- | ----------------------------------------------------------------- | ----------------------------- | ------------------------------------- |
| `id`             | `String @id @db.Uuid`      | `UUID`                  | PK, NOT NULL                                                      | 속성 정의 ID                  | UUID                                  |
| `category_id`    | `String @db.Uuid`          | `UUID`                  | NOT NULL, FK → `product_categories.id` ON DELETE RESTRICT         | 대상 제품군                   | UUID                                  |
| `key`            | `String @db.VarChar(100)`  | `VARCHAR(100)`          | NOT NULL, UNIQUE per (category_id, key)                           | attribute 키                  | `eye_sting`                           |
| `label`          | `String @db.VarChar(200)`  | `VARCHAR(200)`          | NOT NULL                                                          | 표시명                        | `눈시림 위험`                         |
| `value_type`     | `AttributeValueType`       | `"AttributeValueType"`  | NOT NULL                                                          | 값 형 (BOOLEAN/ENUM/NUMBER/MULTI_ENUM/STRING) | `ENUM`                  |
| `options`        | `Json?`                    | `JSONB`                 | NULLABLE                                                          | ENUM/MULTI_ENUM 옵션 배열     | `["none","low","medium","high"]`      |
| `is_required`    | `Boolean @default(false)`  | `BOOLEAN`               | NOT NULL, DEFAULT `false`                                         | 등록 시 필수 여부             | `true`                                |
| `is_filterable`  | `Boolean @default(false)`  | `BOOLEAN`               | NOT NULL, DEFAULT `false`                                         | Product Matrix 필터 후보 여부 | `true`                                |
| `sort_order`     | `Int @default(0)`          | `INTEGER`               | NOT NULL, DEFAULT `0`                                             | 노출 순서                     | `30`                                  |
| `created_at`     | `DateTime @default(now())` | `TIMESTAMP(3)`          | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                             | 생성                          | 타임스탬프                            |
| `updated_at`     | `DateTime @updatedAt`      | `TIMESTAMP(3)`          | NOT NULL                                                          | 갱신                          | 타임스탬프                            |

**인덱스**

- `category_attribute_definitions_pkey` (PK)
- `category_attribute_definitions_category_id_sort_order_idx` (`category_id, sort_order`) — admin UI 정렬
- `category_attribute_definitions_category_id_key_key` (UNIQUE on `category_id, key`) — 같은 카테고리 내 키 중복 금지

**설명**: `products.attributes` JSONB의 스키마-of-스키마. admin 등록 폼·필터 후보·라벨 정렬에 사용.

**설계 이유**: JSONB가 자유 구조라 DB 레벨에서 attribute key/type를 강제할 수 없어, 이 테이블이 메타데이터로 정의하고 Service에서 Zod 검증을 거친다. `is_filterable`은 코드에서 분기하지 않고 데이터로 노출 후보를 끄고 켤 수 있게 한다.

---

### 4.4 `products`

| 필드            | Prisma 타입                | SQL 타입         | 제약                                                                   | 설명                              | 예시                               |
| --------------- | -------------------------- | ---------------- | ---------------------------------------------------------------------- | --------------------------------- | ---------------------------------- |
| `id`            | `String @id @db.Uuid`      | `UUID`           | PK, NOT NULL                                                           | 제품 ID                           | UUID                               |
| `brand_id`      | `String @db.Uuid`          | `UUID`           | NOT NULL, FK → `brands.id` ON DELETE RESTRICT                          | 브랜드                            | UUID                               |
| `category_id`   | `String @db.Uuid`          | `UUID`           | NOT NULL, FK → `product_categories.id` ON DELETE RESTRICT              | 제품군                            | UUID                               |
| `name`          | `String @db.VarChar(300)`  | `VARCHAR(300)`   | NOT NULL                                                               | 제품명                            | `라운드랩 자작나무 선크림`         |
| `barcode`       | `String? @db.VarChar(100)` | `VARCHAR(100)`   | NULLABLE, UNIQUE                                                       | 바코드                            | `8809...`                          |
| `price`         | `Int`                      | `INTEGER`        | NOT NULL                                                               | 정가 (원)                         | `18000`                            |
| `price_band`    | `PriceBand`                | `"PriceBand"`    | NOT NULL                                                               | 가격대 (Tier List 그루핑용)       | `UNDER_20000`                      |
| `volume`        | `String? @db.VarChar(50)`  | `VARCHAR(50)`    | NULLABLE                                                               | 용량 표기                         | `50ml`                             |
| `image_url`     | `String? @db.Text`         | `TEXT`           | NULLABLE                                                               | S3 이미지 URL                     | `https://...`                      |
| `purchase_url`  | `String? @db.Text`         | `TEXT`           | NULLABLE                                                               | 구매 링크                         | `https://oliveyoung...`            |
| `attributes`    | `Json`                     | `JSONB`          | NOT NULL                                                               | 제품군별 속성값 (스키마는 `category_attribute_definitions` 참조) | `{"spf":50,"eye_sting":"low",...}` |
| `sort_order`    | `Int @default(0)`          | `INTEGER`        | NOT NULL, DEFAULT `0`                                                  | 큐레이션 노출 순서                | `100`                              |
| `is_active`     | `Boolean @default(true)`   | `BOOLEAN`        | NOT NULL, DEFAULT `true`                                               | 노출 여부                         | `true`                             |
| `created_at`    | `DateTime @default(now())` | `TIMESTAMP(3)`   | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                                  | 생성                              | 타임스탬프                         |
| `updated_at`    | `DateTime @updatedAt`      | `TIMESTAMP(3)`   | NOT NULL                                                               | 갱신                              | 타임스탬프                         |

**인덱스**

- `products_pkey` (PK)
- `products_barcode_key` (UNIQUE on `barcode`)
- `products_brand_id_idx`
- `products_category_id_is_active_sort_order_idx` (`category_id, is_active, sort_order`) — Product Matrix 카테고리 진열

**⚠ 불일치**: db_modeling.md `Product Matrix 조회 방식`(:666)은 `attributes->>'spf'` 같은 JSONB 동적 조회를 가정하지만, 현재 마이그레이션에 `products.attributes` GIN 인덱스가 없다. 카탈로그가 커지면 풀스캔이 된다 — 도입 시점에 다음 두 종류 중 선택:

```sql
-- 옵션 1: 전체 JSONB GIN (가장 범용, 인덱스 크다)
CREATE INDEX products_attributes_gin_idx ON products USING GIN (attributes);

-- 옵션 2: 자주 쓰는 attribute key 별 expression 인덱스 (가볍지만 키 고정)
CREATE INDEX products_attr_spf_idx ON products (((attributes->>'spf')::int));
CREATE INDEX products_attr_eye_sting_idx ON products ((attributes->>'eye_sting'));
```

**설계 이유**: `attributes` JSONB는 제품군마다 다른 속성을 한 테이블에서 다루기 위한 의도된 비정규화. 정규형 관점에서는 카테고리별 테이블로 쪼개야 하지만, MVP에서 6개 카테고리 × 평균 8개 attribute = 48개의 컬럼 분기를 만드는 비용이 더 크다.

---

## 5. Product Filter Mapping / Matrix

### 5.1 `product_filter_mappings`

| 필드                  | Prisma 타입                | SQL 타입               | 제약                                                                | 설명                                              | 예시                          |
| --------------------- | -------------------------- | ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------- |
| `id`                  | `String @id @db.Uuid`      | `UUID`                 | PK, NOT NULL                                                        | 매핑 ID                                           | UUID                          |
| `category_id`         | `String? @db.Uuid`         | `UUID`                 | NULLABLE, FK → `product_categories.id` ON DELETE SET NULL           | 대상 제품군 (NULL이면 전체 공통)                  | UUID / null                   |
| `source_fact_key`     | `String @db.VarChar(100)`  | `VARCHAR(100)`         | NOT NULL, FK → `fact_definitions.key` ON DELETE RESTRICT            | 사용자 답변 fact                                  | `context.eye_sting`           |
| `source_operator`     | `ComparisonOperator`       | `"ComparisonOperator"` | NOT NULL                                                            | 사용자 답변 조건 연산자                           | `EQ`                          |
| `source_value`        | `Json`                     | `JSONB`                | NOT NULL                                                            | 사용자 답변 비교값                                | `true`                        |
| `attribute_key`       | `String @db.VarChar(100)`  | `VARCHAR(100)`         | NOT NULL                                                            | 변환 대상 attribute key                           | `eye_sting`                   |
| `attribute_operator`  | `ComparisonOperator`       | `"ComparisonOperator"` | NOT NULL                                                            | attribute 조건 연산자                             | `IN`                          |
| `attribute_value`     | `Json`                     | `JSONB`                | NOT NULL                                                            | attribute 비교값                                  | `["none","low"]`              |
| `filter_mode`         | `FilterMode`               | `"FilterMode"`         | NOT NULL                                                            | HARD_FILTER / EXCLUDE / CAUTION / SORT / TAG      | `HARD_FILTER`                 |
| `filter_type`         | `FilterType`               | `"FilterType"`         | NOT NULL                                                            | BASIC_CONDITION / PERSONALIZED                    | `PERSONALIZED`                |
| `filter_key`          | `String @db.VarChar(100)`  | `VARCHAR(100)`         | NOT NULL                                                            | 필터 식별 키                                      | `eye_sting_low`               |
| `filter_label`        | `String @db.VarChar(100)`  | `VARCHAR(100)`         | NOT NULL                                                            | 필터 표시 이름                                    | `눈시림 낮음`                 |
| `tag_label`           | `String? @db.VarChar(100)` | `VARCHAR(100)`         | NULLABLE                                                            | 카드 태그 문구 (TAG/SORT 모드용)                  | `눈시림 낮음`                 |
| `caution_message`     | `String? @db.Text`         | `TEXT`                 | NULLABLE                                                            | △ 주의 안내 (CAUTION 모드용)                      | 텍스트                        |
| `sort_order`          | `Int @default(0)`          | `INTEGER`              | NOT NULL, DEFAULT `0`                                               | 필터 정렬                                         | `10`                          |
| `is_active`           | `Boolean @default(true)`   | `BOOLEAN`              | NOT NULL, DEFAULT `true`                                            | 활성 여부                                         | `true`                        |
| `created_at`          | `DateTime @default(now())` | `TIMESTAMP(3)`         | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                               | 생성                                              | 타임스탬프                    |
| `updated_at`          | `DateTime @updatedAt`      | `TIMESTAMP(3)`         | NOT NULL                                                            | 갱신                                              | 타임스탬프                    |

**인덱스**

- `product_filter_mappings_pkey` (PK)
- `product_filter_mappings_category_id_filter_type_sort_order_idx` (`category_id, filter_type, sort_order`) — 카테고리별 필터 후보 목록
- `product_filter_mappings_source_fact_key_idx`

**설명**: 사용자 답변(`user_facts.value`) → 제품 attribute 조건의 **번역 테이블**. 룰 엔진이 아니다.

**설계 이유**: `attribute_key`에 `category_attribute_definitions.key`의 FK를 걸지 않은 이유 — `category_attribute_definitions`는 `(category_id, key)` 복합 UNIQUE라 단일 FK로 표현 불가, `category_id`가 NULL인 공통 매핑도 허용해야 함. 따라서 admin UI에서 드롭다운으로 유효 키만 노출하는 식으로 무결성을 보장한다.

---

### 5.2 `product_matrix_filter_states`

| 필드           | Prisma 타입                       | SQL 타입                            | 제약                                                                | 설명                              | 예시                |
| -------------- | --------------------------------- | ----------------------------------- | ------------------------------------------------------------------- | --------------------------------- | ------------------- |
| `id`           | `String @id @db.Uuid`             | `UUID`                              | PK, NOT NULL                                                        | 상태 row ID                       | UUID                |
| `device_id`    | `String @db.Uuid`                 | `UUID`                              | NOT NULL, FK → `devices.id` ON DELETE RESTRICT                      | 기기                              | UUID                |
| `user_id`      | `String? @db.Uuid`                | `UUID`                              | NULLABLE, FK → `users.id` ON DELETE SET NULL                        | 로그인 사용자                     | UUID / null         |
| `session_id`   | `String @db.Uuid`                 | `UUID`                              | NOT NULL, FK → `user_sessions.id` ON DELETE RESTRICT                | 세션                              | UUID                |
| `category_id`  | `String @db.Uuid`                 | `UUID`                              | NOT NULL, FK → `product_categories.id` ON DELETE RESTRICT           | 제품군                            | UUID                |
| `source`       | `ProductMatrixFilterStateSource`  | `"ProductMatrixFilterStateSource"`  | NOT NULL                                                            | 생성 경로 (DIRECT/CATEGORY_DECISION_CTA/MANUAL/RESTORED) | `CATEGORY_DECISION_CTA` |
| `filters`      | `Json`                            | `JSONB`                             | NOT NULL                                                            | 현재 활성 필터 배열               | (아래)              |
| `is_active`    | `Boolean @default(true)`          | `BOOLEAN`                           | NOT NULL, DEFAULT `true`                                            | 활성 여부                         | `true`              |
| `created_at`   | `DateTime @default(now())`        | `TIMESTAMP(3)`                      | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                               | 생성                              | 타임스탬프          |
| `updated_at`   | `DateTime @updatedAt`             | `TIMESTAMP(3)`                      | NOT NULL                                                            | 갱신                              | 타임스탬프          |

`filters` JSONB 예시:

```json
[
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
```

**인덱스**

- `product_matrix_filter_states_pkey` (PK)
- `product_matrix_filter_states_category_id_is_active_updated__idx` (`category_id, is_active, updated_at`)
- `product_matrix_filter_states_device_id_category_id_is_activ_idx` (`device_id, category_id, is_active, updated_at`) — 비로그인 최신 활성 state 조회
- `product_matrix_filter_states_session_id_idx`
- `product_matrix_filter_states_user_id_category_id_is_active__idx` (`user_id, category_id, is_active, updated_at`) — 로그인 최신 활성 state 조회

**설명**: 사용자가 Product Matrix에서 선택한 필터 상태. 화면 재진입 시 이 row를 기준으로 `products`를 다시 조회한다(snapshot 사용 안 함).

---

## 6. 성분 / Traceback

### 6.1 `ingredients`

| 필드          | Prisma 타입                | SQL 타입       | 제약                                  | 설명         | 예시          |
| ------------- | -------------------------- | -------------- | ------------------------------------- | ------------ | ------------- |
| `id`          | `String @id @db.Uuid`      | `UUID`         | PK, NOT NULL                          | 성분 ID      | UUID          |
| `name_ko`     | `String @db.VarChar(200)`  | `VARCHAR(200)` | NOT NULL                              | 한글명       | `리날룰`      |
| `name_en`     | `String @db.VarChar(200)`  | `VARCHAR(200)` | NOT NULL                              | 영문명       | `Linalool`    |
| `inci_name`   | `String? @db.VarChar(300)` | `VARCHAR(300)` | NULLABLE, UNIQUE                      | INCI 표준명  | `Linalool`    |
| `created_at`  | `DateTime @default(now())` | `TIMESTAMP(3)` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 생성         | 타임스탬프    |
| `updated_at`  | `DateTime @updatedAt`      | `TIMESTAMP(3)` | NOT NULL                              | 갱신         | 타임스탬프    |

**인덱스**

- `ingredients_pkey` (PK)
- `ingredients_inci_name_key` (UNIQUE on `inci_name`)

**설명**: INCI를 1차 식별자로 사용. 동일 INCI는 단일 row.

---

### 6.2 `product_ingredients`

| 필드              | Prisma 타입                | SQL 타입       | 제약                                                            | 설명                          | 예시                        |
| ----------------- | -------------------------- | -------------- | --------------------------------------------------------------- | ----------------------------- | --------------------------- |
| `id`              | `String @id @db.Uuid`      | `UUID`         | PK, NOT NULL                                                    | row ID                        | UUID                        |
| `product_id`      | `String @db.Uuid`          | `UUID`         | NOT NULL, FK → `products.id` ON DELETE RESTRICT                 | 제품                          | UUID                        |
| `ingredient_id`   | `String @db.Uuid`          | `UUID`         | NOT NULL, FK → `ingredients.id` ON DELETE RESTRICT              | 성분                          | UUID                        |
| `order_index`     | `Int`                      | `INTEGER`      | NOT NULL                                                        | 전성분표 순서 (1부터)         | `3`                         |
| `raw_text`        | `String? @db.Text`         | `TEXT`         | NULLABLE                                                        | 원문 텍스트 (파싱 누락 대비)  | `리날룰(Linalool)`          |
| `created_at`      | `DateTime @default(now())` | `TIMESTAMP(3)` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                           | 생성                          | 타임스탬프                  |

**인덱스**

- `product_ingredients_pkey` (PK)
- `product_ingredients_ingredient_id_idx`
- `product_ingredients_product_id_idx`
- `product_ingredients_product_id_ingredient_id_key` (UNIQUE on `product_id, ingredient_id`) — 같은 제품에 같은 성분 중복 방지

**설명**: 제품 ↔ 성분 M:N 브리지. `order_index`로 전성분표 위치 보존.

---

### 6.3 `ingredient_groups`

| 필드          | Prisma 타입                | SQL 타입       | 제약                                  | 설명                | 예시            |
| ------------- | -------------------------- | -------------- | ------------------------------------- | ------------------- | --------------- |
| `id`          | `String @id @db.Uuid`      | `UUID`         | PK, NOT NULL                          | 성분군 ID           | UUID            |
| `key`         | `String @db.VarChar(100)`  | `VARCHAR(100)` | NOT NULL, UNIQUE                      | 키                  | `fragrance`     |
| `name`        | `String @db.VarChar(200)`  | `VARCHAR(200)` | NOT NULL                              | 표시명              | `향료 계열`     |
| `description` | `String? @db.Text`         | `TEXT`         | NULLABLE                              | 설명                | 텍스트          |
| `created_at`  | `DateTime @default(now())` | `TIMESTAMP(3)` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 생성                | 타임스탬프      |
| `updated_at`  | `DateTime @updatedAt`      | `TIMESTAMP(3)` | NOT NULL                              | 갱신                | 타임스탬프      |

**인덱스**

- `ingredient_groups_pkey` (PK)
- `ingredient_groups_key_key` (UNIQUE on `key`)

**설명**: 의심 성분과 회피 규칙의 카테고리 단위. 개별 성분이 아니라 그룹으로 일반화해야 사용자가 이해/적용 가능.

---

### 6.4 `ingredient_group_members`

| 필드                  | Prisma 타입            | SQL 타입 | 제약                                                            | 설명                                  | 예시  |
| --------------------- | ---------------------- | -------- | --------------------------------------------------------------- | ------------------------------------- | ----- |
| `id`                  | `String @id @db.Uuid`  | `UUID`   | PK, NOT NULL                                                    | row ID                                | UUID  |
| `ingredient_id`       | `String @db.Uuid`      | `UUID`   | NOT NULL, FK → `ingredients.id` ON DELETE RESTRICT              | 성분                                  | UUID  |
| `ingredient_group_id` | `String @db.Uuid`      | `UUID`   | NOT NULL, FK → `ingredient_groups.id` ON DELETE RESTRICT        | 성분군                                | UUID  |

**인덱스**

- `ingredient_group_members_pkey` (PK)
- `ingredient_group_members_ingredient_group_id_idx`
- `ingredient_group_members_ingredient_id_ingredient_group_id_key` (UNIQUE on `ingredient_id, ingredient_group_id`)

**설명**: 성분 ↔ 성분군 M:N 브리지. 하나의 성분이 여러 그룹에 동시 소속 가능(linalool ∈ fragrance, essential_oil).

> created_at/updated_at 컬럼 없음 — 단순 브리지 테이블이라 시간 추적 불필요.

---

### 6.5 `reaction_reports`

| 필드             | Prisma 타입                | SQL 타입       | 제약                                                                | 설명                                | 예시                            |
| ---------------- | -------------------------- | -------------- | ------------------------------------------------------------------- | ----------------------------------- | ------------------------------- |
| `id`             | `String @id @db.Uuid`      | `UUID`         | PK, NOT NULL                                                        | 리포트 ID                           | UUID                            |
| `device_id`      | `String @db.Uuid`          | `UUID`         | NOT NULL, FK → `devices.id` ON DELETE RESTRICT                      | 기기                                | UUID                            |
| `user_id`        | `String? @db.Uuid`         | `UUID`         | NULLABLE, FK → `users.id` ON DELETE SET NULL                        | 로그인 사용자                       | UUID / null                     |
| `session_id`     | `String @db.Uuid`          | `UUID`         | NOT NULL, FK → `user_sessions.id` ON DELETE RESTRICT                | 세션                                | UUID                            |
| `symptoms`       | `Json`                     | `JSONB`        | NOT NULL                                                            | 증상 배열 (`["redness","burning"]`) | `["redness","burning"]`         |
| `affected_areas` | `Json`                     | `JSONB`        | NOT NULL                                                            | 부위 배열                           | `["cheeks","forehead"]`         |
| `onset_timing`   | `String? @db.VarChar(100)` | `VARCHAR(100)` | NULLABLE                                                            | 발현 시점 (`immediate`, `next_day`) | `next_day`                      |
| `memo`           | `String? @db.Text`         | `TEXT`         | NULLABLE                                                            | 자유 메모                           | 텍스트                          |
| `created_at`     | `DateTime @default(now())` | `TIMESTAMP(3)` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                               | 생성                                | 타임스탬프                      |
| `updated_at`     | `DateTime @updatedAt`      | `TIMESTAMP(3)` | NOT NULL                                                            | 갱신                                | 타임스탬프                      |

**인덱스**

- `reaction_reports_pkey` (PK)
- `reaction_reports_device_id_created_at_idx` (`device_id, created_at`)
- `reaction_reports_session_id_idx`
- `reaction_reports_user_id_created_at_idx` (`user_id, created_at`)

---

### 6.6 `reaction_report_products`

| 필드            | Prisma 타입                | SQL 타입                      | 제약                                                                | 설명                                  | 예시          |
| --------------- | -------------------------- | ----------------------------- | ------------------------------------------------------------------- | ------------------------------------- | ------------- |
| `id`            | `String @id @db.Uuid`      | `UUID`                        | PK, NOT NULL                                                        | row ID                                | UUID          |
| `report_id`     | `String @db.Uuid`          | `UUID`                        | NOT NULL, FK → `reaction_reports.id` ON DELETE RESTRICT             | 소속 리포트                           | UUID          |
| `product_id`    | `String @db.Uuid`          | `UUID`                        | NOT NULL, FK → `products.id` ON DELETE RESTRICT                     | 제품                                  | UUID          |
| `type`          | `ReactionReportProductType`| `"ReactionReportProductType"` | NOT NULL                                                            | `PROBLEM` / `OK`                      | `PROBLEM`     |
| `used_period`   | `String? @db.VarChar(100)` | `VARCHAR(100)`                | NULLABLE                                                            | 사용 기간 (`under_1_week` 등)         | `1_to_4_weeks`|
| `used_count`    | `Int?`                     | `INTEGER`                     | NULLABLE                                                            | 사용 횟수                             | `5`           |
| `created_at`    | `DateTime @default(now())` | `TIMESTAMP(3)`                | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                               | 생성                                  | 타임스탬프    |

**인덱스**

- `reaction_report_products_pkey` (PK)
- `reaction_report_products_product_id_idx`
- `reaction_report_products_report_id_idx`

**설명**: 한 리포트에 PROBLEM/OK 제품이 양쪽으로 매달리는 M:N + 역할 라벨 브리지.

---

### 6.7 `suspected_causes`

| 필드                  | Prisma 타입                | SQL 타입            | 제약                                                                | 설명                                | 예시        |
| --------------------- | -------------------------- | ------------------- | ------------------------------------------------------------------- | ----------------------------------- | ----------- |
| `id`                  | `String @id @db.Uuid`      | `UUID`              | PK, NOT NULL                                                        | row ID                              | UUID        |
| `report_id`           | `String @db.Uuid`          | `UUID`              | NOT NULL, FK → `reaction_reports.id` ON DELETE RESTRICT             | 소속 리포트                         | UUID        |
| `ingredient_group_id` | `String @db.Uuid`          | `UUID`              | NOT NULL, FK → `ingredient_groups.id` ON DELETE RESTRICT            | 의심 성분군                         | UUID        |
| `confidence`          | `ConfidenceLevel`          | `"ConfidenceLevel"` | NOT NULL                                                            | LOW / MEDIUM / HIGH                 | `HIGH`      |
| `reason`              | `String? @db.Text`         | `TEXT`              | NULLABLE                                                            | 추정 근거 텍스트                    | 텍스트      |
| `created_at`          | `DateTime @default(now())` | `TIMESTAMP(3)`      | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                               | 생성                                | 타임스탬프  |

**인덱스**

- `suspected_causes_pkey` (PK)
- `suspected_causes_ingredient_group_id_idx`
- `suspected_causes_report_id_idx`

**설명**: 리포트별 분석 출력. 휘발성(분석 알고리즘이 바뀌면 재계산 가능)이며 리포트 라이프사이클을 따라간다.

---

### 6.8 `avoidance_rules`

| 필드                  | Prisma 타입                | SQL 타입            | 제약                                                                | 설명                                       | 예시            |
| --------------------- | -------------------------- | ------------------- | ------------------------------------------------------------------- | ------------------------------------------ | --------------- |
| `id`                  | `String @id @db.Uuid`      | `UUID`              | PK, NOT NULL                                                        | row ID                                     | UUID            |
| `device_id`           | `String @db.Uuid`          | `UUID`              | NOT NULL, FK → `devices.id` ON DELETE RESTRICT                      | 기기                                       | UUID            |
| `user_id`             | `String? @db.Uuid`         | `UUID`              | NULLABLE, FK → `users.id` ON DELETE SET NULL                        | 로그인 사용자                              | UUID / null     |
| `ingredient_group_id` | `String @db.Uuid`          | `UUID`              | NOT NULL, FK → `ingredient_groups.id` ON DELETE RESTRICT            | 회피 대상 성분군                           | UUID            |
| `action`              | `AvoidanceAction`          | `"AvoidanceAction"` | NOT NULL                                                            | `AVOID`(제외) / `CAUTION`(△ 태그)          | `AVOID`         |
| `reason`              | `String? @db.Text`         | `TEXT`              | NULLABLE                                                            | 메모                                       | 텍스트          |
| `is_active`           | `Boolean @default(true)`   | `BOOLEAN`           | NOT NULL, DEFAULT `true`                                            | 활성 여부 (사용자가 비활성화 가능)         | `true`          |
| `created_at`          | `DateTime @default(now())` | `TIMESTAMP(3)`      | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                               | 생성                                       | 타임스탬프      |
| `updated_at`          | `DateTime @updatedAt`      | `TIMESTAMP(3)`      | NOT NULL                                                            | 갱신                                       | 타임스탬프      |

**인덱스**

- `avoidance_rules_pkey` (PK)
- `avoidance_rules_device_id_is_active_updated_at_idx` (`device_id, is_active, updated_at`)
- `avoidance_rules_ingredient_group_id_idx`
- `avoidance_rules_user_id_is_active_updated_at_idx` (`user_id, is_active, updated_at`)

**설명**: 사용자별 영속 회피 규칙. Product Matrix 조회 시 적용.

**설계 이유**: `report_id` FK가 없다. ① 사용자가 직접 회피 규칙을 추가할 수도 있고(리포트 없이), ② 같은 사용자가 시간차로 여러 리포트에서 동일 성분군을 의심해도 회피 규칙은 단일 row여야 하며, ③ 리포트 삭제가 회피 규칙에 영향을 주면 안 되기 때문. `suspected_causes`와는 `ingredient_group_id`라는 공통 키로 join할 수 있는 느슨한 연결만 유지한다.

---

## 부록 A. FK ON DELETE 정책 한눈에 보기

| 패턴                                  | ON DELETE     | 적용 예                                                                                                |
| ------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| 영속 마스터 → 사용자 활동             | `RESTRICT`    | `devices.id` ← user_sessions, user_facts, decision_runs, reaction_reports, product_matrix_filter_states, avoidance_rules |
| 영속 마스터 → 사용자 활동 (user 측)   | `SET NULL`    | `users.id` ← devices, user_sessions, user_facts, decision_runs, reaction_reports, product_matrix_filter_states, avoidance_rules |
| 카탈로그 → 카탈로그                   | `RESTRICT`    | `fact_definitions.key` ← context_questions / conditions / mappings / user_facts                       |
| 옵션 참조                             | `SET NULL`    | `priority_rules.recommend_category_id` → product_categories, `decision_runs.category_id` / `.filter_state_id`, `product_filter_mappings.category_id` |
| 모든 UPDATE                           | `CASCADE`     | 전 테이블 (Prisma 기본값)                                                                              |

---

## 부록 B. 자료형·인덱스 결정 시 다음에 확인할 것

- [ ] `TIMESTAMP(3)` → `TIMESTAMPTZ` 변환이 필요한지 (글로벌 사용자, 서버 타임존 정책)
- [ ] `products.attributes` GIN/Expression 인덱스 추가 시점 (catalog 규모 임계치)
- [ ] `user_sessions.segment` 컬럼 도입 여부 결정 (db_modeling.md 동기화)
- [ ] `priority_rules.hold_categories`, `decision_runs.*_snapshot`, `product_matrix_filter_states.filters` 등 JSONB 컬럼의 Zod 스키마 정의 위치
- [ ] `barcode` UNIQUE에 PARTIAL INDEX 적용 검토 (NULL이 많은 컬럼)
- [ ] Soft delete 정책 (`is_active` 외에 `deleted_at` 도입 여부)
