# 외부 API 인터페이스 계약

## Google OAuth 2.0 (로그인)

- 용도: 사용자 로그인(유일한 로그인 수단). 자체 아이디/비밀번호, 다른 소셜 로그인 없음.
- 방식: 백엔드 리다이렉트 기반 Authorization Code flow. 프론트엔드는 Google JS SDK를 사용하지 않는다.
- 사용 라이브러리: `google-auth-library`(backend, `OAuth2Client`).

### 엔드포인트 (Google 측)

| 용도 | URL |
|---|---|
| 인가 요청 | `https://accounts.google.com/o/oauth2/v2/auth` (`OAuth2Client.generateAuthUrl`이 내부 생성) |
| 토큰 교환 | `https://oauth2.googleapis.com/token` (`OAuth2Client.getToken`) |
| ID 토큰 검증 | `OAuth2Client.verifyIdToken` (Google 공개키로 서명 검증, 네트워크 호출은 라이브러리 내부에서 캐시) |

### 요청 scope

`openid`, `email`, `profile`

### 우리 서비스가 노출하는 엔드포인트

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/auth/google` | Google 인가 URL로 302 리다이렉트. `redirectTo` 쿼리(상대 경로)를 CSRF nonce와 함께 state에 인코딩, `google_oauth_state` 쿠키(5분)에 nonce 저장 |
| `GET /api/auth/google/callback` | `code`/`state` 검증 후 유저 upsert, `SessionService.rotateToAuthenticatedSession` 호출, `skincare_session_id` 쿠키 발급, `CORS_ORIGIN + redirectTo`로 302 리다이렉트. 실패 시 `CORS_ORIGIN/?login_error=1`로 리다이렉트 |

### 필요 환경변수

| 변수 | 설명 |
|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud Console OAuth 2.0 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console OAuth 2.0 클라이언트 시크릿 |
| `GOOGLE_CALLBACK_URL` | 백엔드 콜백 절대 URL. Google Cloud Console의 "승인된 리디렉션 URI"와 정확히 일치해야 함(예: `http://localhost:4000/api/auth/google/callback`) |

### 응답에서 사용하는 필드 (ID 토큰 payload)

| 필드 | 매핑 |
|---|---|
| `sub` | `users.google_id` (unique) |
| `email` | `users.email` (unique, 기존 유저 매칭 fallback 키) |
| `name` | `users.name` |

관련 결정: [[ADR-0006-google-oauth-login-policy]], 세션 발급 방식은 [[ADR-0004-redis-session-auth-policy]] 참고.
