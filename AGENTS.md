# AGENTS.md

AI 세션 시작 시 읽는 프로젝트 문서 인덱스 파일이다. 파일 이름과 최소한의 설명으로 구성한다.

## 필수 (세션 시작 시)

| 파일                    | 설명                                                       |
| ----------------------- | ---------------------------------------------------------- |
| README.md               | 프로젝트 개요·실행 방법·문서 링크 (사람용 진입점)          |
| CLAUDE.md               | AI 작업 규칙·워크플로우·레이어드 아키텍처·메모리 관리 규칙 |
| memory/ADR/             | 장기 설계 결정(ADR) 파일 모음                              |
| memory/external_apis.md | 외부 API 인터페이스 계약 및 Provider 정보                  |
| memory/task_plan.md     | 현재 작업의 임시 계획 및 current state (작업 완료 후 삭제) |

## docs/Data/ — DB 모델

| 파일                        | 설명                                |
| --------------------------- | ----------------------------------- |
| db_modeling.md              | DB 테이블 모델 (Prisma schema 대응) |
| db_schema_validation.md     | DB 스키마 검증 기록                 |
| screen_data_specification.md | 화면별 데이터 사양                 |

## docs/ContentSpec/ — 콘텐츠·룰 명세

| 파일                            | 설명                                                              |
| ------------------------------- | ----------------------------------------------------------------- |
| product_attribute_schema.md     | `products.attributes` JSONB 키 사전 (카테고리별)                  |
| matching_rules_revised.md       | Priority Gate / Question visibility / Filter mapping 룰 시드      |
| page_content_specification.md   | 화면별 카피·질문·CTA·동적 슬롯                                    |
| wireframe_summary.md            | 와이어프레임 흐름 요약                                            |
| product_taxonomy.md             | MVP 6개 카테고리 정의                                             |
| skincare_product_selection_rule.md | 카테고리별 선택 기준 원자료                                    |
| admin_product_input_spec.md     | 관리자 제품 등록 폼 명세 (필드 + S3 업로드 + 자동 판정)           |

## docs/DocumentIngredients/ — 성분

| 파일                          | 설명                            |
| ----------------------------- | ------------------------------- |
| skincare_rules_from_articles.md | 아티클에서 추출한 스킨케어 룰 |

## docs/Rejected/ — 보류 / 참고 자료

| 파일                            | 설명                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| data_source_catalog.md          | 외부 데이터 출처 카탈로그 (Naver / 식약처 / AIHub / 브랜드) |
| ingredient_efficacy_thresholds.md | 성분 유효 농도 기준 (식약처 별표4 기반 시드)             |
| product_scope_and_limits.md     | 제품 범위·제외 항목                                        |

## docs/Codex_Research/ — 배경 조사

| 폴더               | 설명                                            |
| ------------------ | ----------------------------------------------- |
| `00~23` `*.md`     | 시장·UX·결정 여정 조사 (00 인덱스부터 순서대로) |

## design_system/ — 디자인 / UI 참고

| 파일 / 폴더         | 설명                      |
| ------------------- | ------------------------- |
| colors_and_type.css | 색상·타이포 CSS 토큰      |
| preview/            | 디자인 토큰 HTML 프리뷰   |
| ui_kits/webapp/     | 웹앱 UI 킷 목업           |

## scripts/ — Python 유틸 (크롤링 산출물)

| 파일                       | 설명                       |
| -------------------------- | -------------------------- |
| crawl_articles.py          | 아티클 본문 크롤러         |
| crawl_titles.py            | 아티클 제목 크롤러         |
| organize_articles.py       | 크롤링 결과 정리           |
| find_api.py / find_api2.py | 외부 API 탐색 스크립트     |

## Assets/ — 이미지

| 폴더    | 설명                       |
| ------- | -------------------------- |
| Assets/ | 와이어프레임/UX 참고 이미지 |

## 구현 코드 (예정)

| 폴더      | 설명                              |
| --------- | --------------------------------- |
| backend/  | NestJS + Prisma 앱 (재구축 예정)  |
| frontend/ | Next.js App Router 앱 (예정)      |
| infra/    | Docker / IaC / GitHub Actions (예정) |
