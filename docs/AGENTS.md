# docs/ — 명세 (Source of Truth)

> 모든 AI Agent는 코드 작성 전에 본 인덱스를 먼저 읽는다.
> 코드와 명세가 어긋나면 명세를 먼저 갱신하고, 코드는 명세를 따라간다.
> 본 파일은 **폴더 단위 인덱스**이며, 각 폴더의 파일 상세 설명은 해당 폴더의 `AGENTS.md`에 있다.

---

## 0. 폴더 구조

```
docs/
├─ AGENTS.md                        ← 본 파일 (진입점 인덱스)
│
├─ ContentSpec/                     ← 콘텐츠 / 비즈니스 룰 / UI 명세
│   ├─ AGENTS.md
│   ├─ admin_product_input_spec.md
│   ├─ matching_rules_revised.md
│   ├─ page_content_specification.md
│   ├─ product_attribute_schema.md
│   ├─ product_taxonomy.md
│   ├─ skincare_product_selection_rule.md
│   └─ wireframe_summary.md
│
├─ Data/                            ← DB 데이터 모델 / 스키마 / 화면 데이터 흐름
│   ├─ AGENTS.md
│   ├─ db_modeling.md
│   ├─ db_schema_validation.md
│   ├─ screen_data_specification.md
│   └─ ERD/
│       ├─ AGENTS.md
│       └─ Skincare-after-backend.png
│
├─ DocumentIngredients/             ← 정제 전 1차 소스 원자료
│   ├─ AGENTS.md
│   └─ skincare_rules_from_articles.md
│
├─ Rejected/                        ← 토너 MVP 범위 밖 (삭제 아닌 보류)
│   ├─ AGENTS.md
│   ├─ data_source_catalog.md
│   ├─ ingredient_efficacy_thresholds.md
│   └─ product_scope_and_limits.md
│
├─ Codex_Research/                  ← 시장·UX·결정 여정 조사 (23편, 읽기 전용)
├─ ClaudeProtype/                   ← HTML mockup
├─ crawl/                           ← 스킨케어 아티클 크롤링 산출물 (P0)
└─ 화장품 성분비교.CSV               ← 토너 1차 시드 원본 (큐레이터 직접 입력)
```

---

## 1. 폴더 인덱스

| 폴더                                         | 역할                                              | 진입 파일                                                      |
| -------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| [ContentSpec/](ContentSpec/)                 | 화면 콘텐츠·비즈니스 룰·UI 명세 (활성)            | [ContentSpec/AGENTS.md](ContentSpec/AGENTS.md)                 |
| [Data/](Data/)                               | DB 데이터 모델·스키마·화면 데이터 흐름 (활성)     | [Data/AGENTS.md](Data/AGENTS.md)                               |
| [DocumentIngredients/](DocumentIngredients/) | 정제 전 1차 소스 원자료 (재료)                    | [DocumentIngredients/AGENTS.md](DocumentIngredients/AGENTS.md) |
| [Rejected/](Rejected/)                       | 토너 1차 MVP 범위 밖 보류 명세 (삭제 아님)        | [Rejected/AGENTS.md](Rejected/AGENTS.md)                       |
| [Codex_Research/](Codex_Research/)           | 시장·UX·결정 여정 조사 (배경 컨텍스트, 읽기 전용) | [Codex_Research/AGENTS.md](Codex_Research/AGENTS.md)           |
| [ClaudeProtype/](ClaudeProtype/)             | HTML mockup (UI 톤·레이아웃 참고)                 | [ClaudeProtype/AGENTS.md](ClaudeProtype/AGENTS.md)             |
| [crawl/](crawl/)                             | 스킨케어 아티클 크롤링 산출물 (P0 종료)           | [crawl/AGENTS.md](crawl/AGENTS.md)                             |

---

## 2. 활성 명세 빠른 찾기 (키워드 인덱스)

| 키워드                              | 파일                                                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| DB 27개 테이블 정의                 | [Data/db_modeling.md](Data/db_modeling.md)                                                                 |
| Prisma↔SQL 자료형·인덱스 검증       | [Data/db_schema_validation.md](Data/db_schema_validation.md)                                               |
| 화면별 데이터 흐름 (Read/Write/...) | [Data/screen_data_specification.md](Data/screen_data_specification.md)                                     |
| ERD 시각화 다이어그램               | [Data/ERD/Skincare-after-backend.png](Data/ERD/Skincare-after-backend.png)                                 |
| Priority Gate 룰 + 필터 매핑 시드   | [ContentSpec/matching_rules_revised.md](ContentSpec/matching_rules_revised.md)                             |
| `products.attributes` JSONB 사전    | [ContentSpec/product_attribute_schema.md](ContentSpec/product_attribute_schema.md)                         |
| MVP 6개 카테고리 정의               | [ContentSpec/product_taxonomy.md](ContentSpec/product_taxonomy.md)                                         |
| 화면별 카피·CTA·동적 슬롯           | [ContentSpec/page_content_specification.md](ContentSpec/page_content_specification.md)                     |
| 화면 흐름·관리자 화면 요약          | [ContentSpec/wireframe_summary.md](ContentSpec/wireframe_summary.md)                                       |
| 관리자 제품 등록 폼 명세            | [ContentSpec/admin_product_input_spec.md](ContentSpec/admin_product_input_spec.md)                         |
| 카테고리별 선택 기준 원자료         | [ContentSpec/skincare_product_selection_rule.md](ContentSpec/skincare_product_selection_rule.md)           |
| 토너 1차 시드 원본 (CSV)            | [화장품 성분비교.CSV](./화장품%20성분비교.CSV)                                                             |
| 크롤링 1차 룰 (정제 전)             | [DocumentIngredients/skincare_rules_from_articles.md](DocumentIngredients/skincare_rules_from_articles.md) |

---

## 3. Rejected/ 참조 시 유의

`Rejected/`는 삭제가 아니라 **토너 1차 MVP 범위 밖** 명세를 모아둔 폴더다. 활성 명세가 Rejected의 키나 개념을 참조하면(예: `ContentSpec/admin_product_input_spec.md`의 `effective_dose_met` → `Rejected/ingredient_efficacy_thresholds.md`), 그 영역은 토너 MVP에서 **비활성화된 부분**으로 이해한다.

다른 카테고리(serum 등) 또는 외부 데이터 자동 수집 작업이 시작되면 활성으로 복귀할 수 있다.

---

## 4. 기여 규칙

- 모든 문서 상단에 작성일을 명시한다.
- 표 추가 시 한국어 + 영문 키를 같이 둔다 (예: `category_key` / `한글 라벨`).
- 예시 JSON은 실제 사용 가능한 값으로 둔다 (placeholder 금지).
- 카테고리별 명세에는 "MVP에서 제외" 섹션을 두어 범위 침범을 막는다.
- 명세를 갱신하면 [../memory/project_decisions.md](../memory/project_decisions.md)에 결정과 사유를 기록한다.
- 더 이상 필요 없는 명세는 삭제하지 말고 `Rejected/`로 이동한다.
- **폴더 추가 시 본 인덱스 + 해당 폴더의 `AGENTS.md`를 함께 만든다.**
- 파일 이동 시 본 인덱스의 §0 폴더 구조와 §2 키워드 인덱스를 함께 갱신한다.
