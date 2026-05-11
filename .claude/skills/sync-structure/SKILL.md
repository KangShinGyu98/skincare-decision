---
name: sync-structure
description: 폴더 구조가 변경되었거나(폴더 추가/이동/리네임/삭제) 문서가 새로 추가/이동/삭제되었을 때 사용하세요. 프로젝트의 구조-진실(structure-of-truth) 문서들만 골라서 갱신하고 깨진 경로 참조를 찾아 수정합니다. 콘텐츠 파일은 절대 읽지 않으며, 구조를 가리키는 인덱스 파일(README / AGENTS.md / CLAUDE.md / 각 폴더 AGENTS.md)만 최소 토큰으로 정밀 수정합니다.
---

# sync-structure — 폴더 구조 변경 동기화 Skill

> 이 skill은 **구조를 가리키는 파일만 손대고, 콘텐츠 파일은 절대 열지 않는다**. 토큰 사용을 최소화하기 위해 Grep으로 영향 범위를 한 번에 식별하고 Edit으로 정밀 치환한다.

---

## 0. 적용 시점

다음 변경이 발생했을 때 이 skill을 사용한다.

| 변화                         | 예시                                         |
| ---------------------------- | -------------------------------------------- |
| 폴더 추가 / 이동 / 리네임    | `docs/foo/` → `docs/bar/`                    |
| 문서 추가                    | `docs/Data/screen_data_specification.md` 생성|
| 문서 이동                    | `docs/db_modeling.md` → `docs/Data/db_modeling.md` |
| 문서 삭제                    | `docs/content_plan.md` 제거                  |
| 새 폴더에 `AGENTS.md` 추가   | `docs/Data/ERD/AGENTS.md` 생성               |

> **수동 호출 트리거**: 사용자가 폴더 구조를 바꾸거나 문서를 이동시킨 직후. **자동 호출 트리거 아님** — 콘텐츠 수정만 한 경우는 호출하지 않는다.

---

## 1. 토큰 최소화 원칙 (필수)

이 skill의 존재 이유는 **검증과 갱신을 최소한의 파일 읽기로 끝내는 것**이다. 다음을 **절대 하지 않는다**.

- ❌ 콘텐츠 본문(스펙 본문, 명세 본문) 읽기
- ❌ "혹시 모르니 전체 .md 파일 다 읽기"
- ❌ 변경된 파일 자체를 검증 목적으로 다시 읽기 (변경은 이미 완료된 것으로 신뢰)
- ❌ 구조 파일을 통째로 Write 도구로 재작성 (Edit으로 라인 단위 치환만 사용)
- ❌ "기왕 손댄 김에" 다른 곳까지 수정 (스코프 엄수)

---

## 2. 구조-진실 파일 목록 (이 파일들만 손댄다)

| 파일                                    | 무엇을 가리키나                                       |
| --------------------------------------- | ----------------------------------------------------- |
| `/README.md` (§4 디렉터리 한 줄 요약)   | 1단계 디렉터리 요약                                   |
| `/AGENTS.md`                            | 폴더별 진입 인덱스 + 명세 파일 직접 링크 테이블       |
| `/CLAUDE.md` (디렉터리 맵 섹션)         | 디렉터리 맵 + 폴더 진입 규칙                          |
| `/docs/AGENTS.md`                       | docs/ ASCII 트리 + 폴더 인덱스 + 키워드 인덱스        |
| `/<folder>/AGENTS.md` (모든 폴더)       | 해당 폴더의 파일 목록 표                              |
| `/memory/MEMORY.md` (선택)              | 메모리 파일 인덱스 (메모리 폴더 변경 시에만)          |

> 위 목록 외 파일은 **수정 대상도 아니고 읽기 대상도 아니다**.

---

## 3. 실행 절차

### Step 1. 변경 사실 확인 (사용자 입력 ≥ git status)

```
사용자 입력 우선:
  "X 폴더를 Y로 옮겼어" / "Z 파일 추가했어" / "W 삭제했어"

입력이 모호하면 git으로 추론:
  git status --short
  git diff --name-status main..HEAD
```

추출할 정보:
- 추가된 경로 `A`
- 이동된 경로 `R <old> <new>`
- 삭제된 경로 `D`

### Step 2. 구조-진실 파일 위치 한 번에 수집

```
Glob: "**/AGENTS.md"
Glob: "README.md"
Glob: "CLAUDE.md"
Glob: "memory/MEMORY.md"
```

> 파일을 **읽지는 않는다**. 경로 목록만 확보.

### Step 3. 깨진 참조 일괄 검색 (Grep 단일 패스)

각 옛 경로/삭제된 경로에 대해 Grep을 1회씩만 실행:

```
Grep:
  pattern: "<old-path>"            (예: "docs/db_modeling.md")
  path:    위 Step 2의 파일들에 한정
  output:  files_with_matches
```

이 단계의 출력 = **반드시 Edit해야 하는 파일 + 매치 라인**.

### Step 4. 영향 파일만 정밀 Edit

각 매치 파일에 대해:

| 변경 유형 | Edit 방식                                                       |
| --------- | --------------------------------------------------------------- |
| 이동      | `<old-path>` → `<new-path>` 문자열 치환 (Edit `replace_all=true`) |
| 삭제      | 참조 라인 전체 제거 (해당 표 row 또는 링크 라인)                |
| 추가      | 해당 폴더의 AGENTS.md 파일 목록 표에 한 줄 추가                 |

**ASCII 트리 다이어그램**(README §4, AGENTS.md, CLAUDE.md, docs/AGENTS.md에 있는 코드블록):
- 트리 전체를 재작성하지 말고, **변경된 라인이 속한 부분만** Edit 도구로 정확히 치환한다.
- 트리에 폴더 추가 시: 형제 라인을 기준으로 위치를 잡아 한 줄만 삽입.

### Step 5. 검증 — 옛 경로가 모두 사라졌는지 확인

```
Grep:
  pattern: "<old-path>"
  path:    프로젝트 루트
  글로브:   "**/*.md"
  output:  files_with_matches
```

결과가 **빈 셋**이면 완료. 남아 있으면 Step 4로 돌아가 추가 Edit.

### Step 6. 사용자에게 1줄 요약 보고

```
sync-structure 완료: <N>개 파일에서 <M>개 경로 갱신.
영향: <file_a>, <file_b>, ...
```

---

## 4. 새 폴더가 추가된 경우의 추가 처리

새 폴더 `docs/Foo/`가 생긴 경우, 사용자에게 다음을 확인 후 진행:

1. `docs/Foo/AGENTS.md`가 이미 있나? Glob으로 확인 (없으면 사용자에게 "내가 만들까?" 1회 질의).
2. 상위 `docs/AGENTS.md`의 §0 트리와 §1 폴더 인덱스에 폴더 라인 추가 (Edit).
3. 루트 `AGENTS.md` / `CLAUDE.md`의 디렉터리 맵에도 폴더 라인 추가 필요한지 확인.
4. README.md §4 디렉터리 한 줄 요약에 추가할지는 사용자 확인 (1단계 폴더가 아니라면 보통 추가 안 함).

---

## 5. 자주 깨지는 패턴 — 미리 확인할 것

- 마크다운 링크: `[label](path/to/file.md)` — Grep 패턴에 path만 넣으면 잡힌다.
- 이미지/CSV/기타 자산 링크: `![](path)`, `[](./path)` — 동일하게 path 기준 Grep.
- 인용/언급에서의 평문 경로: `` `docs/X.md` ``, `docs/X.md` — 백틱 안팎 둘 다 path 기반 Grep으로 잡힘.

---

## 6. 안티패턴 (이 skill의 흔한 실수)

- 🚫 변경 영향을 "느낌으로" 추측해서 콘텐츠 본문을 열어 보기 → Grep 결과를 신뢰하라.
- 🚫 구조 파일 전체를 Read → Write로 재작성 → Edit으로 라인만 손대라.
- 🚫 옛 경로가 남아 있는지 검증 없이 종료 → Step 5는 필수.
- 🚫 한 번에 여러 변경을 묶어 처리하면서 영향 파일을 잘못 매칭 → 변경 단위(경로별)로 Grep을 반복.

---

## 7. 출력 예시

입력:
> docs/db_modeling.md를 docs/Data/db_modeling.md로 옮겼어.

실행:
1. Glob으로 구조 파일 6개 식별
2. `Grep "docs/db_modeling.md"` → 매치 3개 파일
3. 3개 파일에 `replace_all` Edit로 `docs/db_modeling.md` → `docs/Data/db_modeling.md`
4. 검증 Grep → 0 matches

보고:
> sync-structure 완료: 3개 파일에서 옛 경로 7건을 새 경로로 갱신. 영향: AGENTS.md, CLAUDE.md, docs/AGENTS.md.
