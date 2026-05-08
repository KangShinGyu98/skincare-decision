# crawl/ — 스킨케어 룰 추출용 크롤링 산출물 (P0 단계 종료)

> 영문 스킨케어 아티클 / 제목 / 메모 크롤링 결과. `docs/skincare_product_selection_rule.md` 작성에 사용한 원자료다.
> **추가 크롤링은 새 룰이 필요할 때만** 수행한다.

## 폴더 구조

| 항목                            | 설명                                            |
| ------------------------------- | ----------------------------------------------- |
| articles/                       | 영문 스킨케어 아티클 텍스트 덤프                |
| notes/                          | 크롤링 중 남긴 메모                             |
| consumer_titles.txt             | 소비자 콘텐츠 제목 후보                         |
| crawled_titles.txt              | 크롤링 완료된 제목 목록                         |
| skincare_rules_from_articles.md | 아티클에서 추출한 룰 요약 (`docs/`로 이관 완료) |

## 진입 규칙

1. 본 폴더는 **읽기 전용**이 기본. 코드/명세에 직접 반영하지 않는다.
2. 새 룰이 필요하면 `scripts/`의 크롤러를 재실행하고, 결과를 본 폴더에 넣는다.
3. 룰 추가 시 `docs/skincare_product_selection_rule.md` → `docs/matching_rules_revised.md` 순으로 반영하고 `memory/project_decisions.md`에 근거를 기록.
4. 영문 텍스트는 한국 사용자 의도와 차이가 있을 수 있다 — 그대로 번역하지 말고 `docs/skincare_product_selection_rule.md` 한국어 표현을 따른다.

## 관련 스크립트

- `../scripts/crawl_titles.py`
- `../scripts/crawl_articles.py`
- `../scripts/organize_articles.py`
