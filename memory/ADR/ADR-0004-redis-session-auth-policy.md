# ADR-0004 Redis Session 인증 정책

## Status

Accepted — 2026-06-11

## Context

기존 JWT access token 인증은 `device_id` / `session_id` cookie 와 수명 모델이 달라 request context 동기화 문제가 생겼다.

- session cookie 는 30분 sliding 으로 연장될 수 있지만, JWT 는 발급 후 자체 만료 시각을 가진다.
- 반대로 JWT 는 유효하지만 session cookie 가 만료되어 새 `user_sessions` row 가 생성될 수 있다.
- middleware 는 device/session cookie 를 처리하고, guard 는 JWT 를 처리하므로 `user_sessions.user_id` 연결 시점이 불명확해진다.

현재 서비스에서 필요한 것은 장기 refresh-token 구조가 아니라, 브라우저 활동 세션과 로그인 상태가 같은 수명 모델을 공유하는 단순한 서버 세션이다.

## Decision

1. JWT access token 인증을 중단하고 Redis-backed opaque session 인증으로 전환한다.
2. 쿠키는 2개만 유지한다.
   - `skincare_device_id`: 브라우저/기기 식별. Cookie + DB `devices`. 장기 수명.
   - `skincare_session_id`: 현재 활동/로그인 세션 식별용 opaque token. Cookie + Redis + DB `user_sessions`. 30분 sliding.
3. `skincare_session_id` cookie 에는 DB `user_sessions.id` 를 직접 넣지 않는다.
   - 외부에는 random opaque token 만 노출한다.
   - 서버는 `sha256(token)` hash 를 Redis key 로 저장한다.
   - Redis value 에 `userSessionId`, `deviceId`, optional `userId`, optional `roles` 를 저장한다.
4. 로그인 시 session rotation 을 수행한다.
   - 기존 anonymous session token 폐기
   - 새 session token 발급
   - Redis 에 authenticated session 저장
   - DB `user_sessions` 는 v1 에서 새 row 생성으로 고정
5. 로그아웃은 Redis session 삭제 + `skincare_session_id` cookie 삭제로 처리한다.
6. Refresh Token, blacklist, tokenVersion 은 구현하지 않는다.

## Consequences

- `AuthGuard` 는 Authorization header 를 보지 않고 Redis session lookup 으로 인증한다.
- `DeviceSessionMiddleware` 는 device/session cookie 보장과 sliding expiration 갱신을 담당한다.
- 인증 상태와 활동 session 이 같은 session cookie 수명 모델을 공유한다.
- DB `user_sessions` 는 분석/이력용 dimension 이고, 현재 로그인 인증의 source of truth 는 Redis session 이다.
- session cookie 에 DB `user_sessions.id` 를 노출하지 않는다.
