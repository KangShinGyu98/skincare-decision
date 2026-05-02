# backend/ — NestJS + Prisma 백엔드 (구조 사양)

> 본 폴더는 EXECUTION_PLAN.md Phase 2에서 `nest new .`으로 초기화된다.
> **이 파일은 init 이전의 사양 문서이자, init 이후에도 유지되는 진입 규칙**이다.

## 기술 스택

- TypeScript 5 + NestJS 10
- Prisma 5 + PostgreSQL 16
- Redis 7 (`ioredis` + `@nestjs/cache-manager`)
- Zod (DTO 검증, `nestjs-zod`)
- Pino (logging, `nestjs-pino`)
- Vitest 또는 Jest (NestJS 기본 Jest 권장)

## 폴더 구조 (목표)

```
backend/
├─ AGENTS.md              ← 본 파일
├─ CLAUDE.md              ← 백엔드 전용 황금 원칙
├─ README.md              ← 실행/테스트 명령
├─ prisma/
│  ├─ AGENTS.md
│  ├─ schema.prisma       ← docs/db_modeling.md 25개 테이블 1:1
│  ├─ migrations/
│  └─ seed.ts             ← priority_rules / fact_definitions / product_filter_mappings 시드
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ lib/                ← 공유 유틸 (date, json, pagination, error)
│  ├─ types/              ← Zod schema, DTO, 공용 enum
│  │  └─ product-attributes.ts  ← 카테고리별 attribute discriminated union
│  ├─ config/             ← env loader, Prisma/Redis 모듈
│  ├─ repositories/       ← Prisma 호출만 (Service에서만 호출)
│  ├─ services/           ← 도메인 로직 (priority/filter mapping/traceback)
│  ├─ providers/          ← 외부 API/캐시 어댑터
│  ├─ controllers/        ← HTTP 라우팅 (Service만 호출)
│  └─ modules/            ← Nest 모듈 묶음 (Identity / Facts / Priority / Catalog / Matrix / Traceback / Events)
├─ test/                  ← e2e (supertest)
├─ .env.example
├─ docker-compose.yml     ← 로컬 Postgres/Redis
├─ tsconfig.json
└─ package.json
```

## 도메인 모듈 (Nest module 단위)

| 모듈        | 책임                                                      | 주요 테이블                                                     |
| ----------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| Identity    | device/user/session 발급·병합                              | users, devices, user_sessions, session_events                   |
| Facts       | fact_definitions, context_questions, user_facts            | fact_definitions, context_questions, question_visibility_conditions, user_facts |
| Priority    | priority_rules 평가, decision_runs(PRIORITY_GATE) 저장     | priority_rules, priority_rule_conditions, decision_runs         |
| Catalog     | brands, product_categories, products, ingredients          | brands, product_categories, category_attribute_definitions, products, ingredients, product_ingredients, ingredient_groups, ingredient_group_members |
| Matrix      | product_filter_mappings + filter_state + Matrix 조회       | product_filter_mappings, product_matrix_filter_states, decision_runs |
| Traceback   | reaction_reports, suspected_causes, avoidance_rules        | reaction_reports, reaction_report_products, suspected_causes, avoidance_rules |
| Events      | session_events 수집                                        | session_events                                                  |

## 황금 원칙 (백엔드)

1. **Controller는 Service만 호출, Service는 Repository만 호출**. Controller에서 Prisma 직접 사용 금지.
2. **Repository는 Prisma 클라이언트 wrapper**. 도메인 로직 금지.
3. **`products.attributes` JSONB는 Service 레이어에서 Zod로 검증 후 Repository에 전달**. Controller에서 `any` 그대로 받지 말 것.
4. **모든 endpoint는 `x-device-id` 헤더 또는 `device_id` cookie 필수**. 미인증이어도 device 신원은 강제.
5. **append-only 테이블(user_facts, decision_runs, session_events)는 update 금지** — 새 row INSERT.
6. **로그인 시 자동 병합(Eager Merge)**은 트랜잭션 내에서 5개 테이블을 일괄 처리. Identity 모듈에 단일 메서드로.
7. **모든 외부 API 호출은 `providers/`에 어댑터로 격리**. Service에서 직접 fetch 금지.
8. **Pino logger 사용 — `console.log` 금지**.

## 테스트 전략

- 단위: Service 레이어 우선 (Repository는 Prisma 모킹 없이 testcontainer Postgres 사용 권장)
- 통합: Module 단위 e2e (`/priority-gate/evaluate`, `/product-matrix` 흐름)
- Seed 데이터는 테스트 fixture와 동일 구조

## 진입 규칙

1. 새 모듈을 만들 때 본 파일의 "도메인 모듈" 표를 갱신.
2. Prisma schema 변경 시 [prisma/AGENTS.md](prisma/AGENTS.md)와 `docs/db_modeling.md`를 함께 갱신.
3. 새 endpoint는 `memory/api_contracts.md`에 등록.
4. 환경변수는 `.env.example`만 커밋, 실제 값은 `.env`에 저장(gitignore).
5. 의존성 추가 시 사유를 `memory/project_decisions.md`에 기록.
