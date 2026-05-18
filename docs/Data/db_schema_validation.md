> prisma.schema 가 PostgreSQL Table 로 변경되는 과정에서 문제가 없는지 확인하기 위한 문서.  
> 본 문서는 **타겟 스키마 명세**(=확정된 목표) 를 1차 진실로 둔다. 현재 `schema.prisma` / `migration.sql` 이 타겟과 다른 항목은 [§0.3](#03-검출된-docs-↔-실제-스키마-불일치-요약) 에 ⚠ 표시로 모아두며, 후속 마이그레이션에서 정리된다.

# DB 스키마 자료형·인덱스 검증

> **참조 파일**
>
> - [backend/prisma/schema.prisma](../backend/prisma/schema.prisma) — 현재 구현
> - [backend/prisma/migrations/20260508175123_init/migration.sql](../backend/prisma/migrations/20260508175123_init/migration.sql) — 1차 init 마이그레이션
>
> **교차 검증 대상**: [docs/Data/db_modeling.md](db_modeling.md) (특히 [§0 공통 규약](db_modeling.md#0-공통-규약-identity--timestamp--naming))
>
> 본 문서의 표는 **타겟(=확정 명세)** 을 기준으로 작성되어 있다. 현재 schema.prisma 와 다른 항목은 §0.3 에 정리한다.

---

## 0. 사전 정보

### 0.0 식별자·시각·명명 공통 규약

본 절은 [db_modeling.md §0](db_modeling.md#0-공통-규약-identity--timestamp--naming) 과 1:1 동기. 자료형·제약 표기 시 다음 규약을 따른다.

- **UUID 는 모두 UUIDv7** (시간 정렬 가능, BTREE 인덱스 친화). Prisma 의 `@default(uuid())` 는 v4 이므로 **application 레이어(예: `uuid` 패키지의 `v7()`) 에서 생성**해 INSERT 한다. ※ Prisma 6.x 의 `@default(uuid(7))` 가 정식 지원되면 그쪽으로 이전.
- **모든 시각 컬럼은 `TIMESTAMPTZ`** (UTC 저장). Prisma 에서는 `DateTime @db.Timestamptz()` 로 명시.
- **`updated_at` 은 NULLABLE**. INSERT 시점에는 NULL, 첫 UPDATE 부터 application/Prisma 가 값 주입. → Prisma 표기는 `DateTime? @updatedAt @db.Timestamptz() @map("updated_at")`.
- **`deleted_at` (소프트 삭제) 는 NULLABLE TIMESTAMPTZ**. 평소 NULL, 삭제 시 `now()` 채움 + 모든 조회에 `WHERE deleted_at IS NULL` 기본 필터.
- **명명 규칙**:

  | 대상          | 규칙                           | 예시                                          |
  | ------------- | ------------------------------ | --------------------------------------------- |
  | 테이블        | `snake_case` + 복수형          | `users`, `user_sessions`                      |
  | 컬럼          | `snake_case`                   | `created_at`, `user_id`                       |
  | PK 컬럼       | `id`                           | `id`                                          |
  | FK 컬럼       | `<참조 테이블 단수>_id`        | `user_id`, `category_id`                      |
  | Boolean       | `is_` / `has_` / `can_` prefix | `is_active`, `has_children`                   |
  | PK 제약       | `pk_<table>`                   | `pk_users`                                    |
  | UNIQUE 인덱스 | `uq_<table>_<columns>`         | `uq_users_email`                              |
  | 일반 인덱스   | `idx_<table>_<columns>`        | `idx_question_variants_question_id`           |
  | FK 제약       | `fk_<table>_<column>`          | `fk_user_responses_question_id`               |
  | CHECK 제약    | `chk_<table>_<meaning>`        | `chk_products_price_positive`                 |
  | Enum 타입     | `<table>_<column>_enum`        | `users_role_enum`, `questions_answer_type_enum` |

  > Prisma 측면에서는 인덱스/제약명을 `@@index([...], map: "idx_…")` / `@@unique([...], map: "uq_…")` / `@@id(map: "pk_…")` / `@relation(... , map: "fk_…")` 로 명시해야 PostgreSQL 측에 동일 이름이 적힌다.

  > **공용 enum 예외**: 동일 의미의 enum이 여러 컬럼에서 재사용될 때(비교 연산자, 조건 상태)는 의미 단위 단일 enum 으로 둔다. 본 문서에서는 `comparison_operator_enum`, `condition_state_enum` 2건만 예외로 인정.

### 0.1 Prisma → PostgreSQL 자료형 매핑

| Prisma                                                        | PostgreSQL                                        | 비고                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| `String @id @db.Uuid` (app에서 v7 생성)                       | `UUID` (PK)                                       | UUIDv7 을 application 에서 발급. DB default 없음                        |
| `String @db.VarChar(N)`                                       | `VARCHAR(N)`                                      | 길이 제한                                                               |
| `String @db.Text`                                             | `TEXT`                                            | 길이 무제한                                                             |
| `Int`                                                         | `INTEGER`                                         | 32-bit                                                                  |
| `Boolean`                                                     | `BOOLEAN`                                         |                                                                         |
| `Json`                                                        | `JSONB`                                           | 인덱싱 가능, 단 GIN 인덱스는 별도 추가 필요                             |
| `DateTime @default(now()) @db.Timestamptz()`                  | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`  | UTC 저장. **밀리초 표기 필요 시 `@db.Timestamptz(3)`** 으로 정밀도 지정 |
| `DateTime? @updatedAt @db.Timestamptz()`                      | `TIMESTAMPTZ` (NULLABLE)                          | INSERT 시 NULL → 첫 UPDATE 부터 Prisma 가 채움                          |
| `DateTime? @db.Timestamptz()` (`deleted_at`)                  | `TIMESTAMPTZ` (NULLABLE)                          | 소프트 삭제용. 평소 NULL                                                |
| `enum X { A B }` (스키마 enum 이름 = `<table>_<column>_enum`) | `CREATE TYPE "<table>_<column>_enum" AS ENUM (…)` | enum 타입 이름을 명명 규칙 그대로 사용                                  |
| `String? ...`                                                 | 동일 타입 (NULL 허용)                             | 모든 nullable은 `NOT NULL`을 떼고 생성됨                                |

### 0.2 enum 정의

> 명명 규칙: `<table>_<column>_enum`. 공용 enum 2건(`comparison_operator_enum`, `condition_state_enum`)만 의미 단위 단일 타입으로 유지한다.  
> 현 schema.prisma 의 PascalCase enum 이름(`UserRole`, `SessionStatus` 등)은 ⚠ — [§0.3 #5](#03-검출된-docs-↔-실제-스키마-불일치-요약) 참조.

| enum 타입                                        | 값                                                                                       | 사용 컬럼                                                                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users_role_enum`                                | `USER`, `ADMIN`                                                                          | `users.role`                                                                                                                                      |
| ~~`user_sessions_status_enum`~~ ※폐기 예정       | `ACTIVE`, `COMPLETED`, `EXPIRED`                                                         | (없음 — user_sessions 가 dimension 테이블로 재구조되며 `status` 컬럼 제거. [§1.3](#13-user_sessions) 참조)                                        |
| `questions_answer_type_enum`                      | `BOOLEAN`, `THREE_CHOICE`, `FOUR_CHOICE`, `FIVE_CHOICE`, `SINGLE_CHOICE`, `MULTI_CHOICE` | `questions.answer_type`                                                                                                                            |
| `category_attribute_definitions_value_type_enum` | `BOOLEAN`, `ENUM`, `NUMBER`, `MULTI_ENUM`, `STRING`                                      | `category_attribute_definitions.value_type`                                                                                                       |
| `question_variants_screen_enum`                  | `priority_gate`, `context`                                                               | `question_variants.screen`                                                                                                                        |
| `question_variants_ui_section_enum`              | `life_routine`, `owned_products`, `basic`, `category`                                    | `question_variants.ui_section`                                                                                                                    |
| `comparison_operator_enum` ※공용                 | `EQ`, `IN`, `CONTAINS`, `GTE`, `LTE`, `NEQ`                                              | `question_visibility_conditions.operator`, `priority_rule_conditions.operator`, `product_filter_mappings.trigger_operator` / `.attribute_operator` |
| `condition_state_enum` ※공용                     | `REQUIRED`, `EXCLUDED`                                                                   | `question_visibility_conditions.state`, `priority_rule_conditions.state`                                                                          |
| `user_responses_source_enum`                     | `priority_gate`, `context`, `concern`, `traceback`                                       | `user_responses.source`                                                                                                                           |
| `priority_rules_result_type_enum`                | `STOP`, `HOLD`, `CAUTION`, `PASS`, `ROUTE_CATEGORY`                                      | `priority_rules.result_type`                                                                                                                      |
| ~~`decision_runs_decision_type_enum`~~ ※폐기     | `PRIORITY_GATE`, `CATEGORY_DECISION`, `PRODUCT_MATRIX`, `REACTION_TRACEBACK`             | (없음 — `decision_runs.decision_type` 은 `VARCHAR(50)` + application enum 으로 검증)                                                              |
| ~~`products_price_band_enum`~~ ※폐기             | `UNDER_20000`, `BETWEEN_20000_50000`, `OVER_50000`                                       | (없음 — 카테고리마다 임계치가 달라 service/UI 계산값으로 이동)                                                                                    |
| `products_volume_unit_enum`                      | `ML`, `G`, `L`, `MG`                                                                     | `products.volume_unit`                                                                                                                            |
| `products_count_unit_enum`                       | `SHEET`, `PIECE`, `PACK`                                                                 | `products.count_unit`                                                                                                                             |
| ~~`product_filter_mappings_filter_mode_enum`~~ ※폐기 | `HARD_FILTER`, `EXCLUDE`, `CAUTION`, `SORT`, `TAG`                                   | (없음 — MVP 는 HARD_FILTER 단일 처리. 운영 정책 변경 시 application enum)                                                                         |
| ~~`product_filter_mappings_filter_type_enum`~~ ※폐기 | `BASIC_CONDITION`, `PERSONALIZED`                                                    | (없음 — `product_filter_mappings.curated` boolean 으로 대체)                                                                                      |
| `question_filter_mappings_source_enum`           | `DIRECT`, `CATEGORY_DECISION_CTA`, `MANUAL`, `RESTORED`                                  | `question_filter_mappings.source`                                                                                                                 |
| `reaction_report_products_type_enum`             | `PROBLEM`, `OK`                                                                          | `reaction_report_products.type`                                                                                                                   |
| `suspected_causes_confidence_enum`               | `LOW`, `MEDIUM`, `HIGH`                                                                  | `suspected_causes.confidence`                                                                                                                     |
| `avoidance_rules_action_enum`                    | `AVOID`, `CAUTION`                                                                       | `avoidance_rules.action`                                                                                                                          |

### 0.3 검출된 docs ↔ 실제 스키마 불일치 (요약)

> 본 문서는 타겟을 기준으로 작성됐다. 아래는 **현재 schema.prisma / migration.sql 이 타겟에 맞춰 변경되어야 하는 항목**이다. 후속 마이그레이션 PR 에서 정리.

| #   | 위치                                  | 타겟 (본 문서)                                                                                                                      | 현재 schema.prisma / migration                                     | 마이그레이션 액션                                                                                                                                                         |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 모든 시각 컬럼                        | `TIMESTAMPTZ` (UTC)                                                                                                                 | `TIMESTAMP(3)` (타임존 없음)                                       | `@db.Timestamptz()` 명시 + `ALTER TYPE` 마이그레이션                                                                                                                      |
| 2   | `updated_at` NULL 정책                | INSERT 시 NULL, NULLABLE 컬럼                                                                                                       | `NOT NULL` (`@updatedAt`)                                          | `DateTime?` + NULLABLE 컬럼 변경                                                                                                                                          |
| 3   | `deleted_at` 컬럼                     | lifecycle 테이블 전부에 추가 (NULLABLE TIMESTAMPTZ)                                                                                 | 없음                                                               | 마이그레이션 + 모든 조회에 `WHERE deleted_at IS NULL` 적용                                                                                                                |
| 4   | UUID 발급                             | UUIDv7 (application 측에서 발급)                                                                                                    | `@default(uuid())` = v4                                            | UUIDv7 생성 헬퍼 도입 + `@default(uuid())` 제거                                                                                                                           |
| 5   | enum 타입 이름                        | `<table>_<column>_enum` (공용 2건 제외)                                                                                             | PascalCase (`UserRole`, `SessionStatus` …)                         | enum 이름 일괄 리네임 (Prisma `enum ... @@map(...)` 미지원 → 마이그레이션 SQL 로 `ALTER TYPE ... RENAME TO`)                                                              |
| 6   | PK/FK/UQ/idx 이름                     | `pk_<t>`, `fk_<t>_<c>`, `uq_<t>_<cs>`, `idx_<t>_<cs>`                                                                               | 자동 생성(`users_pkey`, `users_email_key`, `question_variants_question_id_idx`) | `@@id(map:)`, `@relation(map:)`, `@@unique(..., map:)`, `@@index(..., map:)` 로 명시 + 마이그레이션 SQL `ALTER ... RENAME`                                                |
| 7   | `user_sessions.segment`               | `ENUM('A','B','C','D') NULL`                                                                                                        | **컬럼 없음**                                                      | 세그먼트 측정 도입 시점에 추가 결정                                                                                                                                       |
| 8   | `products.attributes` JSONB 조회      | "동적 SQL로 `attributes->>` 조회"                                                                                                   | GIN 인덱스 없음                                                    | catalog 규모 도달 시 GIN/Expression 인덱스 추가                                                                                                                           |
| 9   | `priority_rules.hold_categories` 구조 | "보류 제품군 (JSONB)" 만 명시                                                                                                       | JSONB는 맞으나 스키마 미정의                                       | Service Zod 스키마 정의                                                                                                                                                   |
| 10  | `user_sessions` 컬럼 구조             | dimension/transaction 테이블 (logged_in_at 추가, status/started_at/last_seen_at/completed_at/expires_at/updated_at/ab_variant 제거) | session 관리용 컬럼 그대로 보유                                    | 컬럼 DROP + `logged_in_at TIMESTAMPTZ NULL` 추가 + `user_sessions_status_enum` DROP TYPE. 로그인 병합 트랜잭션에 `logged_in_at = now()` 추가. ([§1.3](#13-user_sessions)) |
| 11  | 질문 기준 테이블                      | `questions` + `question_variants`, `answer_values`/`answers` 배열 길이 FK 검증                                                       | `fact_definitions` + `context_questions`, 양쪽에 options 중복 보유 | 테이블 rename/재구성 + 생성 컬럼 `answer_count` + 복합 FK 추가                                                                                                            |
| 12  | `question_visibility_conditions` 구조 | `question_variant_id` 단일 FK (canonical question 참조 제거), `value INTEGER`, `updated_at` 추가, `idx_..._condition_question_id` 제거 | 구 `question_id` (variant) + `condition_question_id` (canonical) 2-FK, `value JSONB` | 컬럼 DROP/rename + 생성 컬럼 정리 + service 측 평가기 재설계                                                                                                              |
| 13  | `user_responses` 구조                 | `value INTEGER[]`, `session_id` 컬럼 제거, `idx_..._session_id`/`question_id`/`question_variant_id` 보조 인덱스 제거                  | `value JSONB` + `session_id` NOT NULL FK + 3종 보조 인덱스          | 컬럼 DROP/타입 변경, 보조 인덱스 DROP. 세션 추적은 `session_events` 이벤트로 이동                                                                                         |
| 14  | `priority_rules`                      | `hold_categories` 객체 배열 (`[{category_id, reason}]`), 보조 인덱스(priority/is_active, recommend_category_id) 제거                  | JSONB 구조 미정의, 보조 인덱스 2종 존재                             | JSONB 구조 Zod, 인덱스 DROP                                                                                                                                              |
| 15  | `priority_rule_conditions`            | `value INTEGER[]`, `updated_at` 추가                                                                                                  | `value JSONB`, `updated_at` 없음                                    | 컬럼 타입 변경, `updated_at` 추가                                                                                                                                         |
| 16  | `decision_runs.decision_type`         | `VARCHAR(50)` (application enum 검증)                                                                                                 | `decision_runs_decision_type_enum`                                  | 컬럼 타입 변경 + `DROP TYPE decision_runs_decision_type_enum`                                                                                                            |
| 17  | `products` 구조                       | `name VARCHAR(500)`, `price_krw`, `volume_amount/unit/count_amount/unit/label`. `barcode`/`price_band` 제거                            | `name VARCHAR(300)`, `price`, `barcode UNIQUE`, `price_band`, `volume VARCHAR(50)` | 컬럼 rename/DROP/ADD + `uq_products_barcode` DROP + `products_price_band_enum` DROP TYPE. `products_volume_unit_enum`/`products_count_unit_enum` 추가                  |
| 18  | `product_filter_mappings` 구조        | trigger_/`attribute_definition_id` 기반, `curated` boolean, `filter_mode`/`filter_key`/`tag_label`/`caution_message`/`category_id`/`attribute_key` 제거 | source_/`attribute_key`/`category_id`/`filter_mode`/`filter_type`/etc. | 컬럼 일괄 rename/DROP/ADD + filter_mode/filter_type enum DROP TYPE + 인덱스 재구성                                                                                       |
| 19  | `product_matrix_filter_states`        | `question_filter_mappings` 로 rename, `is_active` 제거, filters JSON shape `[{filter_definition_id, operator, value}]`, 보조 인덱스 4종 → 2종 | 구 이름 + `is_active` + filter_key/source_type 기반 JSON                | 테이블 rename + 컬럼 DROP + 인덱스 재구성 + filters JSON shape 마이그레이션                                                                                              |

각 표 본문에서 동일 항목은 ⚠ 표시로 다시 짚는다.

---

## 1. 사용자 / 기기 / 세션 / 이벤트

> **§1 이하 테이블별 컬럼표 읽는 법** — 본문 표는 자료형/제약/인덱스를 "타겟" 기준으로 갱신 중이다. 다음 항목은 §0.3 마이그레이션 todo 와 동기되며, 본문에 표기가 남아 있더라도 §0.0/§0.1 정책이 우선이다:
>
> - **`id` 의 "PK, NOT NULL, 클라이언트 v4 발급"** → 타겟은 **UUIDv7** (application 발급). v4 표기는 현재 schema.prisma 잔류.
> - **`updated_at` 의 "NOT NULL, Prisma가 UPDATE마다 갱신"** → 타겟은 **NULLABLE** (INSERT 시 NULL, 첫 UPDATE 부터 채워짐). Prisma 표기는 `DateTime? @updatedAt @db.Timestamptz()`.
> - **`deleted_at`** → lifecycle 테이블(아래 ✓ 표 참조) 전부에 `TIMESTAMPTZ NULLABLE` 로 추가된다. 본문 컬럼표에 행이 누락되어 있어도 정책상 존재한다고 본다.
> - **인덱스/제약 이름** → `users_pkey` / `users_email_key` / `question_variants_question_id_idx` 같은 자동 생성 이름은 타겟에서 `pk_users` / `uq_users_email` / `idx_question_variants_question_id` 로 리네임 예정 (§0.3 #6).
>
> **`deleted_at` 도입 대상 (lifecycle 테이블 ✓ / append-only · bridge · current-state 예외 ✗)**
>
> | 테이블                           | `deleted_at`                                |
> | -------------------------------- | ------------------------------------------- |
> | `users`                          | ✓                                           |
> | `devices`                        | ✗ (passive identity)                        |
> | `user_sessions`                  | ✓                                           |
> | `session_events`                 | ✗ (append-only event)                       |
> | `questions`                       | ✓                                           |
> | `question_variants`              | ✓                                           |
> | `question_visibility_conditions` | ✗ (sub-config)                              |
> | `user_responses`                 | ✗ (current-state, row absence = unanswered) |
> | `priority_rules`                 | ✓                                           |
> | `priority_rule_conditions`       | ✗ (sub-config)                              |
> | `decision_runs`                  | ✗ (append-only snapshot)                    |
> | `brands`                         | ✓                                           |
> | `product_categories`             | ✓                                           |
> | `category_attribute_definitions` | ✓                                           |
> | `products`                       | ✓                                           |
> | `product_filter_mappings`        | ✓                                           |
> | `question_filter_mappings`   | ✓                                           |
> | `ingredients`                    | ✓                                           |
> | `product_ingredients`            | ✗ (bridge)                                  |
> | `ingredient_groups`              | ✓                                           |
> | `ingredient_group_members`       | ✗ (bridge)                                  |
> | `reaction_reports`               | ✓                                           |
> | `reaction_report_products`       | ✗ (bridge)                                  |
> | `suspected_causes`               | ✗ (computed, ephemeral)                     |
> | `avoidance_rules`                | ✓                                           |

### 1.1 `users`

| 필드 (DB 컬럼)             | Prisma 타입                                  | SQL 타입          | 제약                                      | 설명           | 예시                                   |
| -------------------------- | -------------------------------------------- | ----------------- | ----------------------------------------- | -------------- | -------------------------------------- |
| `id`                       | `String @id @db.Uuid`                        | `UUID`            | PK, NOT NULL, 클라이언트 v4 발급          | 유저 UUID      | `8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d` |
| `email`                    | `String @db.VarChar(255)`                    | `VARCHAR(255)`    | NOT NULL, UNIQUE                          | 로그인 이메일  | `user@example.com`                     |
| `name`                     | `String @db.VarChar(100)`                    | `VARCHAR(100)`    | NOT NULL                                  | 표시 이름      | `홍길동`                               |
| `role`                     | `users_role_enum`                            | `users_role_enum` | NOT NULL                                  | 권한 enum      | `USER`                                 |
| `createdAt` (`created_at`) | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`     | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`     | 가입 시각      | `2026-05-08T10:00:00.000`              |
| `updatedAt` (`updated_at`) | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`     | NULLABLE (INSERT 시 NULL, UPDATE 시 채움) | 최종 갱신 시각 | `2026-05-08T10:05:23.123`              |

**인덱스**

- `pk_users` (PK on `id`)
- `uq_users_email` (UNIQUE on `email`)

**설명**: 로그인 계정. 비로그인 사용자도 서비스를 쓸 수 있어서 모든 사용자 데이터의 진입점은 아니다. 로그인 시 `devices.user_id`를 채워 연결한다.

---

### 1.2 `devices`

| 필드           | Prisma 타입                                  | SQL 타입      | 제약                                                           | 설명                                                  | 예시                      |
| -------------- | -------------------------------------------- | ------------- | -------------------------------------------------------------- | ----------------------------------------------------- | ------------------------- |
| `id`           | `String @id @db.Uuid`                        | `UUID`        | PK, NOT NULL                                                   | 브라우저 cookie/localStorage에 저장되는 device_id     | `dev-aa11...bb22`         |
| `user_id`      | `String? @db.Uuid`                           | `UUID`        | NULLABLE, FK → `users.id` ON DELETE SET NULL ON UPDATE CASCADE | 로그인 시 연결되는 사용자                             | `8a7b9c1d-...`            |
| `last_seen_at` | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                          | 마지막 활동 시각 (앱 hit 시 application 측에서 touch) | `2026-05-08T10:00:00.000` |
| `created_at`   | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                          | 최초 방문 시각                                        | `2026-04-30T08:11:42.000` |

**인덱스**

- `pk_devices` (PK on `id`)

> `user_id` 컬럼에 별도 보조 인덱스를 두지 않는다. 로그인-병합 트랜잭션은 `devices.id` PK 로 row 를 잡고, 그 외에는 `user_id` 로 devices 를 검색할 일이 없다.

**설명**: 브라우저/기기 단위 영구 신원. 시크릿 모드/쿠키 초기화 시 새 `device_id` 발급 → 이전 데이터와 단절(의도된 동작).

**설계 이유**: 회원 추적/광고 ID 없이 익명 사용을 1차로 두는 정책 때문에, "기기"가 비로그인 상태의 최소 신원 단위가 된다. `user_id`가 NULL 가능하므로 모든 자식 테이블도 `(device_id NOT NULL, user_id NULLABLE)` 패턴을 그대로 따른다.

---

### 1.3 `user_sessions`

| 필드           | Prisma 타입                                  | SQL 타입       | 제약                                           | 설명                                                                 | 예시                          |
| -------------- | -------------------------------------------- | -------------- | ---------------------------------------------- | -------------------------------------------------------------------- | ----------------------------- |
| `id`           | `String @id @db.Uuid`                        | `UUID`         | PK, NOT NULL (UUIDv7, app 발급)                | 세션 ID                                                              | `01935b8f-...`                |
| `device_id`    | `String @db.Uuid`                            | `UUID`         | NOT NULL, FK → `devices.id` ON DELETE RESTRICT | 소유 기기                                                            | UUID                          |
| `user_id`      | `String? @db.Uuid`                           | `UUID`         | NULLABLE, FK → `users.id` ON DELETE SET NULL   | 로그인 사용자 (로그인-병합 트랜잭션이 채움)                          | `null` / UUID                 |
| `entry_path`   | `String @db.VarChar(255)`                    | `VARCHAR(255)` | NOT NULL                                       | 진입 경로 (`/`, `/concern/acne` 등)                                  | `/concern/acne`               |
| `referrer`     | `String? @db.Text`                           | `TEXT`         | NULLABLE                                       | 외부 referrer                                                        | `https://instagram.com/...`   |
| `logged_in_at` | `DateTime? @db.Timestamptz()`                | `TIMESTAMPTZ`  | NULLABLE                                       | 이 세션이 로그인으로 user_id 에 연결된 시각 — 비로그인 진입이면 NULL | `null` / `2026-05-14T09:30:…` |
| `created_at`   | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`          | 세션 row 생성 시각 (= 세션 시작)                                     | `2026-05-14T09:12:33.000Z`    |
| `deleted_at`   | `DateTime? @db.Timestamptz()`                | `TIMESTAMPTZ`  | NULLABLE                                       | 소프트 삭제 (audit 외 거의 NULL)                                     | `null`                        |

**인덱스**

- `pk_user_sessions` (PK on `id`)

> `device_id` / `user_id` / `created_at` 보조 인덱스를 두지 않는다. 활성 세션 판정은 `session_events.session_id` 측에서 시작해 `user_sessions.id` PK 로 join 하고, 로그인-병합 트랜잭션은 `WHERE device_id = ? AND user_id IS NULL` UPDATE 한 번만 일어난다. 시간대별 분석은 후행 OLAP 단에서 처리한다.

**설명**: dimension/transaction 테이블. session 의 "활동창" 런타임 상태를 컬럼으로 추적하지 않는다 (`status` / `started_at` / `last_seen_at` / `completed_at` / `expires_at` / `updated_at` 모두 없음). 세션의 종료/타임아웃 같은 시간 분포는 `session_events.created_at` 분포로 사후 분석한다. 유입 경로(entry_path / referrer) 와 사용자 신원 연결 시각(logged_in_at) 만 dimension 컨텍스트로 보존한다.

**설계 이유**: session_events 의 fact 측에 신원·유입 dimension 을 join 으로 붙이는 별표(star)형 구조를 의도. 세션 자체에 mutate 컬럼이 없으므로 단순 INSERT + (로그인 발생 시 한 번의) UPDATE 만 일어난다. 30분 timeout 같은 비즈니스 정책이 필요하면 application/Service 레이어에서 `session_events.created_at` 기반으로 판정한다.

**⚠ 불일치**: 현재 schema.prisma 에는 `status` / `started_at` / `last_seen_at` / `completed_at` / `expires_at` / `updated_at` / `ab_variant` 컬럼이 존재한다. 후속 마이그레이션 PR 에서 컬럼 제거 + `logged_in_at` 추가 + `user_sessions_status_enum` (=`SessionStatus`) DROP TYPE 진행. db_modeling.md 의 `segment` 컬럼 제안도 본 재구조와 함께 폐기 (A/B 테스트가 필요해지면 `session_events.payload` 또는 별도 테이블로 분리).

---

### 1.4 `session_events`

| 필드         | Prisma 타입                                  | SQL 타입       | 제약                                                 | 설명             | 예시                              |
| ------------ | -------------------------------------------- | -------------- | ---------------------------------------------------- | ---------------- | --------------------------------- |
| `id`         | `String @id @db.Uuid`                        | `UUID`         | PK, NOT NULL                                         | 이벤트 ID        | `evt-...`                         |
| `session_id` | `String @db.Uuid`                            | `UUID`         | NOT NULL, FK → `user_sessions.id` ON DELETE RESTRICT | 소속 세션        | UUID                              |
| `event_name` | `String @db.VarChar(100)`                    | `VARCHAR(100)` | NOT NULL                                             | 이벤트 키        | `concern_clicked`                 |
| `screen`     | `String @db.VarChar(100)`                    | `VARCHAR(100)` | NOT NULL                                             | 발생 화면        | `landing`                         |
| `element_id` | `String? @db.VarChar(100)`                   | `VARCHAR(100)` | NULLABLE                                             | 버튼/카드 식별자 | `segment_A`                       |
| `payload`    | `Json`                                       | `JSONB`        | NOT NULL                                             | 부가 정보        | `{"concern":"acne","position":3}` |
| `created_at` | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                | 발생 시각        | `2026-05-08T10:00:01.234`         |

**인덱스**

- `pk_session_events` (PK)

> `session_id` / `device_id` 보조 인덱스를 두지 않는다. `device_id` 컬럼 자체를 보관하지 않고, 분석은 `session_id → user_sessions` join 으로 device/user 를 풀어내는 별표 구조로 일원화한다.

**설명**: 클릭/노출/CTA 이벤트 로그. `user_id` / `device_id` 컬럼이 없는 것이 의도된 설계 — 로그인 사용자/기기 추적은 `session_id → user_sessions.user_id / .device_id` JOIN으로 수행한다.

**설계 이유**: 이벤트가 대량으로 들어오기 때문에 컬럼 수와 인덱스 수를 최소화한다. dimension 정보는 `user_sessions` 한 곳으로 모으고, fact 측은 PK 만 유지한다.

---

## 2. 질문 기준 / 화면 질문 구조

### 2.1 `questions`

| 필드            | Prisma 타입                                  | SQL 타입                                                          | 제약                                  | 설명                                    | 예시                      |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------- | --------------------------------------- | ------------------------- |
| `id`            | `String @id @db.Uuid`                        | `UUID`                                                            | PK, NOT NULL                          | 내부 PK                                 | UUID                      |
| `key`           | `String @db.VarChar(100)`                    | `VARCHAR(100)`                                                    | NOT NULL, UNIQUE                      | seed/admin/debug용 slug. FK 대상 아님   | `life.outdoor_activity`   |
| `answer_type`   | `questions_answer_type_enum`                  | `questions_answer_type_enum`                                       | NOT NULL                              | 답변 형식. UI/admin/service 검증에 사용 | `THREE_CHOICE`            |
| `answer_values` | `Int[]`                                      | `INTEGER[]`                                                       | NOT NULL                              | 내부 로직 비교값 배열                   | `[3,2,1]`                 |
| `answer_count`  | `Int`                                        | `INTEGER GENERATED ALWAYS AS (cardinality(answer_values)) STORED` | NOT NULL                              | 답변 개수. 복합 FK용 생성 컬럼          | `3`                       |
| `is_active`     | `Boolean @default(true)`                     | `BOOLEAN`                                                         | NOT NULL, DEFAULT `true`              | 비활성화 시 신규 질문/조건에서 제외     | `true`                    |
| `created_at`    | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`                                                     | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 생성                                    | `2026-04-01T00:00:00.000` |
| `updated_at`    | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`                                                     | NULLABLE                              | 갱신                                    | `2026-05-08T10:00:00.000` |

**인덱스 / 제약**

- `pk_questions` (PK)
- `uq_questions_key` (UNIQUE on `key`) — slug 중복 방지용, 관계 FK 대상 아님
- `uq_questions_id_answer_count` (UNIQUE on `id, answer_count`) — `question_variants`의 답변 라벨 개수 검증용

**설명**: 시스템 전체에서 사용 가능한 기준 질문 마스터. 관계 FK는 `id`를 기준으로 두고, `key`는 seed/admin/debug에서 사람이 읽기 쉬운 slug로만 사용한다. DB는 `questions.answer_values` 개수와 `question_variants.answers` 라벨 개수가 같은지만 강제한다.

**Prisma 주의**: PostgreSQL 생성 컬럼(`answer_count`)과 복합 FK는 Prisma schema만으로 완전 표현하기 어렵다. Prisma 모델에는 `answerValues Int[]`를 두고, `answer_count` 생성 컬럼과 복합 FK는 raw migration SQL로 추가한다.

```sql
ALTER TABLE questions
ADD COLUMN answer_count integer
GENERATED ALWAYS AS (cardinality(answer_values)) STORED;

ALTER TABLE questions
ADD CONSTRAINT uq_questions_id_answer_count
UNIQUE (id, answer_count);
```

---

### 2.2 `question_variants`

| 필드           | Prisma 타입                                  | SQL 타입                                                    | 제약                                            | 설명                                | 예시                                    |
| -------------- | -------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- | ----------------------------------- | --------------------------------------- |
| `id`           | `String @id @db.Uuid`                        | `UUID`                                                      | PK, NOT NULL                                    | 질문 variant ID                     | UUID                                    |
| `question_id`  | `String @db.Uuid`                            | `UUID`                                                      | NOT NULL, FK → `questions.id` ON DELETE CASCADE | 연결 기준 질문 (canonical 삭제 시 함께 정리) | UUID                                    |
| `title`        | `String @db.Text`                            | `TEXT`                                                      | NOT NULL                                        | 관리자/사용자 표시 질문 제목        | `야외 활동 시간`                        |
| `answers`      | `String[]`                                   | `TEXT[]`                                                    | NOT NULL                                        | 화면에 노출할 답변 라벨 배열        | `["2시간 이상","1~2시간","1시간 이하"]` |
| `answer_count` | `Int`                                        | `INTEGER GENERATED ALWAYS AS (cardinality(answers)) STORED` | NOT NULL                                        | 답변 라벨 개수. 복합 FK용 생성 컬럼 | `3`                                     |
| `screen`       | `question_variants_screen_enum`              | `question_variants_screen_enum`                             | NOT NULL                                        | 노출 화면 (priority_gate / context) | `priority_gate`                         |
| `ui_section`   | `question_variants_ui_section_enum`          | `question_variants_ui_section_enum`                         | NOT NULL                                        | 화면 내 박스 (life_routine / owned_products / basic / category) | `life_routine`                          |
| `sort_order`   | `Int @default(0)`                            | `INTEGER`                                                   | NOT NULL, DEFAULT `0`                           | 노출 순서                           | `10`                                    |
| `is_active`    | `Boolean @default(true)`                     | `BOOLEAN`                                                   | NOT NULL, DEFAULT `true`                        | 노출 여부                           | `true`                                  |
| `created_at`   | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`                                               | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`           | 생성                                | 타임스탬프                              |
| `updated_at`   | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`                                               | NULLABLE                                        | 갱신                                | 타임스탬프                              |

**인덱스 / 제약**

- `pk_question_variants` (PK)
- `idx_question_variants_question_id`
- `idx_question_variants_screen_ui_section_sort_order`
- `fk_question_variants_question_answer_count` (FK on `question_id, answer_count` → `questions.id, answer_count`)

**설명**: 사용자에게 실제로 노출되는 질문 정의. 같은 `question_id`를 여러 화면 질문이 공유할 수 있고, 화면별 `answers` 라벨은 달라도 index별 내부 `value`는 `questions.answer_values`가 결정한다.

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

### 2.3 `question_visibility_conditions`

| 필드                  | Prisma 타입                                  | SQL 타입                   | 제약                                                     | 설명                                                         | 예시       |
| --------------------- | -------------------------------------------- | -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| `id`                  | `String @id @db.Uuid`                        | `UUID`                     | PK, NOT NULL                                             | 조건 ID                                                      | UUID       |
| `question_variant_id` | `String @db.Uuid`                            | `UUID`                     | NOT NULL, FK → `question_variants.id` ON DELETE CASCADE  | 대상 질문 variant (canonical 이 아닌 화면 variant 기준)      | UUID       |
| `operator`            | `comparison_operator_enum`                   | `comparison_operator_enum` | NOT NULL                                                 | 연산자                                                       | `EQ`       |
| `value`               | `Int`                                        | `INTEGER`                  | NOT NULL                                                 | 비교값                                                       | `1`        |
| `state`               | `condition_state_enum`                       | `condition_state_enum`     | NOT NULL                                                 | REQUIRED(모두 충족 시 노출) / EXCLUDED(하나라도 맞으면 숨김) | `REQUIRED` |
| `created_at`          | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`              | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                    | 생성                                                         | 타임스탬프 |
| `updated_at`          | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`              | NULLABLE                                                 | 마지막 변경 시각                                             | 타임스탬프 |

**인덱스**

- `pk_question_visibility_conditions` (PK)
- `idx_question_visibility_conditions_question_variant_id`

**설명**: 질문 노출 조건. canonical question 이 아닌 화면 variant 단위로 노출 여부가 결정되므로 FK 는 `question_variants.id` 만 둔다. 어떤 user_response 와 비교할지는 service 평가기가 결정한다 — DB 는 대상 variant + operator + value + state 만 보관한다.

---

### 2.4 `user_responses`

| 필드                  | Prisma 타입                                  | SQL 타입                     | 제약                                                     | 설명                                               | 예시            |
| --------------------- | -------------------------------------------- | ---------------------------- | -------------------------------------------------------- | -------------------------------------------------- | --------------- |
| `id`                  | `String @id @db.Uuid`                        | `UUID`                       | PK, NOT NULL                                             | 응답 row ID                                        | UUID            |
| `device_id`           | `String @db.Uuid`                            | `UUID`                       | NOT NULL, FK → `devices.id` ON DELETE RESTRICT           | 기기                                               | UUID            |
| `user_id`             | `String? @db.Uuid`                           | `UUID`                       | NULLABLE, FK → `users.id` ON DELETE SET NULL             | 로그인 시 자동 병합                                | UUID / null     |
| `question_id`         | `String @db.Uuid`                            | `UUID`                       | NOT NULL, FK → `questions.id` ON DELETE RESTRICT         | canonical question ID. 복원/평가/필터 매핑 기준    | UUID            |
| `question_variant_id` | `String? @db.Uuid`                           | `UUID`                       | NULLABLE, FK → `question_variants.id` ON DELETE SET NULL | 실제로 본 질문 variant. concern preset은 null 가능 | UUID / null     |
| `value`               | `Int[]`                                      | `INTEGER[]`                  | NOT NULL                                                 | 내부 로직용 값. 단일 선택도 길이 1 배열로 저장     | `[3]`           |
| `source`              | `user_responses_source_enum`                 | `user_responses_source_enum` | NOT NULL                                                 | 어디서 입력했는지                                  | `priority_gate` |
| `created_at`          | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`                | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                    | 최초 입력 시각                                     | 타임스탬프      |
| `updated_at`          | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`                | NULLABLE                                                 | 마지막 변경 시각                                   | 타임스탬프      |

**인덱스 / 제약**

- `pk_user_responses` (PK)
- `uq_user_responses_anonymous_device_question` (UNIQUE on `device_id, question_id WHERE user_id IS NULL`) — 비로그인 device별 질문 1 row
- `uq_user_responses_user_question` (UNIQUE on `user_id, question_id WHERE user_id IS NOT NULL`) — 로그인 사용자별 질문 1 row
- `fk_user_responses_question_id` (FK on `question_id` → `questions.id`)
- `fk_user_responses_question_variant_id` (FK on `question_variant_id` → `question_variants.id`)

> 보조 인덱스(`session_id`/`question_id`/`question_variant_id`)는 두지 않는다. `session_id` 컬럼 자체를 제거해 어느 세션에서 답했는지는 `session_events` 의 `value_change` 이벤트 payload 로 추적한다. canonical question 별 조회는 위 partial unique index 가 직접 만족시킨다.

**설명**: 질문별 현재 답변 상태 테이블. `question_id`는 canonical `questions.id`를 항상 참조하고, 사용자가 실제로 본 질문 문구가 있으면 `question_variant_id`를 함께 저장한다. 같은 질문을 다른 화면에서 다르게 물어도 복원과 평가 기준은 `question_id`다. `question_variant_id`는 감사/분석용 단순 FK이며, variant/canonical question 쌍 일치는 DB 복합 FK가 아니라 Service insert 로직에서 보장한다.

**설계 이유**: 화면 복원과 rule 평가는 "현재 답변"만 필요하다. 사용자가 답을 바꾼 이력은 `session_events`에 이벤트로 남기고, 결과 산출 당시 입력 묶음은 `decision_runs.input_snapshot`에 보존한다. 따라서 `user_responses`는 question별 1 row current-state로 두고 UPDATE/UPSERT한다.

**Prisma 주의**: partial unique index(`WHERE user_id IS NULL/IS NOT NULL`)는 Prisma schema만으로 완전 표현하기 어렵다. raw migration SQL로 추가한다.

```sql
CREATE UNIQUE INDEX uq_user_responses_anonymous_device_question
ON user_responses (device_id, question_id)
WHERE user_id IS NULL;

CREATE UNIQUE INDEX uq_user_responses_user_question
ON user_responses (user_id, question_id)
WHERE user_id IS NOT NULL;

ALTER TABLE user_responses
ADD CONSTRAINT fk_user_responses_question_variant_id
FOREIGN KEY (question_variant_id)
REFERENCES question_variants (id)
ON DELETE SET NULL;
```

---

## 3. Priority Gate

### 3.1 `priority_rules`

| 필드                    | Prisma 타입                                  | SQL 타입                          | 제약                                                      | 설명                               | 예시                         |
| ----------------------- | -------------------------------------------- | --------------------------------- | --------------------------------------------------------- | ---------------------------------- | ---------------------------- |
| `id`                    | `String @id @db.Uuid`                        | `UUID`                            | PK, NOT NULL                                              | Rule ID                            | UUID                         |
| `name`                  | `String @db.VarChar(200)`                    | `VARCHAR(200)`                    | NOT NULL                                                  | 관리자용 Rule 이름                 | `선크림 루틴 우선`           |
| `priority`              | `Int`                                        | `INTEGER`                         | NOT NULL                                                  | 평가 순서 (낮을수록 우선)          | `1`                          |
| `is_active`             | `Boolean @default(true)`                     | `BOOLEAN`                         | NOT NULL, DEFAULT `true`                                  | 평가 대상 여부                     | `true`                       |
| `result_type`           | `priority_rules_result_type_enum`            | `priority_rules_result_type_enum` | NOT NULL                                                  | 결과 종류                          | `ROUTE_CATEGORY`             |
| `result_title`          | `String @db.Text`                            | `TEXT`                            | NOT NULL                                                  | 사용자에 보여줄 결과 제목          | `세럼보다 선크림이 먼저예요` |
| `result_description`    | `String @db.Text`                            | `TEXT`                            | NOT NULL                                                  | 결과 설명                          | (긴 문단)                    |
| `hold_categories`       | `Json?`                                      | `JSONB`                           | NULLABLE                                                  | HOLD 결과 시 보류할 제품군 객체 배열 (`[{category_id, reason}]`) | `[{"category_id":"…","reason":"…"}]` |
| `recommend_category_id` | `String? @db.Uuid`                           | `UUID`                            | NULLABLE, FK → `product_categories.id` ON DELETE SET NULL | ROUTE_CATEGORY 시 추천 제품군      | UUID                         |
| `cta_label`             | `String? @db.VarChar(100)`                   | `VARCHAR(100)`                    | NULLABLE                                                  | CTA 버튼 문구                      | `선크림 보러가기`            |
| `cta_target`            | `String? @db.VarChar(255)`                   | `VARCHAR(255)`                    | NULLABLE                                                  | CTA 이동 경로                      | `/category/sunscreen`        |
| `created_at`            | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`                     | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                     | 생성                               | 타임스탬프                   |
| `updated_at`            | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`                     | NULLABLE                                                  | 갱신                               | 타임스탬프                   |

**인덱스**

- `pk_priority_rules` (PK)

> 보조 인덱스(`priority+is_active`, `recommend_category_id`)는 두지 않는다. 활성 Rule 집합 자체가 작아 전수 스캔 + 메모리 정렬 비용이 무시할 수준이며, recommend_category_id 역검색은 발생하지 않는다.

**설명**: Priority Gate 평가의 출력 정의. 조건은 자식 테이블 `priority_rule_conditions`에 분리.

**⚠ JSONB 구조**: `hold_categories`는 `[{category_id, reason}]` 형태의 객체 배열. Service 레이어에서 Zod로 구조 검증.

---

### 3.2 `priority_rule_conditions`

| 필드          | Prisma 타입                                  | SQL 타입                   | 제약                                                  | 설명                | 예시       |
| ------------- | -------------------------------------------- | -------------------------- | ----------------------------------------------------- | ------------------- | ---------- |
| `id`          | `String @id @db.Uuid`                        | `UUID`                     | PK, NOT NULL                                          | 조건 ID             | UUID       |
| `rule_id`     | `String @db.Uuid`                            | `UUID`                     | NOT NULL, FK → `priority_rules.id` ON DELETE RESTRICT | 소속 Rule           | UUID       |
| `question_id` | `String @db.Uuid`                            | `UUID`                     | NOT NULL, FK → `questions.id` ON DELETE RESTRICT       | 평가할 기준 질문    | UUID       |
| `operator`    | `comparison_operator_enum`                   | `comparison_operator_enum` | NOT NULL                                              | 연산자              | `IN`       |
| `value`       | `Int[]`                                      | `INTEGER[]`                | NOT NULL                                              | 비교값 (단일도 길이 1) | `[3,2]`    |
| `state`       | `condition_state_enum`                       | `condition_state_enum`     | NOT NULL                                              | REQUIRED / EXCLUDED   | `REQUIRED` |
| `created_at`  | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`              | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                 | 생성                  | 타임스탬프 |
| `updated_at`  | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`              | NULLABLE                                              | 마지막 변경 시각      | 타임스탬프 |

**인덱스**

- `pk_priority_rule_conditions` (PK)
- `idx_priority_rule_conditions_question_id`
- `idx_priority_rule_conditions_rule_id`

**설명**: Rule 발동 조건. REQUIRED는 모두 충족이 AND, EXCLUDED는 하나라도 맞으면 해당 Rule 탈락.

---

### 3.3 `decision_runs`

| 필드                       | Prisma 타입                                  | SQL 타입                           | 제약                                                                | 설명                                                                           | 예시                     |
| -------------------------- | -------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------ |
| `id`                       | `String @id @db.Uuid`                        | `UUID`                             | PK, NOT NULL                                                        | 실행 기록 ID                                                                   | UUID                     |
| `device_id`                | `String @db.Uuid`                            | `UUID`                             | NOT NULL, FK → `devices.id` ON DELETE RESTRICT                      | 기기                                                                           | UUID                     |
| `user_id`                  | `String? @db.Uuid`                           | `UUID`                             | NULLABLE, FK → `users.id` ON DELETE SET NULL                        | 로그인 사용자                                                                  | UUID / null              |
| `session_id`               | `String @db.Uuid`                            | `UUID`                             | NOT NULL, FK → `user_sessions.id` ON DELETE RESTRICT                | 세션                                                                           | UUID                     |
| `decision_type`            | `String @db.VarChar(50)`                     | `VARCHAR(50)`                      | NOT NULL                                                            | 종류 (PRIORITY_GATE / CATEGORY_DECISION / PRODUCT_MATRIX / REACTION_TRACEBACK) — application enum 으로 검증 | `PRODUCT_MATRIX`         |
| `source_screen`            | `String @db.VarChar(100)`                    | `VARCHAR(100)`                     | NOT NULL                                                            | 발생 화면                                                                      | `product_matrix`         |
| `category_id`              | `String? @db.Uuid`                           | `UUID`                             | NULLABLE, FK → `product_categories.id` ON DELETE SET NULL           | 관련 제품군                                                                    | UUID                     |
| `filter_state_id`          | `String? @db.Uuid`                           | `UUID`                             | NULLABLE, FK → `question_filter_mappings.id` ON DELETE SET NULL | 사용된 필터 상태                                                               | UUID / null              |
| `result_type`              | `String? @db.VarChar(50)`                    | `VARCHAR(50)`                      | NULLABLE                                                            | 결과 타입 snapshot (Priority Gate면 `HOLD` 등)                                 | `HOLD`                   |
| `result_title`             | `String? @db.Text`                           | `TEXT`                             | NULLABLE                                                            | 결과 제목 snapshot                                                             | 텍스트                   |
| `result_description`       | `String? @db.Text`                           | `TEXT`                             | NULLABLE                                                            | 결과 설명 snapshot                                                             | 텍스트                   |
| `cta_label`                | `String? @db.VarChar(100)`                   | `VARCHAR(100)`                     | NULLABLE                                                            | CTA 문구 snapshot                                                              | `선크림 보러가기`        |
| `cta_target`               | `String? @db.VarChar(255)`                   | `VARCHAR(255)`                     | NULLABLE                                                            | CTA 경로 snapshot                                                              | `/category/sunscreen`    |
| `input_snapshot`           | `Json`                                       | `JSONB`                            | NOT NULL                                                            | 당시 user_responses 등 입력값 묶음                                             | `{ "responses": {...} }` |
| `applied_filters_snapshot` | `Json`                                       | `JSONB`                            | NOT NULL                                                            | 적용된 필터 + attribute 조건                                                   | `{ "filters": [...] }`   |
| `result_snapshot`          | `Json`                                       | `JSONB`                            | NOT NULL                                                            | 조회된 제품/태그 등 최종 결과                                                  | `{ "products": [...] }`  |
| `created_at`               | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`                      | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                               | 발생 시각                                                                      | 타임스탬프               |

**인덱스**

- `pk_decision_runs` (PK)
- `idx_decision_runs_category_id`
- `idx_decision_runs_device_id_decision_type_created_at` (`device_id, decision_type, created_at`) — 사용자 이력 화면
- `idx_decision_runs_filter_state_id`
- `idx_decision_runs_session_id`
- `idx_decision_runs_user_id_decision_type_created_at` (`user_id, decision_type, created_at`)

**설명**: Priority Gate / Category Decision / Product Matrix / Reaction Traceback이 사용자에게 실제로 보여준 결과 snapshot. 이력 조회·결과 복구·고객지원·분석에 사용.

**설계 이유**: 화면 재조회는 `decision_runs`가 아니라 `question_filter_mappings`를 기준으로 다시 `products` 쿼리한다(db_modeling.md:736). snapshot은 "당시 본 화면 복원"이 목적이고, 실시간 진열은 항상 최신 데이터 기준이어야 하기 때문. `result_snapshot` 등을 NOT NULL JSONB로 강제해 누락 방지.

---

## 4. 제품 DB

### 4.1 `brands`

| 필드         | Prisma 타입                                  | SQL 타입       | 제약                                  | 설명      | 예시       |
| ------------ | -------------------------------------------- | -------------- | ------------------------------------- | --------- | ---------- |
| `id`         | `String @id @db.Uuid`                        | `UUID`         | PK, NOT NULL                          | 브랜드 ID | UUID       |
| `name`       | `String @db.VarChar(200)`                    | `VARCHAR(200)` | NOT NULL, UNIQUE                      | 브랜드명  | `라운드랩` |
| `created_at` | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 생성      | 타임스탬프 |
| `updated_at` | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`  | NULLABLE                              | 갱신      | 타임스탬프 |

**인덱스**

- `pk_brands` (PK)
- `uq_brands_name` (UNIQUE on `name`)

---

### 4.2 `product_categories`

| 필드          | Prisma 타입                                  | SQL 타입       | 제약                                  | 설명      | 예시        |
| ------------- | -------------------------------------------- | -------------- | ------------------------------------- | --------- | ----------- |
| `id`          | `String @id @db.Uuid`                        | `UUID`         | PK, NOT NULL                          | 제품군 ID | UUID        |
| `key`         | `String @db.VarChar(100)`                    | `VARCHAR(100)` | NOT NULL, UNIQUE                      | 영문 키   | `sunscreen` |
| `name`        | `String @db.VarChar(100)`                    | `VARCHAR(100)` | NOT NULL                              | 한글명    | `선크림`    |
| `description` | `String? @db.Text`                           | `TEXT`         | NULLABLE                              | 설명      | 텍스트      |
| `created_at`  | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 생성      | 타임스탬프  |
| `updated_at`  | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`  | NULLABLE                              | 갱신      | 타임스탬프  |

**인덱스**

- `pk_product_categories` (PK)
- `uq_product_categories_key` (UNIQUE on `key`)

**설명**: 6개 카테고리(toner/sunscreen/serum/lipcare/moisturizer/cleanser) 등록. 코드 상수로 `key`를 참조한다.

---

### 4.3 `category_attribute_definitions`

| 필드            | Prisma 타입                                      | SQL 타입                                         | 제약                                                      | 설명                                          | 예시                             |
| --------------- | ------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------- | -------------------------------- |
| `id`            | `String @id @db.Uuid`                            | `UUID`                                           | PK, NOT NULL                                              | 속성 정의 ID                                  | UUID                             |
| `category_id`   | `String @db.Uuid`                                | `UUID`                                           | NOT NULL, FK → `product_categories.id` ON DELETE RESTRICT | 대상 제품군                                   | UUID                             |
| `key`           | `String @db.VarChar(100)`                        | `VARCHAR(100)`                                   | NOT NULL, UNIQUE per (category_id, key)                   | attribute 키                                  | `eye_sting`                      |
| `label`         | `String @db.VarChar(200)`                        | `VARCHAR(200)`                                   | NOT NULL                                                  | 표시명                                        | `눈시림 위험`                    |
| `value_type`    | `category_attribute_definitions_value_type_enum` | `category_attribute_definitions_value_type_enum` | NOT NULL                                                  | 값 형 (BOOLEAN/ENUM/NUMBER/MULTI_ENUM/STRING) | `ENUM`                           |
| `options`       | `Json?`                                          | `JSONB`                                          | NULLABLE                                                  | ENUM/MULTI_ENUM 옵션 배열                     | `["none","low","medium","high"]` |
| `is_required`   | `Boolean @default(false)`                        | `BOOLEAN`                                        | NOT NULL, DEFAULT `false`                                 | 등록 시 필수 여부                             | `true`                           |
| `is_filterable` | `Boolean @default(false)`                        | `BOOLEAN`                                        | NOT NULL, DEFAULT `false`                                 | Product Matrix 필터 후보 여부                 | `true`                           |
| `sort_order`    | `Int @default(0)`                                | `INTEGER`                                        | NOT NULL, DEFAULT `0`                                     | 노출 순서                                     | `30`                             |
| `created_at`    | `DateTime @default(now()) @db.Timestamptz()`     | `TIMESTAMPTZ`                                    | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                     | 생성                                          | 타임스탬프                       |
| `updated_at`    | `DateTime? @updatedAt @db.Timestamptz()`         | `TIMESTAMPTZ`                                    | NULLABLE                                                  | 갱신                                          | 타임스탬프                       |

**인덱스**

- `pk_category_attribute_definitions` (PK)
- `idx_category_attribute_definitions_category_id_sort_order` (`category_id, sort_order`) — admin UI 정렬
- `uq_category_attribute_definitions_category_id_key` (UNIQUE on `category_id, key`) — 같은 카테고리 내 키 중복 금지

**설명**: `products.attributes` JSONB의 스키마-of-스키마. admin 등록 폼·필터 후보·라벨 정렬에 사용.

**설계 이유**: JSONB가 자유 구조라 DB 레벨에서 attribute key/type를 강제할 수 없어, 이 테이블이 메타데이터로 정의하고 Service에서 Zod 검증을 거친다. `is_filterable`은 코드에서 분기하지 않고 데이터로 노출 후보를 끄고 켤 수 있게 한다.

---

### 4.4 `products`

| 필드            | Prisma 타입                                  | SQL 타입                       | 제약                                                      | 설명                                                             | 예시                                |
| --------------- | -------------------------------------------- | ------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- |
| `id`            | `String @id @db.Uuid`                        | `UUID`                         | PK, NOT NULL                                              | 제품 ID                                                          | UUID                                |
| `brand_id`      | `String @db.Uuid`                            | `UUID`                         | NOT NULL, FK → `brands.id` ON DELETE RESTRICT             | 브랜드                                                           | UUID                                |
| `category_id`   | `String @db.Uuid`                            | `UUID`                         | NOT NULL, FK → `product_categories.id` ON DELETE RESTRICT | 제품군                                                           | UUID                                |
| `name`          | `String @db.VarChar(500)`                    | `VARCHAR(500)`                 | NOT NULL                                                  | 제품명 (브랜드+제품명+옵션 함께 들어갈 여유)                     | `라운드랩 자작나무 선크림 50ml`     |
| `price_krw`     | `Int`                                        | `INTEGER`                      | NOT NULL                                                  | 정가 (KRW). 가격대 그루핑은 service/UI 에서 계산                 | `18000`                             |
| `volume_amount` | `Decimal? @db.Decimal(10,2)`                 | `NUMERIC(10,2)`                | NULLABLE                                                  | 액체/내용량 수치                                                 | `160.00`                            |
| `volume_unit`   | `products_volume_unit_enum?`                 | `products_volume_unit_enum`    | NULLABLE                                                  | 내용량 단위 (ML/G/L/MG)                                          | `ML`                                |
| `count_amount`  | `Int?`                                       | `INTEGER`                      | NULLABLE                                                  | 개수/장수 (시트 마스크 70매 등)                                  | `70`                                |
| `count_unit`    | `products_count_unit_enum?`                  | `products_count_unit_enum`     | NULLABLE                                                  | 개수 단위 (SHEET/PIECE/PACK)                                     | `SHEET`                             |
| `volume_label`  | `String? @db.VarChar(100)`                   | `VARCHAR(100)`                 | NULLABLE                                                  | 화면 표시용 원문                                                 | `70매 / 160ml`                      |
| `image_url`     | `String? @db.Text`                           | `TEXT`                         | NULLABLE                                                  | S3 이미지 URL                                                    | `https://...`                       |
| `purchase_url`  | `String? @db.Text`                           | `TEXT`                         | NULLABLE                                                  | 구매 링크                                                        | `https://oliveyoung...`             |
| `attributes`    | `Json`                                       | `JSONB`                        | NOT NULL                                                  | 제품군별 속성값 (스키마는 `category_attribute_definitions` 참조) | `{"spf":50,"eye_sting":"low",...}`  |
| `sort_order`    | `Int @default(0)`                            | `INTEGER`                      | NOT NULL, DEFAULT `0`                                     | 큐레이션 노출 순서                                               | `100`                               |
| `is_active`     | `Boolean @default(true)`                     | `BOOLEAN`                      | NOT NULL, DEFAULT `true`                                  | 노출 여부                                                        | `true`                              |
| `created_at`    | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`                  | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                     | 생성                                                             | 타임스탬프                          |
| `updated_at`    | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`                  | NULLABLE                                                  | 갱신                                                             | 타임스탬프                          |

**인덱스**

- `pk_products` (PK)
- `idx_products_brand_id`
- `idx_products_category_id_is_active_sort_order` (`category_id, is_active, sort_order`) — Product Matrix 카테고리 진열

> `barcode` 컬럼과 `uq_products_barcode` UNIQUE 는 두지 않는다. 바코드 스캔은 "외부 lookup 후 검색"으로 처리하고, 본 테이블에는 바코드 자체를 보관하지 않는다. 필요해지면 별도 매핑 테이블로 후속 도입.
>
> `price_band` 컬럼과 enum 도 두지 않는다. 카테고리마다 가격대 임계치가 다를 수 있어, 가격대 그루핑은 service/UI 가 `price_krw` 를 가지고 계산한다.
>
> 용량은 `volume_amount + volume_unit` (액체/그램) 과 `count_amount + count_unit` (개수/장수) 로 분리하고, 화면 표시 원문은 `volume_label` 로 따로 보관한다. 양쪽 모두 nullable 이라 한쪽만 채워진 제품도 자연스럽게 표현된다.

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

| 필드                      | Prisma 타입                                  | SQL 타입                   | 제약                                                                      | 설명                                                            | 예시             |
| ------------------------- | -------------------------------------------- | -------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------- |
| `id`                      | `String @id @db.Uuid`                        | `UUID`                     | PK, NOT NULL                                                              | 매핑 ID                                                         | UUID             |
| `trigger_question_id`     | `String @db.Uuid`                            | `UUID`                     | NOT NULL, FK → `questions.id` ON DELETE RESTRICT                          | 사용자 답변 기준 질문 (trigger 측)                              | UUID             |
| `trigger_operator`        | `comparison_operator_enum`                   | `comparison_operator_enum` | NOT NULL                                                                  | trigger 연산자                                                  | `EQ`             |
| `trigger_value`           | `Json`                                       | `JSONB`                    | NOT NULL                                                                  | trigger 비교값                                                  | `1`              |
| `attribute_definition_id` | `String @db.Uuid`                            | `UUID`                     | NOT NULL, FK → `category_attribute_definitions.id` ON DELETE RESTRICT     | 대상 attribute (카테고리 + key 일체화)                          | UUID             |
| `attribute_operator`      | `comparison_operator_enum`                   | `comparison_operator_enum` | NOT NULL                                                                  | attribute 조건 연산자                                           | `IN`             |
| `attribute_value`         | `Json`                                       | `JSONB`                    | NOT NULL                                                                  | attribute 비교값                                                | `["none","low"]` |
| `curated`                 | `Boolean @default(false)`                    | `BOOLEAN`                  | NOT NULL, DEFAULT `false`                                                 | 큐레이트된 기본 필터 여부 (구 BASIC_CONDITION)                  | `false`          |
| `filter_label`            | `String @db.VarChar(100)`                    | `VARCHAR(100)`             | NOT NULL                                                                  | 필터 표시 이름                                                  | `눈시림 낮음`    |
| `sort_order`              | `Int @default(0)`                            | `INTEGER`                  | NOT NULL, DEFAULT `0`                                                     | 필터 정렬                                                       | `10`             |
| `is_active`               | `Boolean @default(true)`                     | `BOOLEAN`                  | NOT NULL, DEFAULT `true`                                                  | 활성 여부                                                       | `true`           |
| `created_at`              | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`              | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                                     | 생성                                                            | 타임스탬프       |
| `updated_at`              | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`              | NULLABLE                                                                  | 갱신                                                            | 타임스탬프       |

**인덱스**

- `pk_product_filter_mappings` (PK)
- `idx_product_filter_mappings_attribute_definition_id_is_active_sort_order` (`attribute_definition_id, is_active, sort_order`) — 카테고리별 필터 후보 목록 (attribute 가 카테고리를 내포)
- `idx_product_filter_mappings_trigger_question_id`

**설명**: 사용자 답변(`user_responses.value`) → 제품 attribute 조건의 **번역 테이블**. 룰 엔진이 아니다.

**구조 변경 사유**:

- `category_id` 별도 컬럼은 두지 않는다. `attribute_definition_id` 하나로 어느 카테고리의 어떤 attribute 인지 결정되므로 중복이다.
- `attribute_key` 별도 컬럼도 두지 않는다. 같은 이유.
- `filter_mode` / `filter_key` / `tag_label` / `caution_message` 는 제거. MVP 는 HARD_FILTER 단일 처리로 단순화하고, UI 표시 문구는 application/service 가 `filter_label` 과 attribute 매칭 결과로 조립한다.
- `filter_type` enum 대신 `curated` boolean. `curated = true` 가 구 `BASIC_CONDITION`, `false` 가 구 `PERSONALIZED`.
- Source 측 prefix `source_*` → `trigger_*`. "어떤 user response 가 이 mapping 을 trigger 하는가" 를 의미한다.

---

### 5.2 `question_filter_mappings`

| 필드          | Prisma 타입                                  | SQL 타입                              | 제약                                                      | 설명                                                     | 예시                    |
| ------------- | -------------------------------------------- | ------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------- | ----------------------- |
| `id`          | `String @id @db.Uuid`                        | `UUID`                                | PK, NOT NULL                                              | 상태 row ID                                              | UUID                    |
| `device_id`   | `String @db.Uuid`                            | `UUID`                                | NOT NULL, FK → `devices.id` ON DELETE RESTRICT            | 기기                                                     | UUID                    |
| `user_id`     | `String? @db.Uuid`                           | `UUID`                                | NULLABLE, FK → `users.id` ON DELETE SET NULL              | 로그인 사용자                                            | UUID / null             |
| `session_id`  | `String @db.Uuid`                            | `UUID`                                | NOT NULL, FK → `user_sessions.id` ON DELETE RESTRICT      | 세션                                                     | UUID                    |
| `category_id` | `String @db.Uuid`                            | `UUID`                                | NOT NULL, FK → `product_categories.id` ON DELETE RESTRICT | 제품군                                                   | UUID                    |
| `source`      | `question_filter_mappings_source_enum`       | `question_filter_mappings_source_enum`| NOT NULL                                                  | 생성 경로 (DIRECT/CATEGORY_DECISION_CTA/MANUAL/RESTORED) | `CATEGORY_DECISION_CTA` |
| `filters`     | `Json`                                       | `JSONB`                               | NOT NULL                                                  | 현재 활성 필터 배열                                      | (아래)                  |
| `created_at`  | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`                         | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                     | 생성                                                     | 타임스탬프              |
| `updated_at`  | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`                         | NULLABLE                                                  | 갱신                                                     | 타임스탬프              |

`filters` JSONB 예시 — 각 항목은 `product_filter_mappings.id` 하나를 가리키고, 그 정의를 그대로 쓰거나 사용자가 손댄 비교 조건을 덮어쓴다.

```json
[
  { "filter_definition_id": "<uuid>", "operator": "GTE", "value": 50 },
  { "filter_definition_id": "<uuid>", "operator": "IN", "value": ["none", "low"] }
]
```

**인덱스**

- `pk_question_filter_mappings` (PK)
- `idx_question_filter_mappings_device_id_category_id` (`device_id, category_id`) — 비로그인 최신 row 조회
- `idx_question_filter_mappings_user_id_category_id` (`user_id, category_id`) — 로그인 최신 row 조회

> `is_active` 컬럼은 두지 않는다. 활성 상태는 `(device_id|user_id, category_id)` 의 가장 최근 `updated_at` row 가 곧 현재 상태다. 과거 row 가 필요하면 `created_at` 기준으로 history 조회한다.
>
> `idx_..._session_id` / `idx_..._category_id_is_active_updated_at` 같은 보조 인덱스도 두지 않는다.

**설명**: 사용자가 Product Matrix에서 선택한 필터 상태. 화면 재진입 시 이 row를 기준으로 `products`를 다시 조회한다(snapshot 사용 안 함). BASIC vs PERSONALIZED 구분은 `filters` 안의 `source_type` 이 아니라 `product_filter_mappings.curated` boolean 으로 결정된다 — 합성은 service 책임.

---

## 6. 성분 / Traceback

### 6.1 `ingredients`

| 필드         | Prisma 타입                                  | SQL 타입       | 제약                                  | 설명        | 예시       |
| ------------ | -------------------------------------------- | -------------- | ------------------------------------- | ----------- | ---------- |
| `id`         | `String @id @db.Uuid`                        | `UUID`         | PK, NOT NULL                          | 성분 ID     | UUID       |
| `name_ko`    | `String @db.VarChar(200)`                    | `VARCHAR(200)` | NOT NULL                              | 한글명      | `리날룰`   |
| `name_en`    | `String @db.VarChar(200)`                    | `VARCHAR(200)` | NOT NULL                              | 영문명      | `Linalool` |
| `inci_name`  | `String? @db.VarChar(300)`                   | `VARCHAR(300)` | NULLABLE, UNIQUE                      | INCI 표준명 | `Linalool` |
| `created_at` | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 생성        | 타임스탬프 |
| `updated_at` | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`  | NULLABLE                              | 갱신        | 타임스탬프 |

**인덱스**

- `pk_ingredients` (PK)
- `uq_ingredients_inci_name` (UNIQUE on `inci_name`)

**설명**: INCI를 1차 식별자로 사용. 동일 INCI는 단일 row.

---

### 6.2 `product_ingredients`

| 필드            | Prisma 타입                                  | SQL 타입      | 제약                                               | 설명                         | 예시               |
| --------------- | -------------------------------------------- | ------------- | -------------------------------------------------- | ---------------------------- | ------------------ |
| `id`            | `String @id @db.Uuid`                        | `UUID`        | PK, NOT NULL                                       | row ID                       | UUID               |
| `product_id`    | `String @db.Uuid`                            | `UUID`        | NOT NULL, FK → `products.id` ON DELETE RESTRICT    | 제품                         | UUID               |
| `ingredient_id` | `String @db.Uuid`                            | `UUID`        | NOT NULL, FK → `ingredients.id` ON DELETE RESTRICT | 성분                         | UUID               |
| `order_index`   | `Int`                                        | `INTEGER`     | NOT NULL                                           | 전성분표 순서 (1부터)        | `3`                |
| `raw_text`      | `String? @db.Text`                           | `TEXT`        | NULLABLE                                           | 원문 텍스트 (파싱 누락 대비) | `리날룰(Linalool)` |
| `created_at`    | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`              | 생성                         | 타임스탬프         |

**인덱스**

- `pk_product_ingredients` (PK)
- `idx_product_ingredients_ingredient_id`
- `idx_product_ingredients_product_id`
- `uq_product_ingredients_product_id_ingredient_id` (UNIQUE on `product_id, ingredient_id`) — 같은 제품에 같은 성분 중복 방지

**설명**: 제품 ↔ 성분 M:N 브리지. `order_index`로 전성분표 위치 보존.

---

### 6.3 `ingredient_groups`

| 필드          | Prisma 타입                                  | SQL 타입       | 제약                                  | 설명      | 예시        |
| ------------- | -------------------------------------------- | -------------- | ------------------------------------- | --------- | ----------- |
| `id`          | `String @id @db.Uuid`                        | `UUID`         | PK, NOT NULL                          | 성분군 ID | UUID        |
| `key`         | `String @db.VarChar(100)`                    | `VARCHAR(100)` | NOT NULL, UNIQUE                      | 키        | `fragrance` |
| `name`        | `String @db.VarChar(200)`                    | `VARCHAR(200)` | NOT NULL                              | 표시명    | `향료 계열` |
| `description` | `String? @db.Text`                           | `TEXT`         | NULLABLE                              | 설명      | 텍스트      |
| `created_at`  | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | 생성      | 타임스탬프  |
| `updated_at`  | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`  | NULLABLE                              | 갱신      | 타임스탬프  |

**인덱스**

- `pk_ingredient_groups` (PK)
- `uq_ingredient_groups_key` (UNIQUE on `key`)

**설명**: 의심 성분과 회피 규칙의 카테고리 단위. 개별 성분이 아니라 그룹으로 일반화해야 사용자가 이해/적용 가능.

---

### 6.4 `ingredient_group_members`

| 필드                  | Prisma 타입           | SQL 타입 | 제약                                                     | 설명   | 예시 |
| --------------------- | --------------------- | -------- | -------------------------------------------------------- | ------ | ---- |
| `id`                  | `String @id @db.Uuid` | `UUID`   | PK, NOT NULL                                             | row ID | UUID |
| `ingredient_id`       | `String @db.Uuid`     | `UUID`   | NOT NULL, FK → `ingredients.id` ON DELETE RESTRICT       | 성분   | UUID |
| `ingredient_group_id` | `String @db.Uuid`     | `UUID`   | NOT NULL, FK → `ingredient_groups.id` ON DELETE RESTRICT | 성분군 | UUID |

**인덱스**

- `pk_ingredient_group_members` (PK)
- `idx_ingredient_group_members_ingredient_group_id`
- `uq_ingredient_group_members_ingredient_id_ingredient_group_id` (UNIQUE on `ingredient_id, ingredient_group_id`)

**설명**: 성분 ↔ 성분군 M:N 브리지. 하나의 성분이 여러 그룹에 동시 소속 가능(linalool ∈ fragrance, essential_oil).

> created_at/updated_at 컬럼 없음 — 단순 브리지 테이블이라 시간 추적 불필요.

---

### 6.5 `reaction_reports`

| 필드             | Prisma 타입                                  | SQL 타입       | 제약                                                 | 설명                                | 예시                    |
| ---------------- | -------------------------------------------- | -------------- | ---------------------------------------------------- | ----------------------------------- | ----------------------- |
| `id`             | `String @id @db.Uuid`                        | `UUID`         | PK, NOT NULL                                         | 리포트 ID                           | UUID                    |
| `device_id`      | `String @db.Uuid`                            | `UUID`         | NOT NULL, FK → `devices.id` ON DELETE RESTRICT       | 기기                                | UUID                    |
| `user_id`        | `String? @db.Uuid`                           | `UUID`         | NULLABLE, FK → `users.id` ON DELETE SET NULL         | 로그인 사용자                       | UUID / null             |
| `session_id`     | `String @db.Uuid`                            | `UUID`         | NOT NULL, FK → `user_sessions.id` ON DELETE RESTRICT | 세션                                | UUID                    |
| `symptoms`       | `Json`                                       | `JSONB`        | NOT NULL                                             | 증상 배열 (`["redness","burning"]`) | `["redness","burning"]` |
| `affected_areas` | `Json`                                       | `JSONB`        | NOT NULL                                             | 부위 배열                           | `["cheeks","forehead"]` |
| `onset_timing`   | `String? @db.VarChar(100)`                   | `VARCHAR(100)` | NULLABLE                                             | 발현 시점 (`immediate`, `next_day`) | `next_day`              |
| `memo`           | `String? @db.Text`                           | `TEXT`         | NULLABLE                                             | 자유 메모                           | 텍스트                  |
| `created_at`     | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                | 생성                                | 타임스탬프              |
| `updated_at`     | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`  | NULLABLE                                             | 갱신                                | 타임스탬프              |

**인덱스**

- `pk_reaction_reports` (PK)
- `idx_reaction_reports_device_id_created_at` (`device_id, created_at`)
- `idx_reaction_reports_session_id`
- `idx_reaction_reports_user_id_created_at` (`user_id, created_at`)

---

### 6.6 `reaction_report_products`

| 필드          | Prisma 타입                                  | SQL 타입                             | 제약                                                    | 설명                          | 예시           |
| ------------- | -------------------------------------------- | ------------------------------------ | ------------------------------------------------------- | ----------------------------- | -------------- |
| `id`          | `String @id @db.Uuid`                        | `UUID`                               | PK, NOT NULL                                            | row ID                        | UUID           |
| `report_id`   | `String @db.Uuid`                            | `UUID`                               | NOT NULL, FK → `reaction_reports.id` ON DELETE RESTRICT | 소속 리포트                   | UUID           |
| `product_id`  | `String @db.Uuid`                            | `UUID`                               | NOT NULL, FK → `products.id` ON DELETE RESTRICT         | 제품                          | UUID           |
| `type`        | `reaction_report_products_type_enum`         | `reaction_report_products_type_enum` | NOT NULL                                                | `PROBLEM` / `OK`              | `PROBLEM`      |
| `used_period` | `String? @db.VarChar(100)`                   | `VARCHAR(100)`                       | NULLABLE                                                | 사용 기간 (`under_1_week` 등) | `1_to_4_weeks` |
| `used_count`  | `Int?`                                       | `INTEGER`                            | NULLABLE                                                | 사용 횟수                     | `5`            |
| `created_at`  | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`                        | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                   | 생성                          | 타임스탬프     |

**인덱스**

- `pk_reaction_report_products` (PK)
- `idx_reaction_report_products_product_id`
- `idx_reaction_report_products_report_id`

**설명**: 한 리포트에 PROBLEM/OK 제품이 양쪽으로 매달리는 M:N + 역할 라벨 브리지.

---

### 6.7 `suspected_causes`

| 필드                  | Prisma 타입                                  | SQL 타입                           | 제약                                                     | 설명                | 예시       |
| --------------------- | -------------------------------------------- | ---------------------------------- | -------------------------------------------------------- | ------------------- | ---------- |
| `id`                  | `String @id @db.Uuid`                        | `UUID`                             | PK, NOT NULL                                             | row ID              | UUID       |
| `report_id`           | `String @db.Uuid`                            | `UUID`                             | NOT NULL, FK → `reaction_reports.id` ON DELETE RESTRICT  | 소속 리포트         | UUID       |
| `ingredient_group_id` | `String @db.Uuid`                            | `UUID`                             | NOT NULL, FK → `ingredient_groups.id` ON DELETE RESTRICT | 의심 성분군         | UUID       |
| `confidence`          | `suspected_causes_confidence_enum`           | `suspected_causes_confidence_enum` | NOT NULL                                                 | LOW / MEDIUM / HIGH | `HIGH`     |
| `reason`              | `String? @db.Text`                           | `TEXT`                             | NULLABLE                                                 | 추정 근거 텍스트    | 텍스트     |
| `created_at`          | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`                      | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                    | 생성                | 타임스탬프 |

**인덱스**

- `pk_suspected_causes` (PK)
- `idx_suspected_causes_ingredient_group_id`
- `idx_suspected_causes_report_id`

**설명**: 리포트별 분석 출력. 휘발성(분석 알고리즘이 바뀌면 재계산 가능)이며 리포트 라이프사이클을 따라간다.

---

### 6.8 `avoidance_rules`

| 필드                  | Prisma 타입                                  | SQL 타입                      | 제약                                                     | 설명                               | 예시        |
| --------------------- | -------------------------------------------- | ----------------------------- | -------------------------------------------------------- | ---------------------------------- | ----------- |
| `id`                  | `String @id @db.Uuid`                        | `UUID`                        | PK, NOT NULL                                             | row ID                             | UUID        |
| `device_id`           | `String @db.Uuid`                            | `UUID`                        | NOT NULL, FK → `devices.id` ON DELETE RESTRICT           | 기기                               | UUID        |
| `user_id`             | `String? @db.Uuid`                           | `UUID`                        | NULLABLE, FK → `users.id` ON DELETE SET NULL             | 로그인 사용자                      | UUID / null |
| `ingredient_group_id` | `String @db.Uuid`                            | `UUID`                        | NOT NULL, FK → `ingredient_groups.id` ON DELETE RESTRICT | 회피 대상 성분군                   | UUID        |
| `action`              | `avoidance_rules_action_enum`                | `avoidance_rules_action_enum` | NOT NULL                                                 | `AVOID`(제외) / `CAUTION`(△ 태그)  | `AVOID`     |
| `reason`              | `String? @db.Text`                           | `TEXT`                        | NULLABLE                                                 | 메모                               | 텍스트      |
| `is_active`           | `Boolean @default(true)`                     | `BOOLEAN`                     | NOT NULL, DEFAULT `true`                                 | 활성 여부 (사용자가 비활성화 가능) | `true`      |
| `created_at`          | `DateTime @default(now()) @db.Timestamptz()` | `TIMESTAMPTZ`                 | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`                    | 생성                               | 타임스탬프  |
| `updated_at`          | `DateTime? @updatedAt @db.Timestamptz()`     | `TIMESTAMPTZ`                 | NULLABLE                                                 | 갱신                               | 타임스탬프  |

**인덱스**

- `pk_avoidance_rules` (PK)
- `idx_avoidance_rules_device_id_is_active_updated_at` (`device_id, is_active, updated_at`)
- `idx_avoidance_rules_ingredient_group_id`
- `idx_avoidance_rules_user_id_is_active_updated_at` (`user_id, is_active, updated_at`)

**설명**: 사용자별 영속 회피 규칙. Product Matrix 조회 시 적용.

**설계 이유**: `report_id` FK가 없다. ① 사용자가 직접 회피 규칙을 추가할 수도 있고(리포트 없이), ② 같은 사용자가 시간차로 여러 리포트에서 동일 성분군을 의심해도 회피 규칙은 단일 row여야 하며, ③ 리포트 삭제가 회피 규칙에 영향을 주면 안 되기 때문. `suspected_causes`와는 `ingredient_group_id`라는 공통 키로 join할 수 있는 느슨한 연결만 유지한다.

---

## 부록 A. FK ON DELETE 정책 한눈에 보기

| 패턴                                | ON DELETE  | 적용 예                                                                                                                                                        |
| ----------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 영속 마스터 → 사용자 활동           | `RESTRICT` | `devices.id` ← user_sessions, user_responses, decision_runs, reaction_reports, question_filter_mappings, avoidance_rules                                   |
| 영속 마스터 → 사용자 활동 (user 측) | `SET NULL` | `users.id` ← devices, user_sessions, user_responses, decision_runs, reaction_reports, question_filter_mappings, avoidance_rules                            |
| 카탈로그 → 카탈로그                 | `RESTRICT` | `questions.id` ← user_responses / priority_rule_conditions / product_filter_mappings.trigger_question_id, `category_attribute_definitions.id` ← product_filter_mappings.attribute_definition_id |
| 카탈로그 → 카탈로그 (자식 cascade)  | `CASCADE`  | `questions.id` ← question_variants (canonical 삭제 시 variant 도 함께), `question_variants.id` ← question_visibility_conditions (variant 삭제 시 조건 함께)                                     |
| 선택적 추적 참조                    | `SET NULL` | `question_variants.id` ← user_responses.question_variant_id                                                                                                    |
| 옵션 참조                           | `SET NULL` | `priority_rules.recommend_category_id` → product_categories, `decision_runs.category_id` / `.filter_state_id`                                                  |
| 모든 UPDATE                         | `CASCADE`  | 전 테이블 (Prisma 기본값)                                                                                                                                      |

---

## 부록 B. 후속 마이그레이션 / 결정 todo

§0.3 와 함께 정리. 본문 컬럼표가 타겟을 100% 반영하기 위해 필요한 후속 작업.

- [x] **TIMESTAMPTZ 정책 결정** (UTC 저장) → §0.0/§0.1 확정. schema.prisma `@db.Timestamptz()` 일괄 적용 + `ALTER TYPE` 마이그레이션 필요.
- [x] **`updated_at` NULLABLE 정책** → §0.0 확정. schema.prisma 의 `DateTime @updatedAt` 을 `DateTime? @updatedAt @db.Timestamptz()` 로 일괄 변경 + 마이그레이션.
- [x] **`deleted_at` 도입 (소프트 삭제)** → §1 표의 lifecycle 테이블 17개에 `TIMESTAMPTZ NULLABLE` 컬럼 추가. 모든 조회에 `WHERE deleted_at IS NULL` 기본 적용 (Prisma middleware 또는 service 레이어 helper).
- [x] **UUIDv7 도입** → application 측 발급 헬퍼(`uuid` 패키지 `v7()` 또는 동등) 작성. schema.prisma `@default(uuid())` 제거.
- [x] **enum 타입 이름 `<table>_<column>_enum`** → 마이그레이션 SQL `ALTER TYPE "UserRole" RENAME TO users_role_enum;` 식 일괄 처리. 공용 enum 2건 (`comparison_operator_enum`, `condition_state_enum`) 만 의미 단위 이름.
- [x] **인덱스/제약명 명명 규칙** (`pk_`, `uq_`, `idx_`, `fk_`, `chk_`) → Prisma `@@id(map:)`, `@@unique(..., map:)`, `@@index(..., map:)`, `@relation(... , map:)` 명시 + 마이그레이션 SQL `ALTER INDEX ... RENAME` / `ALTER TABLE ... RENAME CONSTRAINT`.
- [ ] `products.attributes` GIN/Expression 인덱스 추가 시점 (catalog 규모 임계치)
- [ ] `user_sessions.segment` 컬럼 도입 여부 결정 (db_modeling.md 동기화)
- [ ] `priority_rules.hold_categories`, `decision_runs.*_snapshot`, `question_filter_mappings.filters` 등 JSONB 컬럼의 Zod 스키마 정의 위치
- [ ] 소프트 삭제 cascading 정책 — 부모 row `deleted_at` 채워졌을 때 자식 row 처리 (예: `users.deleted_at` 발생 시 `devices`/`reaction_reports` 도 같이 마킹할지)

> ☑ 표시는 본 문서 작성 시점의 정책 결정 완료를 의미. 실제 schema.prisma / migration.sql 반영은 후속 마이그레이션 PR 에서 진행.
