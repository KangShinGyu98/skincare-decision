# docs/ContentSpec/ — 콘텐츠·룰·UI 명세 폴더

> ContentSpec 폴더는 서비스의 **콘텐츠 / 비즈니스 룰 / UI 명세**에 대한 폴더입니다. 화면에 노출되는 텍스트, 카테고리별 attribute 사전, 매칭 룰, 관리자 입력 폼 등 "데이터가 어떻게 보이고 어떻게 매칭되는가"를 정의합니다.

| 파일명                                                                   | 목적                                                                        | 구성요소                                                                            |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [admin_product_input_spec.md](admin_product_input_spec.md)               | 관리자가 제품을 등록할 때 사용할 입력 폼 명세 정의                          | 카테고리별 필드, 마크 시스템(🟥/🟨/⬜/🤖/🔒), S3 업로드 규약, 자동 판정 알고리즘   |
| [matching_rules_revised.md](matching_rules_revised.md)                   | Priority Gate 룰, 질문 노출 조건, Product Filter Mapping 시드 정의          | Rule 목록, 발동 Condition, Derived Facts, Concern Mapper 라우팅                     |
| [page_content_specification.md](page_content_specification.md)           | S01~S08 화면별 카피·질문·CTA·동적 슬롯 정의                                 | 화면별 텍스트 / 데이터 슬롯 / FE 바인딩 명세                                        |
| [product_attribute_schema.md](product_attribute_schema.md)               | `products.attributes` JSONB의 카테고리별(toner/sunscreen/...) 키 사전       | attribute key, value_type, options, Core/Optional 구분, 필터 매핑 후보, P0/P1 순위  |
| [product_taxonomy.md](product_taxonomy.md)                               | MVP 6개 카테고리(toner/sunscreen/serum/lipcare/moisturizer/cleanser) 정의   | 카테고리 한글 라벨, 포함 제품 형태, 제외 항목, 설계 원칙                            |
| [skincare_product_selection_rule.md](skincare_product_selection_rule.md) | 카테고리별 제품 선택 기준 원자료 (matching_rules의 근거)                    | 큐레이터가 정리한 카테고리별 선택 기준 텍스트                                       |
| [wireframe_summary.md](wireframe_summary.md)                             | 화면 전이와 흐름 요약 (S01 Landing → S08 Traceback)                         | 화면 정의, 흐름 다이어그램, 핵심 Feature 5종, 관리자 화면 명세                      |
