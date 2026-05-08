# docs/ — 명세 (Source of Truth)

> 모든 AI Agent는 코드 작성 전에 본 인덱스를 먼저 읽는다.
> 코드와 명세가 어긋나면 명세를 먼저 갱신하고, 코드는 명세를 따라간다.

---

## 0. 폴더 구조

```
docs/
├─ AGENTS.md                       ← 본 파일 (진입점 인덱스)
│
├─ [활성 명세]
│   ├─ db_modeling.md
│   ├─ product_attribute_schema.md
│   ├─ matching_rules_revised.md
│   ├─ admin_product_input_spec.md
│   ├─ page_content_specification.md
│   ├─ wireframe_summary.md
│   ├─ product_taxonomy.md
│   ├─ skincare_product_selection_rule.md
│   ├─ skincare_rules_from_articles.md
│   ├─ content_plan.md
│   └─ 화장품 성분비교.CSV
│
├─ Rejected/                       ← 토너 MVP 범위 밖 (삭제 아님, 보류)
│   ├─ data_source_catalog.md
│   ├─ ingredient_efficacy_thresholds.md
│   └─ product_scope_and_limits.md
│
├─ Codex_Research/                 ← 시장·UX·결정 여정 조사 (00~23)
├─ ClaudeProtype/                  ← HTML mockup
└─ crawl/                          ← 스킨케어 아티클 크롤링 산출물 (P0)
```

---

## 1. 활성 명세

| 파일                                                                     | 설명                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [db_modeling.md](db_modeling.md)                                         | DB 25개 테이블 정의. 신원 3계층(devices / user_sessions / users), `products.attributes` JSONB 구조, Filter Mapping 테이블 구성. Prisma schema의 1:1 대응 기준이 된다.                                                                                                                          |
| [product_attribute_schema.md](product_attribute_schema.md)               | `products.attributes` JSONB의 카테고리별(toner/sunscreen/serum/lipcare/moisturizer/cleanser) 키 사전. 각 attribute의 value_type, options, Core/Optional 구분, 필터 매핑 후보, P0/P1 등록 우선순위, Legacy migration 표를 포함. Zod schema와 `category_attribute_definitions` seed의 단일 진실. |
| [matching_rules_revised.md](matching_rules_revised.md)                   | Priority Gate 룰, Question Visibility 조건, Product Filter Mapping 시드, Derived Facts 정의. 카테고리별 BASIC_CONDITION/PERSONALIZED 필터와 Concern Mapper의 라우팅 규칙도 같은 파일에 있다.                                                                                                   |
| [admin_product_input_spec.md](admin_product_input_spec.md)               | 관리자 제품 등록 폼의 카테고리별 필드, 마크(🟥/🟨/⬜/🤖/🔒), S3 이미지 업로드 규약, `effective_dose_met` 자동 판정 알고리즘, 검증 체크리스트, 외부 API 후보 채움 흐름.                                                                                                                         |
| [page_content_specification.md](page_content_specification.md)           | 화면(S01~S08)별 카피·질문·CTA·동적 출력 슬롯. FE 컴포넌트가 어떤 텍스트를 어떤 데이터 슬롯에 바인딩해야 하는지 정의.                                                                                                                                                                           |
| [wireframe_summary.md](wireframe_summary.md)                             | S01 Landing → S02 Priority Gate → S03 Category Decision → S06 Product Matrix → S07 Product Detail → S08 Reaction Traceback의 흐름과 화면 간 전이 조건 요약.                                                                                                                                    |
| [product_taxonomy.md](product_taxonomy.md)                               | MVP 6개 카테고리 정의. 각 카테고리의 한글 라벨, 포함 제품 형태, 제외 항목, 설계 원칙.                                                                                                                                                                                                          |
| [skincare_product_selection_rule.md](skincare_product_selection_rule.md) | 카테고리별 제품 선택 기준 원자료. matching_rules_revised의 필터 매핑이 도출된 근거.                                                                                                                                                                                                            |
| [skincare_rules_from_articles.md](skincare_rules_from_articles.md)       | 크롤링 아티클에서 추출한 스킨케어 룰. matching_rules_revised의 또 다른 근거.                                                                                                                                                                                                                   |
| [content_plan.md](content_plan.md)                                       | 룰 추출/검증 파이프라인 메모. P0~P4 단계별 산출물과 검증 방법.                                                                                                                                                                                                                                 |
| [db_seed_plan.md](db_seed_plan.md)                                       | DB 시드 설계서. 어떤 테이블을 어떤 명세에서 변환해 어떤 형식·순서로 채울지 정의. TypeScript orchestrator + 도메인별 JSON 데이터 형식, 카테고리 단위 분리, 멱등 upsert 정책 포함.                                                                                                               |
| [화장품 성분비교.CSV](./화장품%20성분비교.CSV)                           | 토너 25+종을 product_attribute_schema의 키 형식으로 큐레이터가 직접 입력한 산출물. 토너 MVP의 1차 seed 원본 데이터.                                                                                                                                                                            |

---

## 2. 보류 명세 (Rejected/)

`Rejected/` 안의 문서는 삭제된 것이 아니라 **토너 1차 MVP 범위에 포함되지 않는** 명세다. 다른 카테고리 또는 다른 단계 작업이 시작되면 활성으로 복귀할 수 있다.

| 파일                                                                                     | 설명                                                                                                                                            |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [Rejected/ingredient_efficacy_thresholds.md](Rejected/ingredient_efficacy_thresholds.md) | 식약처 기능성 인정 6개 항목의 성분별 유효 농도 임계값. serum의 `effective_dose_met` 자동 판정에 사용된다. 토너에는 직접 사용되지 않으므로 보류. |
| [Rejected/data_source_catalog.md](Rejected/data_source_catalog.md)                       | Naver 쇼핑 / 식약처 3종 / AIHub OCR / 브랜드 공식 사이트 등 외부 데이터 출처 카탈로그. 토너 MVP는 큐레이터 수동 입력만 사용하므로 보류.         |
| [Rejected/product_scope_and_limits.md](Rejected/product_scope_and_limits.md)             | 서비스의 실제 범위(루틴 가이드/제품 큐레이션)와 한계, 큐레이터 책임, 확장 가능성을 정리한 진술서. 외부 발표나 README 보강 시 활용한다.          |

> 활성 명세가 Rejected의 키/명을 참조하는 경우가 있다 (예: admin_product_input_spec의 `effective_dose_met`은 ingredient_efficacy_thresholds에 의존). 참조가 보이면 그 영역은 토너 MVP에서 비활성화된 부분이라고 이해한다.

---

## 3. 참고 폴더

| 폴더                               | 설명                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [Codex_Research/](Codex_Research/) | 시장 분석, 경쟁사 조사, 결정 여정 분석, MVP 검증 등 23편의 조사 문서. 새 기능을 정당화하거나 디자인 결정의 근거가 필요할 때 인용한다. |
| [ClaudeProtype/](ClaudeProtype/)   | mobile/web HTML mockup. UI 톤·레이아웃 참고용.                                                                                        |
| [crawl/](crawl/)                   | P0 단계의 스킨케어 아티클 크롤링 산출물. skincare_rules_from_articles의 원본 데이터 위치.                                             |

각 폴더 안의 `AGENTS.md`가 해당 폴더의 진입점이다.

---

## 4. 기여 규칙

- 모든 문서 상단에 작성일을 명시한다.
- 표 추가 시 한국어 + 영문 키를 같이 둔다 (예: `category_key` / `한글 라벨`).
- 예시 JSON은 실제 사용 가능한 값으로 둔다 (placeholder 금지).
- 카테고리별 명세에는 "MVP에서 제외" 섹션을 두어 범위 침범을 막는다.
- 명세를 갱신하면 [memory/project_decisions.md](../memory/project_decisions.md)에 결정과 사유를 기록한다.
- 더 이상 필요 없는 명세는 삭제하지 말고 `Rejected/`로 이동한다.
