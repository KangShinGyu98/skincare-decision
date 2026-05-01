# [PROJECT_NAME] — 프로젝트 컨텍스트

## 목적

[프로젝트 목적을 1~2줄로 요약]

## 기술 스택

- Backend: [언어/프레임워크], [데이터베이스], [캐시]
- Frontend: [언어/프레임워크], [상태 관리]
- Infra: [컨테이너/배포]

## 황금 원칙 (Golden Rules)

1. 직접 만든 헬퍼보다 공유 유틸리티 패키지 우선 (불변 조건 중앙화)
2. YOLO-style 데이터 탐색 금지 — 경계 검증 또는 타입 지정 SDK 의존
3. 레이어 경계 준수: Controller는 Repository만 호출, DB 직접 쿼리 금지
4. UI 컴포넌트에 비즈니스 로직 금지 — Service/Store 레이어 경유 필수
5. 메모리를 .md 파일로 관리할 것
6. 폴더에는 각 폴더에 AI Agent 가 사용할 폴더 설명을 파일로 저장하고, 모든 파일에는 최상단에 AI Agent 에게 제공할 설명을 작성할 것

## RPI 워크플로우 (모든 구현 작업의 기본 순서)

Research → Plan → Implementation

- **R (Research)**: 관련 파일 읽기, 기존 패턴 파악, `memory/project_decisions.md` 확인
- **P (Plan)**: 변경 레이어 정의, 레이어별 작업 목록 작성, 리스크·가정사항 → `memory/project_decisions.md`에 기록
- **I (Implementation)**: Types → Config → Repo → Service → Providers → Runtime → UI 순서로 구현

## 레이어드 아키텍처 (OpenAI code layer 기반)

```
[Backend]
Utils(app/lib) → Types(models) → Config → Repo(repositories) → Service → Providers → Runtime(controllers)

[Frontend]
Utils → Types → Config → Repo(api) → Service(hooks) → Runtime(store) → UI(components) → AppWiring(app)
```

## 범위 밖 (구현 금지)

- [항목 추가]


## 커밋 규칙

`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore` / `perf` / `ci` / `revert`

## 환경 실행

- OS: Windows 10 (bash 터미널 사용)

```bash
# [실행 명령 추가]
```
