# ADR-0002 DB 식별자·FK ON DELETE 정책

## Status

Accepted — 2026-05-21

## Context

`docs/Data/db_schema_validation.md` 스키마 점검 중 세 기준(식별자 타입 / enum / FK ondelete)을 재검토하면서 다음이 드러났다.

- `session_events`, `decision_runs` 는 대량 적재되는 append-only 로그/스냅샷인데 PK 가 UUID(16B)였다. 두 테이블의 PK 를 참조하는 inbound FK 가 없고 외부로 노출되지도 않는다.
- `priority_rules.recommend_category_id` 가 `product_categories` 를 `ON DELETE SET NULL` 로 참조해, 카테고리가 삭제되면 ROUTE_CATEGORY 룰이 조용히 NULL 타깃으로 깨질 수 있었다.
- `priority_rule_conditions` 는 부모 룰에 종속된 sub-config 인데 `rule_id` 가 `ON DELETE RESTRICT` 였다.
- `decision_runs.category_id` / `filter_state_id` 가 FK(`SET NULL`)였으나, 스냅샷은 자기완결적이어야 하고 사양상 카테고리·필터상태로 `decision_runs` 를 조회하는 화면이 없다(이력 조회는 `device_id`/`user_id` + `decision_type` + `created_at` 키).

## Decision

1. **식별자 원칙**: 기본은 UUIDv7. 단 **내부 append-only 로그/스냅샷의 PK 는 `BIGINT` identity** 를 쓴다.
   - `session_events.id` → `BIGINT GENERATED ALWAYS AS IDENTITY`
   - `decision_runs.id` → `BIGINT GENERATED ALWAYS AS IDENTITY`
2. **`priority_rules.recommend_category_id`**: `ON DELETE SET NULL` → **`RESTRICT`**.
3. **`priority_rule_conditions.rule_id`**: `ON DELETE RESTRICT` → **`CASCADE`**.
4. **`decision_runs.category_id` / `filter_state_id`**: **FK 제거** (plain 컬럼 유지). 조회 소비처가 없는 단일 인덱스 `idx_decision_runs_category_id`, `idx_decision_runs_filter_state_id` 도 제거.

## Alternatives Considered

- **`products.id` 도 BIGINT 로?** → 보류. products 는 엔티티 + inbound FK(`product_ingredients`, `reaction_report_products`) + API/URL 노출 대상이라 전환 파급·노출 트레이드오프가 다르다. UUIDv7 유지.
- **`user_responses → questions` 를 CASCADE 로?** → 기각. questions 는 soft delete 라 hard delete 가 비정상이며, CASCADE 면 질문 오삭제 시 사용자 응답 이력이 통째로 사라진다. RESTRICT 유지.
- **`decision_runs.category_id` 를 RESTRICT 로만 변경?** → 기각. 카테고리로 `decision_runs` 를 조회하는 화면이 없어 join 보장 가치가 없고, 스냅샷에 reference 생명주기를 묶을 이유가 없다. FK 제거가 더 일관적.

## Consequences

- `db_schema_validation.md`: §0.0 식별자 규약에 BIGINT 예외, §0.1 매핑표에 BigInt 행 추가. 부록 A(FK ON DELETE 정책표) 갱신 — `recommend_category_id` 를 RESTRICT 행으로, `priority_rule_conditions` 를 CASCADE 행으로 이동, SET NULL 행에서 `decision_runs` 2건 제거.
- `db_modeling.md`(1:1 동기 문서)에도 동일 변경 반영(두 id BIGINT, `decision_runs` 두 FK 제거, 식별자 규약).
- `decision_runs` 스냅샷의 무결성 단일 진실은 `applied_filters_snapshot` 등 JSONB 컬럼이다. `category_id`/`filter_state_id` 는 "당시 값" 기록용 plain 컬럼.
- Prisma 표기: BIGINT identity 는 `BigInt @id @default(autoincrement())`. UUIDv7 은 기존대로 application 발급.
- enum 기준은 이번 점검에서 변경 사항 없음(기존 `<table>_<column>_enum` 규칙 + 공용 2건 유지).
