# 폴더 구조와 파일의 메타데이터입니다. 

---

## 0. 최우선 컨텍스트

| 파일                                                       | 설명                                            |
| ---------------------------------------------------------- | ----------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                                     | 프로젝트 정의, 황금 원칙, 레이어 아키텍처, 범위 || [memory/MEMORY.md](memory/MEMORY.md)                       | 메모리 인덱스 (결정/진행/계약/이슈)             |
| [memory/project_decisions.md](memory/project_decisions.md) | 설계 결정 및 가정사항                           |
| [memory/project_progress.md](memory/project_progress.md)   | 현재 구현 상태 및 다음 작업 우선순위            |
| [memory/api_contracts.md](memory/api_contracts.md)         | REST 엔드포인트 / 외부 API 계약                 |
| [memory/known_issues.md](memory/known_issues.md)           | 알려진 버그 및 해결 패턴                        |

---

## 1. 명세 (필수 — 코드 작성 전 확인)

| 파일                                                                                                       | 설명                                                                                    |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [docs/AGENTS.md](docs/AGENTS.md)                                                                           | docs 폴더 진입점                                                                        |
| [docs/Data/db_modeling.md](docs/Data/db_modeling.md)                                                       | 27개 테이블 모델 (Prisma schema 1:1 대응 기준)                                          |
| [docs/ContentSpec/product_attribute_schema.md](docs/ContentSpec/product_attribute_schema.md)               | `products.attributes` JSONB 키 사전 (카테고리별)                                        |
| [docs/ContentSpec/matching_rules_revised.md](docs/ContentSpec/matching_rules_revised.md)                   | Priority Gate / Question visibility / Filter mapping rule 시드                          |
| [docs/ContentSpec/page_content_specification.md](docs/ContentSpec/page_content_specification.md)           | 화면별 카피·질문·CTA·동적 슬롯                                                          |
| [docs/ContentSpec/wireframe_summary.md](docs/ContentSpec/wireframe_summary.md)                             | 와이어프레임 흐름 요약                                                                  |
| [docs/ContentSpec/product_taxonomy.md](docs/ContentSpec/product_taxonomy.md)                               | MVP 6개 카테고리 정의                                                                   |
| [docs/ContentSpec/skincare_product_selection_rule.md](docs/ContentSpec/skincare_product_selection_rule.md) | 카테고리별 선택 기준 원자료                                                             |
| [docs/ContentSpec/admin_product_input_spec.md](docs/ContentSpec/admin_product_input_spec.md)               | 관리자 제품 등록 폼 명세 (카테고리별 필드 + S3 업로드 + `effective_dose_met` 자동 판정) |
| [docs/Rejected/data_source_catalog.md](docs/Rejected/data_source_catalog.md)                               | 외부 데이터 출처 카탈로그 (Naver / 식약처 3종 / AIHub OCR / 브랜드 공식) — 결정 1 보조  |
| [docs/Rejected/ingredient_efficacy_thresholds.md](docs/Rejected/ingredient_efficacy_thresholds.md)         | 성분 유효 농도 기준 단일 진실 (식약처 별표4 기반 시드)                                  |

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

## 4. 구현 코드 (앱 구축 시 생성)

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
