# crawl/articles/ — 크롤링된 영문 스킨케어 아티클

> 영문 카피/룰 원자료. 한국어 명세와 직접 매핑되지 않을 수 있다.

## 구성

- 파일명: `{slug}.txt` (kebab-case)
- 내용: 본문 텍스트만 (HTML 태그 제거됨)
- 출처: `../scripts/crawl_articles.py` 실행 결과

## 진입 규칙

1. 명세에 인용할 때는 파일 슬러그를 명시한다 (예: `crawl/articles/are-natural-ingredients-better-in-body-lotions.txt`).
2. **번역하지 말고 핵심 룰만 추출**해서 `docs/ContentSpec/skincare_product_selection_rule.md`에 한국어로 정리.
3. MVP 범위 외 카테고리(베이비 케어 / 비어드 케어 등) 아티클이 다수 존재 — 사용 시 카테고리 확인 후 채택.
4. 본 폴더는 읽기 전용. 추가 크롤링은 `../scripts/crawl_articles.py`로 수행 후 결과만 누적.
