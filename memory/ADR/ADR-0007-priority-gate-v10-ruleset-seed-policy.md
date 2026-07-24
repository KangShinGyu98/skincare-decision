# ADR-0007 우선순위 게이트 v10 룰셋 시드 정책

## Status

Accepted — 2026-07-23

## Context

`docs/ContentSpec/skincare_ruleset_v10.md`에 5개 카테고리(토너·썬크림·세럼·모이스처라이저·클렌저) 기준으로 질문/룰셋을 새로 설계했다. 이 v10 설계는 기존에 시드된 reference data와 근본적으로 다르다.

- 기존 시드는 질문 40 / 변형 13 / 룰 5로, 점 네임스페이스 키(`life.*`, `context.*`)를 쓰고 `context.skin_type`(9종 피부타입 라벨)을 중심축으로 삼았다. `context.skin_type`·`preference.*`·`context.*` 6종과 `category.selected`는 우선순위 게이트가 아니라 **category-decision(제품 매칭) 자동 필터**(`QUESTION_FILTER_MAPPING_SEEDS`)를 구동했다.
- v10은 피부타입 라벨을 폐기하고 당김(Q-R4)·번들거림(Q-R5) 원시값을 직접 참조하며, 질문 스킴(`Q-*`)이 완전히 다르고, 룰이 약 40개로 늘어난다.
- 평가 엔진(`priority-gate.service.ts`)은 조건을 정수 인덱스(`value Int[]`)로 비교하고, 라벨은 `QuestionVariant.answers`에 위치 정렬로만 저장된다. 티어(T1/T2/T3)는 DB 개념이 아니라 조건 매크로다.

## Decision

1. **기존 질문 계열 reference data는 전량 삭제하고 v10 세트로 재시드**한다. 시드 진입부(`resetQuestionReferenceData`)에서 `priority_rule_conditions → priority_rules → question_visibility_conditions → question_filter_mappings → user_responses → question_variants → questions` 순으로 하드 삭제한다(`user_responses`는 `question`에 `onDelete: Restrict`라 함께 지운다). 제품 카탈로그(카테고리·속성·제품·필터 정의)는 삭제하지 않는다.
2. **category-decision 응답 기반 자동 필터 기능을 제거**한다. `QUESTION_FILTER_MAPPING_SEEDS`를 빈 배열로 둔다. 매트릭스 필터 정의는 수동 선택 필터로만 유지되며, 피부타입/민감도 응답으로 필터가 자동 적용되던 동작은 사라진다(의도된 기능 축소).
3. **질문 `key`는 의미형 dotted key**를 부여한다(`routine.*`, `diagnosis.*`, `goal.*`, `product.*`, `demographic.*`). `Q-*` 문서 코드는 주석으로 병기한다.
4. **성별·나이 질문을 추가**한다. `demographic.gender`(남/여), `demographic.age`(10~15 … 60대 이상, 경계 중복은 26~30·31~40으로 정규화). Q-D3(호르몬 패턴)은 `QuestionVisibilityCondition`으로 **여성에게만 노출**한다. 이를 위해 시드에 `QuestionVisibilityConditionSeed` 타입과 `seedQuestionVisibilityConditions` 로직을 신설했다(기존엔 이 테이블을 시드하지 않았다).
5. **결과 카드 3장 제한을 제거하고 매칭된 룰을 전부 노출**한다. `priority-gate.service.ts`의 조기 return과 공유 스키마 두 곳(`priority-gate.schema.ts`, `priority-gate-responses.schema.ts`)의 `.max(3)`을 제거했다(`min(1)`은 fallback PASS로 유지). 노출 순서는 `sortOrder` 오름차순을 그대로 따른다.
6. **Q-T2(기초 겹 수)는 `GTE [4]`로 시드**한다. 선택지에 5겹이 없어 0-based 인덱스로 "6겹 이상"이 인덱스 4 이상이 되며, 엔진 GTE는 저장 raw 값을 비교하므로 문서의 `GTE [6]`은 오작동한다.

## Consequences

- 재시드는 **파괴적**이다. `prisma:seed` 실행 시 매번 질문/룰/응답 계열이 삭제된 뒤 재생성된다. 실데이터가 있는 환경에서는 주의해야 하며, 개발 환경 전제다(사용자 승인).
- category-decision 흐름은 `context.skin_type` 등 질문과 자동 필터 매핑을 잃는다. 해당 페이지는 기본/수동 필터만으로 동작하며, 자동 필터를 되살리려면 별도 설계가 필요하다.
- v10 티어 매크로가 T1 사용자를 정확히 배제하려면 **Q-D1(`diagnosis.skin_problems`)·Q-D5(`diagnosis.treatment_status`)·Q-R3(`routine.recent_irritation`)가 반드시 응답**되어야 한다. 미응답 시 EXCLUDED veto가 걸리지 않아 T1 사용자에게 T2/T3 룰이 오발동할 수 있다. 이 필수 응답 강제는 시드가 아니라 프론트 응답 흐름에서 보장해야 하며 **본 작업 범위 밖(후속 과제)**이다.
- enum(operator/state/result_type/category)은 신규 값을 도입하지 않아 Prisma/Zod/seed 타입 변경과 DB 마이그레이션이 필요 없었다. 변경은 시드 데이터 + 3장 캡 제거 + visibility 시드 로직에 한정된다.
- 시드 정합성은 `seed-data.spec.ts`의 DB-free 무결성 테스트로 보증한다(변형 답변 수 = 질문 answerValues 수, 조건 인덱스 범위, 비-PASS 룰의 REQUIRED ≥1, 룰 이름/sortOrder 유일성, visibility 참조).
