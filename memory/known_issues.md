# 알려진 이슈 및 해결 패턴

> 버그를 발견하거나 해결하면 이 파일에 기록하세요.
> 형식: `## [YYYY-MM-DD] 이슈 제목` → 증상 → 원인 → 해결책.

---

## [2026-05-02] (예방) Prisma JSON 타입 + 카테고리별 attribute 검증

**증상:** 아직 미발생. EXECUTION_PLAN Phase 2 Prisma 도입 시 발생 가능.

**원인:** Prisma의 `Json` 타입은 unknown으로 풀린다. `products.attributes`에 잘못된 키가 들어가도 컴파일 시점에 막을 수 없음.

**해결책:**

- `backend/src/types/product-attributes.ts`에 카테고리별 Zod schema(discriminated union) 정의.
- Service 레이어에서 INSERT/UPDATE 직전에 `parse()`로 검증.
- Repository는 검증된 값만 받도록 시그니처 강제.
- 마이그레이션에 GIN 인덱스 추가:
  ```sql
  CREATE INDEX products_attributes_gin ON products USING GIN (attributes);
  ```

---

## [2026-05-02] (예방) Concern preset과 user_responses.source = concern 우선순위

**증상:** 동일 question_id에 대해 concern preset과 사용자 직접 답변이 충돌할 수 있음.

**원인:** `user_responses.source = concern`은 초기 선택 상태일 뿐, priority_gate / context 답변이 우선해야 한다.

**해결책:**

- `user_responses`는 question별 current-state이므로 직접 답변이 들어오면 같은 row를 UPDATE한다.
- concern preset이 이미 있는 row에 priority_gate/context 답변이 들어오면 `source`, `value`, `updated_at`을 직접 답변 기준으로 갱신한다.
- 변경 전/후 값은 `session_events` payload에 남기고, rule 평가 시점의 입력 묶음은 `decision_runs.input_snapshot`에 남긴다.

---

<!-- 새 이슈는 여기에 추가 -->

## [2026-05-09] 상위 사용자 폴더 `node_modules`가 backend Jest 실행을 오염

**증상:** `pnpm --filter backend run test` 또는 `pnpm exec jest`가 `TypeError: Cannot read properties of undefined (reading 'testEnvironmentOptions')`, `0 of 1 total`, 잘못된 runner path(`C:\Users\rkdtl\node_modules\...`)를 출력하며 비정상 동작했다.

**원인:** 현재 머신의 상위 경로 `C:\Users\rkdtl\node_modules`에 Jest 27 계열 패키지가 존재한다. 일반 `jest` / `jest-cli` 바이너리는 `import-local`과 Node module resolution 때문에 workspace-local Jest 29 대신 상위 패키지를 일부 섞어 사용했다.

**해결책:**

- [backend/run-local-jest.cjs](../backend/run-local-jest.cjs)로 로컬 pnpm store의 `jest-cli/build/index.js`를 직접 실행한다.
- backend 스크립트는 `jest` 대신 `node ./run-local-jest.cjs --config ...`를 사용한다.
- `backend/jest.config.js`, `backend/test/jest-e2e.config.js`에서 runner / testRunner / testSequencer / testEnvironment를 workspace-local 패키지로 명시한다.
