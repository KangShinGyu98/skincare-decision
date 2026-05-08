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

## [2026-05-02] (예방) Concern preset과 user_facts.source = concern 우선순위

**증상:** 동일 fact_key에 대해 concern preset과 사용자 직접 답변이 충돌할 수 있음.

**원인:** `user_facts.source = concern`은 초기 선택 상태일 뿐, priority_gate / context 답변이 우선해야 한다.

**해결책:**

- 최신 fact 조회 시 우선순위: `traceback > context > priority_gate > concern`.
- Repository에 `findLatestByFactKey(deviceId, factKey)`를 두고 source 우선순위 정렬을 강제.
- 단순 `ORDER BY created_at DESC`만 쓰지 말 것.

---

<!-- 새 이슈는 여기에 추가 -->
