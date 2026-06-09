# ADR-0003 API 에러 응답 정책

## Status

Accepted — 2026-06-08

## Context

NestJS 공통 에러 처리 파이프라인을 만들면서 API 에러 응답의 표준 형태를 정해야 했다. HTTP 상태와 애플리케이션 내부 오류 코드를 같은 필드에 섞으면 다음 문제가 생긴다.

- `404`, `400`, `500` 은 HTTP 프로토콜 상태인데, `HTTP_404` 같은 문자열로 바꾸면 의미가 불필요하게 가공된다.
- 이후 비즈니스 오류(`SKIN_PROFILE_REQUIRED`, `SESSION_CONTEXT_MISSING` 등)를 추가할 때 HTTP 상태 코드와 구분하기 어렵다.
- 클라이언트는 HTTP 상태별 처리와 비즈니스 오류별 처리를 서로 다른 기준으로 수행해야 한다.

또한 초기 단계에서 custom exception enum 을 강제할지 결정이 필요했다. 모든 오류를 enum 과 custom exception class 로 먼저 모델링하면 응답 일관성은 강해질 수 있지만, 현재는 반복되는 오류가 많지 않고 구현 속도와 인지부하의 균형이 더 중요하다.

## Decision

1. 에러 응답은 `statusCode` 와 `code` 를 분리한다.
   - `statusCode`: HTTP 상태 숫자. 예: `400`, `401`, `404`, `500`.
   - `code`: 클라이언트가 분기 처리할 수 있는 문자열 오류 코드.
   - 기본 HTTP 예외의 `code` 는 `HttpStatus[statusCode]` 기반 문자열을 사용한다. 예: `NOT_FOUND`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`.
   - 비즈니스 오류가 명시적으로 `code` 를 제공하면 그 값을 우선한다. 예: `SKIN_PROFILE_REQUIRED`.
2. 표준 에러 응답 형태는 다음을 따른다.

```json
{
  "success": false,
  "error": {
    "statusCode": 404,
    "code": "NOT_FOUND",
    "message": "Cannot GET /api/unknown"
  },
  "meta": {
    "requestId": "018f...",
    "path": "/api/unknown",
    "timestamp": "2026-06-08T00:00:00.000Z"
  }
}
```

3. 현재 단계에서는 custom exception enum 과 custom exception class 계층을 만들지 않는다.
   - 체감상 반복되는 오류가 아직 적다.
   - custom exception 이 개발자의 HTTP status 의존도를 낮추는 이점보다, 새 오류를 만들 때 확인해야 할 파일과 규칙이 늘어나는 인지부하가 더 크다.
   - 현재는 message 말투와 형식 통일의 중요도가 낮다.
4. custom exception 구조는 다음 신호가 반복될 때 추가한다.
   - "다른 곳에서는 이 에러를 어떻게 썼지?"라는 확인이 자주 발생한다.
   - 특정 오류가 어떤 `code` 를 써야 하는지 헷갈리는 일이 반복된다.
   - 에러와 코드의 매핑이 어려워져서 클라이언트 분기 처리가 불안정해진다.

## Alternatives Considered

- **`code: "HTTP_404"` 형태 사용** → 기각. HTTP 상태를 문자열로 다시 포장할 뿐이며, 비즈니스 오류 코드와 같은 필드에 놓였을 때 의미가 흐려진다.
- **`code` 없이 `statusCode` 만 사용** → 기각. 초기에 단순하지만, 이후 비즈니스 오류를 클라이언트가 안정적으로 분기할 수 없다.
- **처음부터 custom exception enum 강제** → 보류. 오류 종류가 충분히 반복되기 전에는 enum, exception class, message contract 를 유지하는 비용이 크다.

## Consequences

- `HttpExceptionFilter` 는 모든 예외를 `{ success: false, error, meta }` 형태로 변환한다.
- `error.statusCode` 는 항상 숫자 HTTP 상태를 담는다.
- `error.code` 는 항상 문자열을 담되, 기본값은 `HttpStatus[statusCode]` 기반 코드로 둔다.
- 비즈니스 오류가 필요하면 Nest `HttpException` response body 에 `{ code, message, details }` 를 넣어 우선 적용한다.
- custom exception enum 은 당장 만들지 않고, 오류 코드 재사용과 매핑 혼란이 실제로 발생하면 별도 ADR 로 도입한다.
