# ADR-0008 무료 인프라 전환과 Postgres 세션 저장

## Status

Accepted — 2026-11-12

ADR-0004 의 결정 중 "세션 저장소는 Redis" 부분을 대체한다. 쿠키 2개, opaque token, sha256 hash, 30분 sliding, 로그인 시 rotation 은 그대로 유지한다.

## Context

AWS 구성(ECS on EC2 · ALB · NAT · RDS · ElastiCache)은 크레딧을 빼면 월 약 $112 가 든다. 실사용자는 0명이고, 크레딧은 소진되면 끝나는 프로모션 크레딧이다.

비용의 대부분은 트래픽과 무관한 고정비(NAT, ALB, RDS, ElastiCache)다. 서비스 규모가 커질 때까지는 고정비가 없는 구성이 맞다.

Redis 는 세션 저장 한 가지 용도로만 쓰고 있었다(`get` / `set EX` / `del`).

## Decision

1. **배포는 Vercel** 로 한다. 프론트(`frontend/`)와 백엔드(`backend/`)를 각각 Vercel 프로젝트로 둔다. NestJS 는 앱 전체가 Vercel Function 하나로 올라가므로 middleware / guard / interceptor 구조는 바꾸지 않는다.
2. **DB 는 Supabase Postgres** 로 옮긴다. 런타임은 Transaction pooler(6543), migration 은 Session pooler(5432) 주소를 쓴다.
3. **Redis 를 제거하고 세션을 Postgres `user_sessions` 에 저장한다.**
   - `token_hash`(sha256, unique) 와 `expires_at` 컬럼을 추가한다.
   - 유효 판정은 `token_hash` 일치 + `expires_at > now()` + `deleted_at IS NULL` 이다.
   - sliding 연장은 요청마다 `expires_at` 을 갱신한다(조회와 연장을 `UPDATE ... RETURNING` 1번으로 처리).
   - 로그아웃과 rotation 은 row 를 지우지 않고 `token_hash` 를 `NULL` 로 떼어 낸다. row 는 분석/이력용으로 남는다.
   - roles / email 은 Redis 스냅샷 대신 `users` join 으로 읽는다. 권한 변경이 다음 요청부터 반영된다.
4. **프론트와 API 는 같은 도메인을 유지한다.** Next 의 `rewrites` 가 `/api/*` 를 백엔드 프로젝트로 프록시한다. 쿠키가 프론트 도메인에 심기므로 `SameSite=Lax` 쿠키 설계와 Google OAuth callback URL 을 바꾸지 않는다.
5. **Supabase 무료 플랜의 비활성 일시정지는 Vercel Cron 으로 막는다.** `GET /api/health/db` 가 `SELECT 1` 을 보내고, cron 이 하루 3번 호출한다(Hobby 플랜은 cron 하나당 하루 1번이라 3개를 둔다).
6. **DNS 는 Cloudflare** 로 옮긴다(Route 53 호스팅존 제거, 도메인 등록은 유지).
7. Vercel 의 NestJS 런타임은 tsconfig path alias(`src/...`)를 해석하지 못하는 문제가 보고되어 있어, 배포되는 코드의 import 는 상대 경로로 쓴다. 테스트 파일은 예외다.

## Consequences

- 고정비가 0 이 된다. 남는 비용은 도메인 갱신비뿐이다.
- ADR-0004 의 "인증의 source of truth 는 Redis, `user_sessions` 는 분석용 dimension" 은 더 이상 맞지 않는다. `user_sessions` 가 둘 다를 맡는다.
- 요청당 DB 쿼리가 늘어난다(device upsert 1 + 세션 연장 1 + 인증 조회 1). Vercel Function 리전(`icn1`)과 Supabase 리전(서울)을 맞춰야 한다.
- 오래 쉬었다가 들어오는 첫 요청은 Function cold start 만큼 느리다.
- 만료된 세션 row 는 자동으로 지워지지 않는다. 지금도 익명 세션마다 row 가 생기므로 증가 속도는 같지만, Supabase 무료 플랜의 DB 용량(500MB)을 기준으로 정리 정책이 필요해질 수 있다.
- Vercel Hobby 플랜은 비상업용이다. 수익화 시점에 유료 전환을 다시 검토한다.
- CI/CD 는 Vercel Git 연동으로 바뀐다. GitHub Actions ECS 배포 workflow 와 Redis 용 compose 는 삭제했다.
- S3 / CloudFront 는 코드에서 아직 쓰지 않으며 이번 결정의 범위 밖이다. 이미지 업로드를 구현할 때 따로 결정한다.

## 검토했으나 채택하지 않은 안

- **Oracle Cloud 무료 VM 에 컨테이너 그대로**: 코드 변경이 가장 적지만 무료 범위가 2 OCPU / 12GB 로 줄었고, 인스턴스 확보와 유휴 회수 위험이 있다.
- **Upstash Redis 로 세션 유지**: 세션 코드 변경이 없지만 관리할 서비스가 하나 늘고, 요청당 명령 2개가 무료 한도(월 50만)를 소모한다.
- **Lightsail**: 3개월 체험 후 유료다.
- **Neon**: 용량은 더 크지만(1GB) 쉬는 동안 compute 가 꺼져 첫 요청이 느리다. Supabase 는 keep-alive 만 있으면 항상 켜져 있다.
