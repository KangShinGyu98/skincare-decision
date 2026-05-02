# docs/ — 명세 문서 (Source of Truth)

> 코드와 명세가 어긋나면 **명세를 먼저 갱신**한다. 코드는 명세를 따라간다.

## 문서 지도

| 파일                                             | 역할                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| [db_modeling.md](db_modeling.md)                 | 25개 테이블 + 신원 3계층 + JSONB attribute + Filter Mapping. Prisma schema 1:1 대응 기준.   |
| [product_attribute_schema.md](product_attribute_schema.md) | `products.attributes`의 카테고리별 키 사전. Zod schema 작성 시 기준.                |
| [matching_rules_revised.md](matching_rules_revised.md) | Priority Rule seed, question visibility, filter mapping seed, derived facts.            |
| [page_content_specification_revised.md](page_content_specification_revised.md) | 화면별 카피·질문·CTA·동적 출력 슬롯. FE 컴포넌트 작성 시 기준.       |
| [wireframe_summary.md](wireframe_summary.md)     | 와이어프레임 흐름 요약 (S01 → S08).                                                         |
| [product_taxonomy.md](product_taxonomy.md)       | MVP 6개 카테고리 정의와 포함/제외 범위.                                                    |
| [skincare_product_selection_rule.md](skincare_product_selection_rule.md) | 카테고리별 선택 기준 원자료.                                          |
| [content_plan.md](content_plan.md)               | 룰 추출/검증 파이프라인 메모 (P0~P4 단계).                                                  |

## 진입 규칙

1. 새 화면을 만들 때: `page_content_specification_revised.md` → `wireframe_summary.md` → `matching_rules_revised.md` 순.
2. 새 attribute 키를 추가할 때: `product_attribute_schema.md` 갱신 → Zod schema → Prisma seed.
3. 새 Priority Rule을 추가할 때: `matching_rules_revised.md` 3.2 / 3.3 갱신 → seed 스크립트 갱신.
4. DB 컬럼이 바뀌면: `db_modeling.md` 갱신 → Prisma migration → memory/project_decisions.md에 기록.

## 기여 규칙

- 모든 문서 상단에 작성일 명시.
- 표 추가 시 한국어 + 영문 키를 같이 둔다 (예: `category_key` / `한글 라벨`).
- 예시 JSON은 실제 사용 가능한 값으로 (placeholder 금지).
- "MVP에서 제외" 섹션을 명시해 범위 침범을 막는다.
