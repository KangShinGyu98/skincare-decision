# backend/prisma/ — Prisma schema, migrations, seed

> `docs/db_modeling.md`의 25개 테이블을 1:1로 옮겨 담는다.
> schema 변경 → migration 생성 → seed 갱신 → `docs/db_modeling.md` 동기화.

## 파일

| 파일                  | 역할                                                                |
| --------------------- | ------------------------------------------------------------------- |
| schema.prisma         | 모델 정의 (`@@map`으로 snake_case 테이블명 강제)                    |
| migrations/           | `prisma migrate dev` 산출물                                         |
| seed.ts               | priority_rules / fact_definitions / context_questions / product_filter_mappings / brands / categories / sample products |

## 테이블 매핑 가이드

- 25개 테이블은 `docs/db_modeling.md` 기준. **추가/삭제 전에 명세 갱신 필수**.
- `products.attributes`, `session_events.payload`, `user_facts.value`, `decision_runs.input_snapshot|applied_filters_snapshot|result_snapshot`, `priority_rules.hold_categories` 등은 `Json` 타입 사용.
- enum은 Prisma enum으로 정의(`ENUM('STOP','HOLD','CAUTION','PASS','ROUTE_CATEGORY')` → `enum PriorityResultType {...}`).
- Composite unique: `product_ingredients (product_id, ingredient_id)` UNIQUE 등 명세대로 반영.
- Cascade는 명세에 없으면 default(`Restrict`). `users` 삭제는 정책 미정 — 결정 전까지 막아둘 것.

## 마이그레이션 규칙

1. 새 마이그레이션은 의미 있는 이름(`add_avoidance_rules_index`)으로.
2. JSONB 컬럼에 GIN 인덱스가 필요하면 raw SQL 마이그레이션 추가:
   ```sql
   CREATE INDEX products_attributes_gin ON products USING GIN (attributes);
   ```
3. 운영 DB 마이그레이션 전에 staging에서 실행.
4. `prisma db push`는 **로컬 실험에만** 사용. 정식은 `prisma migrate dev`/`deploy`.

## seed 규칙

- seed는 idempotent해야 한다(같은 키는 upsert).
- priority_rule_conditions / question_visibility_conditions는 fact_definitions 시드 이후 실행.
- 샘플 products는 6개 카테고리에 각 5개 이상 (Matrix 화면 시각 확인용).
- seed 데이터의 출처는 `docs/matching_rules_revised.md` 표를 그대로 따른다.

## 진입 규칙

1. schema 변경 시 `docs/db_modeling.md`도 같은 PR에서 갱신.
2. 새 enum/JSON 구조는 `backend/src/types/` Zod schema와 동기화.
3. 마이그레이션 생성 후 `pnpm run prisma:format`으로 schema 정렬.
