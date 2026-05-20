# 프로젝트 목적

> **"더 많은 추천이 아닌 더 적은 선택"** — 사용자의 피부·루틴·고민에서 출발해 *지금 사야 하는지*부터 정리하고, 필요할 때만 6개 카테고리(토너·선크림·세럼·립케어·로션크림·클렌저) 안에서 후보를 좁혀 보여주는 웹 서비스.

---

# 기술 스택

| 영역           | 스택                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| Backend API    | TypeScript · NestJS · Prisma                                               |
| Database       | AWS RDS PostgreSQL 16 (products.attributes는 JSONB)                        |
| Cache          | AWS ElastiCache Redis 7                                                    |
| Frontend Web   | Next.js App Router · React · TypeScript                                    |
| Rendering      | SSR · SSG · ISR                                                            |
| Validation     | Zod (FE 입력, BE DTO ↔ Prisma 모델 contract)                               |
| 상태 관리      | TanStack Query · Zustand                                                   |
| UI             | Tailwind CSS · shadcn/ui                                                   |
| Storage        | AWS S3                                                                     |
| CDN / Edge     | CloudFront                                                                 |
| Infra          | Docker · AWS ECS Fargate · ECR · ALB · RDS · ElastiCache · S3 · CloudFront |
| Domain / HTTPS | Route 53 · ACM                                                             |
| CI/CD          | GitHub Actions → ECR → ECS Fargate 배포                                    |

---

# Golden Rules

1. **직접 만든 헬퍼보다 공유 유틸리티 패키지 우선 사용**
   - 불변 조건(invariant)은 중앙화한다.

2. **레이어 경계 준수**
   - Controller → Service → Repository 순서만 허용
   - Controller에서 DB 직접 접근 금지
   - UI 컴포넌트에 비즈니스 로직 금지

3. **작업 범위를 작게 유지한다**
   - 하나의 채팅은 하나의 작업 단위만 담당한다.
   - 작업 결과는 목적 단위 branch와 작은 코드 단위 commit으로 분리한다.
   - 사람은 commit 흐름만 보고 의도와 변경 범위를 이해할 수 있어야 한다.

4. **승인된 설계만 구현한다**
   - 불확실한 도메인 정책은 임의로 결정하지 않는다.
   - 장기 설계 변경은 사용자 승인 또는 ADR 이후 진행한다.

5. **워크플로우에 따라서 작업한다.**
   - 작업 중 계획은 임시 파일로 관리하고 작업 완료 후 삭제한다.

6. **컨텍스트를 깨끗하게 유지한다.**
   - 기록물은 장기적으로 유지해야 하는 결정 사항만 저장한다.
   - 결정 사항은 ADR 형식의 md 파일로 작성하고 ADR 폴더에 저장한다.
   - 기존 결정 문서에 append 하지 않는다.
   - 새로운 결정은 항상 새로운 ADR 파일로 작성한다.
   - 세션 로그, 임시 계획, 추론 과정은 영구 기록으로 남기지 않는다.

7. **관련 문서만 선택적으로 읽는다**
   - 모든 memory 문서를 항상 읽지 않는다.

## 레이어드 아키텍처 (OpenAI code layer 기반)

```
[Backend]
Utils(app/lib) → Types(models) → Config → Repo(repositories) → Service → Providers → Runtime(controllers)

[Frontend]
Utils → Types → Config → Repo(api) → Service(hooks) → Runtime(store) → UI(components) → AppWiring(app)
```

---

# 메모리 관리 규칙

1. 메모리는 memory 폴더에 ADR 폴더와 내부 md 파일, external_apis.md, task_plan.md로 구성되어있다.
2. ADR은 장기적으로 유지해야 하는 결정 사항만 기록한다.
   - 하나의 작업(채팅)에서 결정 사항이 발생했을 때만 작성한다.
   - 결정 사항이 없다면 작업이 있었어도 ADR을 작성하지 않는다.
   - 작업당 1개의 ADR 파일을 생성하고 기존의 파일에 append 하지 않는다.
   - ADR은 AI 컨텍스트 주입용이 아니라 사람이 읽고 검토하기 위한 문서이다.
   - AI는 필요한 경우에만 관련 ADR을 선택적으로 읽는다.
3. external_apis.md는 외부 API 인터페이스 계약만 기록한다.
   - task_plan.md 는 작업 중 사용하는 임시 파일이다.
   - 작업 시작 시 생성하고 작업 완료 후 삭제한다.
   - permanent memory 로 유지하지 않는다.
   - 현재 작업의 current state 역할을 함께 수행한다.

### task_plan.md 파일 구성 요소

- 목표
- 범위 (작업 범위)
- 파일 범위
  - read
  - write
- current state

---

# 완료 조건

- 작업 범위(scope)가 명확하게 종료되었다.
- 사람이 diff와 commit 흐름을 검토했다.
- 최종적으로 branch가 merge 가능한 상태이다.
- branch가 승인 및 merge되면 작업 완료로 간주한다.
- 사람의 명시적인 작업 종료 선언 또는 merge 지시가 있어야 작업 완료로 간주한다.

---

# 금지사항

- AI는 장기 설계를 생성하지 않고, 승인된 설계를 구현한다.

---

# 작업 워크플로우

| 주체 | 작업                                     | 사람의 역할                  | AI - 사람 상호작용                             |
| ---- | ---------------------------------------- | ---------------------------- | ---------------------------------------------- |
| 사람 | 새 채팅 + 시작 프롬프트 입력             | 시작 프롬프트 양식 작성      | 새 채팅                                        |
| AI   | git branch 생성                          | branch 목적 검토 및 승인     | branch 이름 제안 및 확인                       |
| AI   | AGENTS.md, CLAUDE.md 확인                |                              |                                                |
| AI   | task_plan.md 초안 작성                   | 검토                         | task_plan 검토 요청                            |
| AI   | 실제 코드 작성 및 코드 단위 commit       | 필요 시 설계 검토            | 설계 drift, 위험 변경, ADR 필요 여부 확인 요청 |
| AI   | ADR 작성 (필요 시)                       | 장기 결정 승인               | 새 ADR 파일 생성 및 결정 내용 저장             |
| 사람 | AI commit 내역 확인 및 branch merge 승인 | diff, commit 흐름, 설계 검토 | merge 승인 또는 수정 요청                      |

---

## task_plan.md 파일 구성 요소

| 항목          | 의미              | 예시                                                                                                                                                                                                                                                                                                       |
| ------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 목표          | 왜 하는가         | Product 생성 API 구현                                                                                                                                                                                                                                                                                       |
| 범위          | 무엇을 하는가     | - ProductService.create 구현<br>- DTO validation 연결<br>- Product 생성 unit test 추가<br><br>이번 작업에서 하지 않는 것:<br>- Controller 구현<br>- DB schema 변경<br>- Frontend 수정                                                                                                                       |
| 파일 범위     | 어디를 건드리는가 | read:<br>- backend/app/services/product.service.ts<br>- backend/app/repositories/product.repository.ts<br>- backend/app/dto/create-product.dto.ts<br>- memory/ADR/ADR-0001-product-barcode-policy.md<br><br>write:<br>- backend/app/services/product.service.ts<br>- backend/tests/product.service.spec.ts |
| current state | 현재 작업 상태    | - 관련 코드 탐색 완료<br>- DTO 구조 확인 완료<br>- service 구현 진행 중                                                                                                                                                                                                                                     |
