# scripts/ — 크롤링 / API 탐색 Python 스크립트

> 본 서비스의 런타임 코드가 아니다. 데이터 수집·1회성 작업용 Python 스크립트 모음.

## 파일

| 파일                  | 역할                                                            |
| --------------------- | --------------------------------------------------------------- |
| crawl_titles.py       | 크롤링 후보 제목 수집                                           |
| crawl_articles.py     | 본문 크롤링 (`../crawl/articles/`로 출력)                        |
| organize_articles.py  | 다운로드된 아티클 정리 / 중복 제거                              |
| find_api.py           | 후보 사이트의 내부 API 탐색 v1                                  |
| find_api2.py          | 후보 사이트의 내부 API 탐색 v2                                  |

## 진입 규칙

1. Python 3.11+ + Playwright 또는 Selenium 의존. 가상환경 권장.
2. 새 스크립트를 추가하면 본 인덱스에 한 줄 등록하고, 파일 최상단에 docstring으로 목적·사용 예시·산출물 위치를 기록한다.
3. 스크립트 산출물(텍스트/JSON)은 `../crawl/`에 저장하고, 본 폴더에 결과를 두지 않는다.
4. 본 폴더 코드는 백엔드 빌드와 무관하므로 `tsconfig`, `pnpm` 등에 포함하지 않는다.
5. 크롤링 대상 사이트의 `robots.txt`와 약관을 준수한다.

## 의존성 설치 (예시)

```bash
python -m venv .venv
.venv\Scripts\activate    # Windows PowerShell
pip install playwright requests beautifulsoup4 lxml
playwright install chromium
```
