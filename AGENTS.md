# AGENTS.md — AI Agent 시작점 & 작업 지시사항

> **본 파일은 모든 AI Agent(Claude / Codex / 기타)의 진입점입니다.**
> 본 저장소는 Claude와 Codex를 번갈아 사용하므로, **세션이 누구에게서 시작되든 동일한 컨텍스트**를 공유해야 합니다.

---

## ⛔ STOP — 작업 전 필수 행동 (모든 AI Agent 공통)

**어떤 코드/문서 작업도 시작하기 전에, 아래 두 파일을 반드시 순서대로 읽으세요.**

1. **본 파일 ([AGENTS.md](AGENTS.md))** — 시작점, AI Agent 지시사항, 폴더 진입 인덱스
2. **[CLAUDE.md](CLAUDE.md)** — 구체적인 프로젝트 개요, 황금 원칙, 폴더 구조, 기술 스택, 범위

추가로 작업 성격에 따라:

- **모든 작업**: [memory/MEMORY.md](memory/MEMORY.md) 인덱스를 확인하고, 관련 메모리 파일을 읽는다.
- **명세 관련 작업**: [docs/AGENTS.md](docs/AGENTS.md)에서 시작.
- **백엔드 작업**: [backend/AGENTS.md](backend/AGENTS.md) → [backend/CLAUDE.md](backend/CLAUDE.md).
- **프론트엔드 작업**: [frontend/AGENTS.md](frontend/AGENTS.md) → [frontend/CLAUDE.md](frontend/CLAUDE.md).
- **인프라 작업**: [infra/AGENTS.md](infra/AGENTS.md).

위 단계를 건너뛴 채 코드를 수정·생성하면 **컨텍스트 충돌**과 **중복 작업**이 발생합니다.

---

## 📜 두 파일의 역할 분담 (Claude/Codex 공통)

| 파일      | 역할                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------- |
| AGENTS.md | **시작점 + AI Agent 행동 규칙**. "어디서부터 읽고, 어디로 가고, 무엇을 하면 안 되는지"를 정의           |
| CLAUDE.md | **프로젝트 본체 컨텍스트**. 목적, 황금 원칙, 기술 스택, 폴더 구조, 레이어 아키텍처, 범위 밖 항목을 정의 |
| README.md | 사람용 첫 인상 문서. 프로젝트 설명·실행 명령·AI 협업 절차 요약                                          |

> 두 파일이 충돌하면 **AGENTS.md의 행동 규칙이 우선**, 프로젝트 정의는 **CLAUDE.md를 신뢰**한다.

---

## 🤖 AI Agent 행동 규칙

1. **세션 시작 시**: AGENTS.md → CLAUDE.md → memory/MEMORY.md 순으로 읽는다 (스킵 금지).
2. **폴더 진입 시**: 해당 폴더의 `AGENTS.md`를 가장 먼저 연다. 없으면 만들고 작업한다.
3. **결정/가정/리스크가 발생하면** 즉시 [memory/project_decisions.md](memory/project_decisions.md)에 append.
4. **세션 종료 전** [memory/project_progress.md](memory/project_progress.md)에 변경 요약을 남긴다 (다른 Agent가 이어 받을 수 있도록).
5. **명세와 코드가 어긋나면** `docs/`를 먼저 갱신한 뒤 코드를 수정한다.
6. **API 시그니처가 바뀌면** [memory/api_contracts.md](memory/api_contracts.md)를 먼저 갱신.
7. **버그를 해결하면** [memory/known_issues.md](memory/known_issues.md)에 증상→원인→해결책을 기록.
8. **임의로 폴더 구조를 바꾸지 않는다**. 변경이 필요하면 본 파일과 [CLAUDE.md](CLAUDE.md)의 디렉터리 맵을 함께 갱신.
9. **다른 Agent의 결정을 덮어쓰지 않는다**. memory/project_decisions.md는 append-only.
10. **모든 폴더에 AGENTS.md, 모든 코드 파일 최상단에 한 줄 헤더 주석**을 유지한다 (CLAUDE.md 황금 원칙 6).

---

## 0. 최우선 컨텍스트

| 파일                                                       | 설명                                            |
| ---------------------------------------------------------- | ----------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                                     | 프로젝트 정의, 황금 원칙, 레이어 아키텍처, 범위 |
| [EXECUTION_PLAN.md](EXECUTION_PLAN.md)                     | 백엔드/프론트엔드 단계별 구축 명령(Phase 0 → 7) |
| [memory/MEMORY.md](memory/MEMORY.md)                       | 메모리 인덱스 (결정/진행/계약/이슈)             |
| [memory/project_decisions.md](memory/project_decisions.md) | 설계 결정 및 가정사항                           |
| [memory/project_progress.md](memory/project_progress.md)   | 현재 구현 상태 및 다음 작업 우선순위            |
| [memory/api_contracts.md](memory/api_contracts.md)         | REST 엔드포인트 / 외부 API 계약                 |
| [memory/known_issues.md](memory/known_issues.md)           | 알려진 버그 및 해결 패턴                        |

---

## 1. 명세 (필수 — 코드 작성 전 확인)

| 파일                                                                                     | 설명                                                                                    |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [docs/AGENTS.md](docs/AGENTS.md)                                                         | docs 폴더 진입점                                                                        |
| [docs/db_modeling.md](docs/db_modeling.md)                                               | 25개 테이블 모델 (Prisma schema 1:1 대응 기준)                                          |
| [docs/product_attribute_schema.md](docs/product_attribute_schema.md)                     | `products.attributes` JSONB 키 사전 (카테고리별)                                        |
| [docs/matching_rules_revised.md](docs/matching_rules_revised.md)                         | Priority Gate / Question visibility / Filter mapping rule 시드                          |
| [docs/page_content_specification_revised.md](docs/page_content_specification_revised.md) | 화면별 카피·질문·CTA·동적 슬롯                                                          |
| [docs/wireframe_summary.md](docs/wireframe_summary.md)                                   | 와이어프레임 흐름 요약                                                                  |
| [docs/product_taxonomy.md](docs/product_taxonomy.md)                                     | MVP 6개 카테고리 정의                                                                   |
| [docs/skincare_product_selection_rule.md](docs/skincare_product_selection_rule.md)       | 카테고리별 선택 기준 원자료                                                             |
| [docs/content_plan.md](docs/content_plan.md)                                             | Rule 추출/검증 파이프라인 메모                                                          |
| [docs/admin_product_input_spec.md](docs/admin_product_input_spec.md)                     | 관리자 제품 등록 폼 명세 (카테고리별 필드 + S3 업로드 + `effective_dose_met` 자동 판정) |
| [docs/data_source_catalog.md](docs/data_source_catalog.md)                               | 외부 데이터 출처 카탈로그 (Naver / 식약처 3종 / AIHub OCR / 브랜드 공식) — 결정 1 보조  |
| [docs/ingredient_efficacy_thresholds.md](docs/ingredient_efficacy_thresholds.md)         | 성분 유효 농도 기준 단일 진실 (식약처 별표4 기반 시드)                                  |

---

## 2. 디자인 / UI 참고

| 파일                                                                   | 설명                        |
| ---------------------------------------------------------------------- | --------------------------- |
| [design_system/AGENTS.md](design_system/AGENTS.md)                     | 디자인 시스템 진입점        |
| [design_system/README.md](design_system/README.md)                     | 색상·타이포·컴포넌트 가이드 |
| [design_system/colors_and_type.css](design_system/colors_and_type.css) | CSS 토큰                    |
| [ClaudeProtype/AGENTS.md](ClaudeProtype/AGENTS.md)                     | HTML 프로토타입 진입점      |
| [Assets/AGENTS.md](Assets/AGENTS.md)                                   | 와이어프레임 이미지 진입점  |

---

## 3. 조사 / 데이터 (백그라운드 컨텍스트)

| 폴더                                                 | 설명                                    |
| ---------------------------------------------------- | --------------------------------------- |
| [Codex_Research/AGENTS.md](Codex_Research/AGENTS.md) | 시장·UX·결정 여정 조사 (00~23)          |
| [crawl/AGENTS.md](crawl/AGENTS.md)                   | 스킨케어 아티클 크롤링 산출물 (P0 단계) |
| [scripts/AGENTS.md](scripts/AGENTS.md)               | 크롤링·API 탐색 Python 스크립트         |

---

## 4. 구현 코드 (Phase 2 이후 생성)

| 폴더                                     | 설명                                                  |
| ---------------------------------------- | ----------------------------------------------------- |
| [backend/AGENTS.md](backend/AGENTS.md)   | NestJS + Prisma 백엔드 (구조 사양 + 진입 규칙)        |
| [frontend/AGENTS.md](frontend/AGENTS.md) | Next.js App Router 프론트엔드 (구조 사양 + 진입 규칙) |
| [infra/AGENTS.md](infra/AGENTS.md)       | Docker / GH Actions / IaC                             |

---

## 5. 진입 규칙

1. 모든 작업 시작 전 [CLAUDE.md](CLAUDE.md) → 본 파일 → `memory/MEMORY.md` 순으로 확인.
2. 코드를 작성하기 전 [memory/project_decisions.md](memory/project_decisions.md)를 검토하고, 새로운 결정은 같은 파일에 추가한다.
3. 폴더 안에서 작업할 때는 해당 폴더의 `AGENTS.md`를 먼저 읽는다.
4. `docs/`는 단일 진실(Source of Truth) — 코드와 명세가 어긋나면 명세를 먼저 갱신한다.
5. 환경 변수는 `.env.example`만 커밋하고, 실제 값은 `.env.local`(Frontend), `.env`(Backend)에 저장한다.
