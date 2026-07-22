# ADR-0006 Google OAuth 로그인 정책

## Status

Accepted — 2026-07-21

## Context

기존 로그인은 `AuthController.login`("임시 로그인 컨트롤러"로 명시)이 하드코딩된 in-memory 계정(username/password)을 평문 비교하는 방식이었고, Prisma `User` 모델에는 `password` 컬럼조차 없었다(로그인 성공 후 DB에는 upsert만 됨). 실제 서비스 가입/로그인 수단은 없었다.

이번 작업의 요구사항은 Google OAuth만을 로그인 수단으로 도입하고, 자체 아이디/비밀번호 로그인이나 다른 소셜 로그인은 지원하지 않는 것이다. 프론트엔드는 shadcn/TanStack Query 컨벤션과의 통일성을 강하게 요구했다.

## Decision

1. **로그인 수단은 Google OAuth 단독**으로 한다. 기존 임시 username/password 로그인(`AuthController.login`, `AuthService.login`, `UsersService`의 in-memory 계정 배열)은 완전히 제거한다.
2. **OAuth 플로우는 백엔드 리다이렉트 기반 Authorization Code flow**를 사용한다(`GET /auth/google` → Google 동의 화면 → `GET /auth/google/callback`). Google Identity Services 위젯(클라이언트 JS SDK)은 사용하지 않는다.
   - 이유: GSI의 기본 렌더 버튼은 브랜딩 가이드라인상 자유롭게 스타일링할 수 없어 shadcn 통일성 요구와 맞지 않는다. 리다이렉트 방식은 순수 shadcn `Button`으로 구현 가능하고, 프론트엔드에 Google JS SDK를 로드할 필요가 없다.
   - 코드 교환/ID 토큰 검증은 `google-auth-library`(공식 라이브러리)의 `OAuth2Client`에 위임하고, 서명 검증을 직접 구현하지 않는다.
3. **세션 발급은 ADR-0004(Redis opaque session)를 그대로 재사용**한다. OAuth 콜백 성공 시 `SessionService.rotateToAuthenticatedSession`을 호출해 기존 로그인과 동일한 `skincare_session_id` 쿠키 rotation을 수행한다. JWT는 도입하지 않는다.
4. **OAuth state는 CSRF 방지용 nonce + redirectTo를 담아 5분짜리 signed 쿠키(`google_oauth_state`)로 검증**한다. `redirectTo`는 `/`로 시작하고 `//`로 시작하지 않는 상대 경로만 허용한다(open redirect 방지).
5. `User` 모델에 `googleId`(nullable, unique) 컬럼을 추가한다. 로그인 시 `googleId` → 없으면 `email` → 없으면 신규 생성 순으로 유저를 찾아 연결/생성한다.
6. **Google로 최초 로그인하는 유저는 전원 `USER` role을 기본 부여**한다. Google은 role 정보를 제공하지 않으므로, ADMIN 승격은 운영자가 DB에서 직접 처리하는 수동 프로세스로 남긴다(자동 승격 allowlist 등은 도입하지 않는다).
7. `UsersService`를 `UsersRepository`(Prisma 전용) 위에 얇게 재작성해 Controller → Service → Repository 계층을 지킨다. 세션 쿠키 발급/삭제/조회 로직은 `AuthController`와 신규 `GoogleAuthController`가 공유하도록 `SessionCookieService`로 추출한다.

## Consequences

- `POST /auth/login`, 하드코딩 계정, `loginBodySchema`(shared)는 삭제되었다. 기존에 이 엔드포인트로 얻던 ADMIN 세션(예: `maria`)은 더 이상 발급되지 않으며, ADMIN이 필요하면 DB `users.role`을 직접 `ADMIN`으로 갱신해야 한다.
- `GET /auth/me`, `POST /auth/logout`은 provider-agnostic하게 그대로 유지되어 변경 없음.
- `AuthenticatedUser`(`{id, roles, permissions}`) 계약은 변경하지 않았다. 즉 로그인 상태 UI(드롭다운)에는 사용자 이름/이메일을 표시하지 않는다 — 이를 표시하려면 세션/`/auth/me` 계약에 email/name을 추가하는 별도 결정이 필요하다(추후 과제로 남김).
- 로컬/운영 환경변수에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`이 필수로 추가되었다(`env.validation.ts`에서 강제 검증).
- Google Cloud Console에 등록하는 "승인된 리디렉션 URI"는 반드시 `GOOGLE_CALLBACK_URL`(백엔드 주소, 예: `http://localhost:4000/api/auth/google/callback`)과 정확히 일치해야 한다. 프론트엔드 주소가 아니다.
