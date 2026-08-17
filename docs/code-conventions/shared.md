# shared 패키지 코드 구조 규칙

`shared/` 는 프론트엔드와 백엔드가 **같은 API 계약을 보게 만드는 유일한 장치**다. 여기 적힌 규칙은 전부 현재 코드에서 실제로 지켜지고 있는 것이며, 각 규칙마다 근거 파일을 함께 표기했다.

---

## 0. 구조

```
shared/
├── package.json          @skincare-decision/shared, "type": "module", private
├── tsconfig.json         루트 tsconfig.base.json 확장, outDir ./dist
└── src/
    ├── index.ts          export * from './schemas/index.js';   (1줄)
    └── schemas/
        ├── index.ts      배럴 — 스키마 파일 전체 재수출
        └── <kebab-domain>.schema.ts   (현재 10개)
```

현재 `types/`, `constants/` 폴더는 없다. **타입은 스키마 파일 안에서 `z.infer` 로 함께 export** 한다. 도메인 상수를 공유해야 하는 상황이 실제로 생기기 전까지 폴더를 미리 만들지 않는다.

---

## 1. FE/BE 공용 계약은 여기에만 존재한다

- 요청/응답 스키마는 `shared/src/schemas/<kebab-domain>.schema.ts` 하나에만 둔다.
- 프론트엔드에는 도메인 zod 스키마를 만들지 않는다(`frontend/src` 의 `from 'zod'` 는 `lib/api.ts` 한 곳뿐).
- 백엔드에는 `dto/` 폴더나 class-validator DTO 클래스를 만들지 않는다. DTO 타입은 shared 스키마의 `z.infer` 결과다.

---

## 2. 스키마와 타입은 짝으로, 바로 아래에

`shared/src/schemas/product-category.schema.ts:3-21`

```ts
export const productCategoryItemSchema = z
  .object({
    id: z.uuid(),
    key: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable(),
    sortOrder: z.number().int(),
  })
  .strict();

export type ProductCategoryItemDto = z.infer<typeof productCategoryItemSchema>;
```

- 객체 스키마는 **`.strict()` 를 붙인다** — 계약에 없는 필드가 조용히 통과하지 않게 한다.
- `export const xxxSchema` 바로 다음 줄에 `export type XxxDto = z.infer<typeof xxxSchema>` 를 둔다. 타입만 따로 모아 두지 않는다.
- 런타임 검증이 필요 없는 파생 응답은 zod 없이 type alias로 정의해도 된다(`landing.schema.ts:11-13`).

### 네이밍

| 대상       | 스키마                   | 타입                                       |
| ---------- | ------------------------ | ------------------------------------------ |
| 요청 body  | `<action>BodySchema`     | `<Action>BodyDto` / `<Action>Request`      |
| 쿼리스트링 | `<action>QuerySchema`    | `<Action>Query`                            |
| path param | `<action>ParamSchema`    | `<Action>Param`                            |
| 응답       | `<action>ResponseSchema` | `<Action>ResponseDto` / `<Action>Response` |
| 값 객체    | `<noun>Schema`           | `<Noun>Dto`                                |

---

## 3. 배럴은 shared 에만 허용한다

- 프론트엔드에는 배럴 파일이 0개다. **shared 만 예외**로 배럴을 쓴다.
- 새 스키마 파일을 만들면 `shared/src/schemas/index.ts` 에 반드시 재수출한다. 빠뜨리면 소비 측에서 import할 수 없다.
- ESM/NodeNext 설정이므로 **상대 import에 `.js` 확장자를 붙인다.**

`shared/src/schemas/index.ts`

```ts
export * from './cat.schema.js';
export * from './auth.schema.js';
export * from './product-category.schema.js';
// ...
```

스키마끼리 참조할 때도 마찬가지다 — `admin-rule.schema.ts:2`

```ts
import { priorityGateResultTypeSchema, questionAnswerTypeSchema } from './priority-gate.schema.js';
```

---

## 4. import 경로는 `@skincare-decision/shared/schemas` 로 고정

`shared/package.json` 의 `exports` 는 서브패스를 **하나만** 열어 둔다.

```json
"exports": {
  ".":        { "types": "./dist/index.d.ts",         "default": "./dist/index.js" },
  "./schemas":{ "types": "./dist/schemas/index.d.ts", "default": "./dist/schemas/index.js" }
}
```

- 소비 측(FE 14곳, BE 17곳)은 전부 `@skincare-decision/shared/schemas` 를 쓴다. 루트 import, `shared/src/...` 딥 경로 import는 0건이며 **개별 스키마 파일 직접 import는 exports 설정으로 막혀 있다.**
- 값(스키마 객체)과 타입은 분리해서 가져온다. `backend/.../landing-concern-selections.controller.ts:2-6`

```ts
import {
  selectLandingConcernBodySchema,
  type SelectLandingConcernBodyDto,
  type SelectLandingConcernResponseDto,
} from '@skincare-decision/shared/schemas';
```

- 프론트 컴포넌트는 대부분 `import type` 만 하고, 런타임 스키마 값이 필요한 곳은 `lib/api.ts` 와 폼 검증뿐이다.

---

## 5. 빌드 순서

- FE/BE는 `dist/` 를 소비한다. **스키마를 고쳤으면 shared를 먼저 빌드한다.**

```bash
pnpm --filter @skincare-decision/shared build
```

- 예외: 백엔드 jest는 `moduleNameMapper` 로 `shared/src` 소스를 직접 매핑하므로(`backend/package.json` 의 `jest.moduleNameMapper`) **테스트는 빌드 없이 최신 스키마를 본다.** 테스트는 통과하는데 dev 서버에서 타입이 안 맞으면 shared 빌드를 의심한다.

---

## 6. 스키마를 바꿀 때의 순서

1. `shared/src/schemas/<domain>.schema.ts` 수정 (`.strict()` + `z.infer` 타입 동반)
2. 새 파일이면 `shared/src/schemas/index.ts` 에 재수출
3. `pnpm --filter @skincare-decision/shared build`
4. 백엔드: controller의 `@ZodBody/@ZodQuery/@ZodParam` 인자와 반환 타입 갱신 ([backend.md](./backend.md))
5. 프론트: `lib/api.ts` 의 `handleResponse(..., schema)` 인자와 반환 타입 갱신 ([frontend.md](./frontend.md))
6. 타입 체크: `pnpm typecheck`

---

## 7. 의존성 설치 위치

공용/FE/BE/루트 의존성 설치 규칙은 루트 [`CLAUDE.md`](../../CLAUDE.md) 의 "모노레포 설정 파일 관리 규칙" 을 따른다. shared 에는 계약 표현에 필요한 것만 넣는다 — 현재 런타임 의존성은 `zod` 하나다.
