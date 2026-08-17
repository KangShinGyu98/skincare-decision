# 백엔드 코드 구조 규칙

`backend/` 에 새 코드를 쓰기 전에 읽는다. 여기 적힌 규칙은 전부 **현재 코드에서 실제로 지켜지고 있는 것**이며, 각 규칙마다 근거 파일을 함께 표기했다. 새 규칙을 만들 때는 이 문서를 먼저 고친다.

---

## 0. 폴더 구조 — 도메인 1개 = 폴더 1개

```
backend/src/
├── main.ts, app.module.ts
├── config/                 env-file-path.ts, env.validation.ts
├── prisma/                 prisma.service.ts, prisma.module.ts   (@Global)
├── generated/prisma/       Prisma 7 생성 산출물 (직접 수정 금지)
├── common/                 횡단 관심사만
│   ├── auth/  decorators/  filters/  guards/  http/
│   ├── interceptors/  logger/  middleware/  pipes/  types/
├── modules/                도메인별 폴더
│   └── <kebab-domain>/
│        ├── <name>.controller.ts
│        ├── <name>.service.ts
│        ├── <name>.repository.ts
│        ├── <name>.module.ts
│        └── <name>.{service,controller,repository}.spec.ts
└── seed/
```

- **역할별 최상위 폴더(`controllers/`, `services/`, `repositories/`, `dto/`, `models/`)는 만들지 않는다.** 같은 도메인의 controller·service·repository·module·테스트를 한 폴더에 co-locate 한다.
- `common/` 에는 도메인 로직을 넣지 않는다. guard, filter, interceptor, pipe, middleware, decorator, 공용 타입만.
- `generated/prisma/` 는 `prisma generate` 산출물이다. 손으로 고치지 않는다.

파일명과 클래스명은 1:1로 대응한다.

| 파일                                    | 클래스                            |
| --------------------------------------- | --------------------------------- |
| `product-categories.controller.ts`      | `ProductCategoriesController`     |
| `landing-concern-selections.service.ts` | `LandingConcernSelectionsService` |
| `priority-gate.module.ts`               | `PriorityGateModule`              |

---

## 1. Controller → Service → Repository 단방향

이 세 계층 외의 레이어를 새로 만들지 않는다(YAGNI). 아래는 가장 정석에 가까운 샘플이다.

**Controller** — 검증·컨텍스트 추출·위임만. `backend/src/modules/product-categories/product-categories.controller.ts`

```ts
@Public()
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly service: ProductCategoriesService) {}

  @Get()
  findAll(): Promise<ProductCategoriesResponseDto> {
    return this.service.findAll();
  }
}
```

**Service** — repository 결과를 shared DTO 모양으로 변환. `product-categories.service.ts:5-20`

```ts
@Injectable()
export class ProductCategoriesService {
  constructor(private readonly repository: ProductCategoriesRepository) {}

  async findAll(): Promise<ProductCategoriesResponseDto> {
    const categories = await this.repository.findAll();

    return {
      items: categories.map((category) => ({
        /* ... */
      })),
    };
  }
}
```

**Repository** — 유일하게 `PrismaService` 를 주입받는 계층. `product-categories.repository.ts:1-20`

```ts
import { PrismaService } from 'src/prisma/prisma.service';

export type ProductCategoryRepositoryItem = { id: string; key: string /* ... */ };

@Injectable()
export class ProductCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ProductCategoryRepositoryItem[]> {
    return this.prisma.productCategory.findMany({
      where: { deletedAt: null },
      select: {
        /* ... */
      },
    });
  }
}
```

**금지**

- Controller에서 `PrismaService` 나 Repository 직접 사용 (현재 위반 0건)
- Repository에서 HTTP/DTO 개념을 아는 것 (아래 3번, 5번 참고)
- Service를 거치지 않는 Controller → Repository 호출

---

## 2. DI는 생성자 주입만

- 전부 `constructor(private readonly x: X)` 형태다. `@Inject()` 토큰 주입, 인터페이스/추상 클래스 기반 DI는 **한 건도 없다.** 테스트가 필요하면 `Test.createTestingModule` 의 `useValue` 로 갈아 끼운다(9번).
- 필드명 관례: controller에서는 `service`, service에서는 `repository`. 여러 개를 주입할 때만 구체적인 이름을 쓴다(`sessionEventService`, `userResponsesService` 등 — `priority-gate.controller.ts:21-24`).

---

## 3. 모듈 등록 규칙

`backend/src/modules/product-categories/product-categories.module.ts`

```ts
@Module({
  imports: [PrismaModule],
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService, ProductCategoriesRepository],
})
export class ProductCategoriesModule {}
```

- Repository도 반드시 `providers` 에 등록한다.
- **Repository는 어떤 모듈에서도 `exports` 하지 않는다.** 모듈 내부 전용이다. 다른 모듈이 데이터를 필요로 하면 Service를 export 한다(`priority-gate.module.ts` → `exports: [PriorityGateService]`).
- 만든 모듈은 `backend/src/app.module.ts` 의 `imports` 배열에 등록한다.
- 한 모듈이 여러 도메인 페어를 담을 수 있다 — `admin.module.ts` 는 controller 2 + service 2 + repository 2를 등록한다.

---

## 4. 입력 검증은 Zod 데코레이터 고정

- 요청 검증은 `@ZodBody` / `@ZodQuery` / `@ZodParam` 에 **shared 스키마**를 넘겨서 한다. `ZodValidationPipe` 를 컨트롤러에서 직접 조립하지 않는다.
- `dto/` 폴더도, `class-validator` DTO 클래스도 만들지 않는다. 입출력 타입은 전부 shared의 `z.infer` 결과다.

`backend/src/modules/priority-gate/priority-gate.controller.ts:43-47`

```ts
@Post('responses')
async selectChecklist(
  @Req() request: RequestWithContext,
  @ZodBody(upsertPriorityGateResponsesRequestSchema) body: UpsertPriorityGateResponsesRequest,
): Promise<UpsertPriorityGateResponsesResponse> {
```

검증 실패는 `ZodValidationPipe` 가 `BadRequestException` 으로 변환한다(`common/pipes/zod-validation.pipe.ts:20-30`).

```ts
throw new BadRequestException({
  code: 'VALIDATION_ERROR',
  message: 'Invalid request input',
  details: result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
  })),
});
```

환경변수도 같은 방식으로 Zod 검증한다 — `config/env.validation.ts` 의 `validateEnv` 를 `ConfigModule.forRoot({ validate })` 에 연결한다.

---

## 5. 응답 형태는 인터셉터/필터가 만든다

- **핸들러는 데이터만 반환한다.** 성공 봉투는 `ResponseEnvelopeInterceptor` 가 붙인다.

```jsonc
// 성공 — common/interceptors/response-envelope.interceptor.ts
{ "success": true, "data": { /* 핸들러 반환값 */ }, "meta": { "requestId": "...", "timestamp": "..." } }

// 실패 — common/filters/http-exception.filter.ts
{ "success": false, "error": { "statusCode": 404, "code": "NOT_FOUND", "message": "...", "details": null },
  "meta": { "requestId": "...", "path": "...", "timestamp": "..." } }
```

- 핸들러 반환 타입은 shared의 `*Dto` / `*Response` 타입으로 **명시**한다.
- 에러는 Service/Guard에서 Nest 표준 예외로 던진다. `statusCode`(HTTP 숫자)와 `code`(분기용 문자열)를 분리하고, **custom exception enum/클래스 계층은 의도적으로 만들지 않는다** — 근거와 도입 조건은 [ADR-0003](../../memory/ADR/ADR-0003-api-error-response-policy.md).
- 비즈니스 코드를 붙이려면 예외 객체로 던진다: `throw new BadRequestException({ code: 'SKIN_PROFILE_REQUIRED', message: '...' })`.
- **Repository는 HttpException을 던지지 않는다.** 도메인 전용 Error 클래스를 던지고(`InvalidAdminRuleSortOrderError`, `InvalidAdminRuleConditionError` — `admin-rules.repository.ts:150-163`) Service가 HTTP 예외로 변환한다.

---

## 6. Prisma 경계

- `PrismaService` 는 `PrismaClient` 를 상속하고 `@Global() PrismaModule` 로 제공된다(`prisma/prisma.service.ts`, `prisma.module.ts`).
- Repository는 Prisma row를 그대로 흘려보내지 않는다. `*Record` / `*Item` / `*Input` 타입을 직접 정의해 export 한다 — Prisma 타입이 Service·Controller로 새어 나가지 않게 하는 장치다.

`backend/src/modules/priority-gate/priority-gate.repository.ts:13-30`

```ts
export type QuestionRecord = {
  id: string;
  questionId: string;
  title: string;
  answers: string[];
  uiSection: UiSection;
  sortOrder: number;
  question: { key: string; answerType: QuestionAnswerType; answerValues: number[] };
};
```

- `Prisma` 네임스페이스와 모델 타입은 repository 안에서만 import 한다. **다만 Prisma enum(`generated/prisma/enums`)은 Service가 import해도 된다** — 비즈니스 분기에 필요한 값이라 관례로 허용한다(`priority-gate.service.ts:20-24`).

---

## 7. 인증 / 요청 컨텍스트

- 전역 가드 `AuthGuard`, `PermissionGuard` 가 `APP_GUARD` 로 등록되어 있다(`app.module.ts:53-59`). **모든 엔드포인트는 기본 보호 상태**이므로 공개 API에는 `@Public()` 을 반드시 명시한다.

`backend/src/common/decorators/auth.decorator.ts:8-12`

```ts
/**
 * @Public()         → guest 허용, 모든 Anonymous 요청에 의도적으로 작성한다.
 * @Authenticated()  → 로그인 필요
 * @Permissions(...) → 특정 permission 필요
 */
```

- `requestId` / `deviceId` / `sessionId` / `user` 는 `RequestContextMiddleware` · `DeviceSessionMiddleware` 가 채운다. 핸들러는 `@Req() request: RequestWithContext` 로 받아 `request.context` 에서 읽고, **직접 쿠키를 파싱하지 않는다.**

```ts
const { deviceId, sessionId, user } = request.context;
```

---

## 8. 테스트

- 테스트는 **대상 파일 옆에 co-locate** 한다. `backend/tests/` 같은 별도 폴더는 만들지 않는다(e2e만 `backend/test/`).

| 종류 | 파일명                  | 대상                                          | 실행                                                     |
| ---- | ----------------------- | --------------------------------------------- | -------------------------------------------------------- |
| 단위 | `*.spec.ts`             | service / controller / repository (mock 기반) | `pnpm --filter backend test:unit`                        |
| 통합 | `*.integration-spec.ts` | repository (실제 테스트 DB)                   | `pnpm --filter backend test:integration` (`--runInBand`) |
| e2e  | `test/*.e2e-spec.ts`    | 앱 전체                                       | `pnpm --filter backend test:e2e`                         |

- **테스트 설명(`describe`/`it`)은 한국어로 쓴다.** 예: `'findAll은 repository.findAll 결과를 응답 DTO 형태로 반환한다'`.
- 단위 테스트는 `Test.createTestingModule` + `useValue` mock, mock 타입은 `jest.Mocked<Pick<Repo, 'findAll'>>` 로 필요한 메서드만 좁힌다.

`product-categories.service.spec.ts:5-21`

```ts
describe('ProductCategoriesService', () => {
  let service: ProductCategoriesService;
  let repositoryMock: jest.Mocked<Pick<ProductCategoriesRepository, 'findAll'>>;

  beforeEach(async () => {
    repositoryMock = { findAll: jest.fn() };

    const testingModule = await Test.createTestingModule({
      providers: [
        ProductCategoriesService,
        { provide: ProductCategoriesRepository, useValue: repositoryMock },
      ],
    }).compile();
```

- 통합 테스트는 `process.env['NODE_ENV']='test'` → `ConfigModule.forRoot({ envFilePath: getEnvFilePath(), validate: validateEnv })` 로 테스트 DB에 붙고, `beforeEach` 에서 `TRUNCATE ... RESTART IDENTITY CASCADE` 로 초기화한다. 파일 상단에 검증 목적을 JSDoc 주석으로 남긴다.
- jest 설정은 `backend/package.json` 안에 인라인으로 있다(`rootDir: ".."`). shared는 `moduleNameMapper` 로 소스를 직접 매핑하므로 **테스트는 shared 빌드 없이도 최신 스키마를 본다.**

---

## 9. 새 도메인 하나를 추가할 때의 체크리스트

1. `shared/src/schemas/<domain>.schema.ts` 에 요청/응답 스키마 + 타입 추가 → 배럴 재수출 → shared 빌드 ([shared.md](./shared.md))
2. `backend/src/modules/<kebab-domain>/` 폴더 생성
3. `<name>.repository.ts` — `PrismaService` 주입, `*Record` 타입 export
4. `<name>.service.ts` — repository 주입, shared DTO로 변환
5. `<name>.controller.ts` — `@ZodBody/@ZodQuery/@ZodParam` 검증, 반환 타입 명시, 공개 API면 `@Public()`
6. `<name>.module.ts` — `providers: [Service, Repository]`, 필요한 Service만 `exports`
7. `app.module.ts` 의 `imports` 에 모듈 등록
8. `<name>.service.spec.ts`(단위) + 필요하면 `<name>.repository.integration-spec.ts`(실 DB)

---

## 알려진 예외 (새 코드에서 따라 하지 말 것)

| 항목                                                                          | 현상                                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session.service.ts`, `session-event.service.ts`, `user-responses.service.ts` | repository 없이 Prisma를 직접 쓴다. repository 파일 자체가 없는 인프라성 서비스라 남아 있는 형태이며, **도메인 모듈은 예외 없이 repository를 경유한다.**                                    |
| `modules/landing/`                                                            | 파일은 `landing-concern-selections.*` 인데 모듈만 `landing.module.ts` / `LandingModule` 로 축약되어 있다.                                                                                   |
| `main.ts` 의 전역 `ValidationPipe`                                            | class-validator DTO가 코드에 하나도 없는 잔존 설정이다. 검증은 Zod 데코레이터로만 한다.                                                                                                     |
| `modules/cats/`                                                               | 초기 레퍼런스용 샘플 모듈이다. 실제 도메인 규칙의 근거로 삼지 않는다.                                                                                                                       |
| `CLAUDE.md` 의 레이어 표기                                                    | `Utils(app/lib) → Types(models) → … → Runtime(controllers)` 서술과 `backend/app/services/…`·`backend/tests/…` 예시 경로는 실제 구조와 다르다. 실제 기준은 이 문서다.                        |
| import 경로                                                                   | 상대경로(`../../prisma/prisma.service`)와 `src/` alias가 혼재한다. **아직 통일 규칙이 정해지지 않았다** — 새 파일은 같은 폴더의 기존 스타일을 따르고, 통일이 필요하면 별도 결정으로 다룬다. |
