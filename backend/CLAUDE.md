# backend/CLAUDE.md — 백엔드 전용 컨텍스트

> 루트 [../CLAUDE.md](../CLAUDE.md)의 황금 원칙을 우선하고, 본 파일은 백엔드 추가 규칙만 담는다.

## 레이어 호출 규약

```
HTTP → Controller → Service → Repository → Prisma → PostgreSQL
                       ↘ Provider → Redis / 외부 API
```

- Controller: Zod로 입력 파싱 → Service 호출만. 비즈니스 로직 금지.
- Service: 도메인 로직, 트랜잭션 경계, Repository/Provider 조합.
- Repository: Prisma 호출만. 매개변수는 typed, 결과는 도메인 모델로 변환.
- Provider: Redis, 외부 API 등 IO 어댑터. 인터페이스 분리.

## 명명 규칙

- 파일: `kebab-case.ts` (예: `priority-rule.repository.ts`)
- 클래스: `PascalCase` (예: `PriorityRuleService`)
- DTO/Zod schema: `xxxRequestSchema` / `xxxResponseSchema` + 추론 타입 `XxxRequest`
- Prisma model: `snake_case` 테이블 + Prisma `@@map`로 명시 (DB와 1:1)

## 트랜잭션 가이드

- 신원 병합(로그인): 단일 트랜잭션으로 5개 테이블(devices, user_sessions, user_facts, decision_runs, reaction_reports, avoidance_rules, product_matrix_filter_states) 일괄 업데이트.
- Priority 평가 + decision_runs 저장: 단일 트랜잭션.
- Product Matrix 조회 후 decision_runs 저장: 조회는 read-committed, snapshot 저장은 별도 트랜잭션.

## 캐시 전략

| 키                                                          | TTL    | 무효화                                  |
| ----------------------------------------------------------- | ------ | --------------------------------------- |
| `facts:definitions:v1`                                      | 1h     | 시드 재실행 시 수동 flush               |
| `facts:questions:{screen}:v1`                               | 1h     | 같음                                    |
| `categories:list:v1`                                        | 24h    | 같음                                    |
| `products:matrix:{categoryKey}:{filterStateHash}`           | 5m     | filter_state 변경 시 자동 미스          |
| `priority:rules:active:v1`                                  | 1h     | 시드 재실행 시 수동 flush               |

## 보안

- CORS는 `frontend` 도메인만 허용 (env로 관리)
- `x-device-id`는 cookie와 동기화. signed cookie 권장.
- Rate limit: `@nestjs/throttler` 기본 20 req/min/device
- 어드민 endpoint는 `users.role = ADMIN` 필수 (별도 모듈)

## 절대 하지 말 것

- Controller에서 Prisma 직접 호출
- `products.attributes`를 `any`로 받기
- `decision_runs` / `user_facts`를 UPDATE
- service 레이어에서 `console.log` (대신 Pino logger 주입)
- 시크릿을 `.env.example`에 적기
