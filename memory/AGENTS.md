# memory/ — AI Agent 메모리 폴더

> 세션 간 유지해야 하는 결정·진행 상태·계약·이슈를 .md 파일로 기록한다.

## 진입 규칙

1. 세션 시작 시 [MEMORY.md](MEMORY.md) (인덱스) → 필요한 파일을 읽는다.
2. 세션 종료 전 [project_progress.md](project_progress.md)에 변경 요약을 추가한다.
3. 새 결정은 [project_decisions.md](project_decisions.md)에 append-only로 적는다 (수정/삭제 금지, 후속 결정으로 덮어쓴다).
4. API 시그니처가 바뀌면 [api_contracts.md](api_contracts.md) 먼저 갱신.
5. 버그를 해결하면 [known_issues.md](known_issues.md)에 증상/원인/해결책을 남긴다.

## 파일 목록

| 파일                                          | 역할                                          |
| --------------------------------------------- | --------------------------------------------- |
| [MEMORY.md](MEMORY.md)                        | 인덱스 (모든 메모리 파일 1줄 설명)            |
| [project_progress.md](project_progress.md)    | 세션별 진행 상태 + 다음 우선순위              |
| [project_decisions.md](project_decisions.md)  | 설계 결정·가정사항·트레이드오프 (append-only) |
| [api_contracts.md](api_contracts.md)          | REST 엔드포인트 + 외부 API 계약               |
| [known_issues.md](known_issues.md)            | 알려진 버그 및 해결 패턴                      |

## 작성 원칙

- **사실만 기록**: "할 예정"이 아니라 "결정/완료/실패 결과"만.
- **날짜 명시**: 모든 entry에 `[YYYY-MM-DD]` prefix.
- **상대 시간 표현 금지**: "어제", "다음 주" 대신 절대 날짜.
- **Append-only**: 결정/진행 기록은 덮어쓰지 않고 새 entry로 갱신.
