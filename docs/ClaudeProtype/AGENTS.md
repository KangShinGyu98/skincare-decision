# ClaudeProtype/ — HTML mockup 프로토타입

> Claude로 만든 정적 HTML mockup. 명세 시각화 및 클라이언트 공유용.
> 실제 frontend 코드의 직접 소스가 아니다.

## 파일

| 파일                               | 설명                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| mockup.html                        | 모바일 우선 mockup                                                                                                    |
| mockup-web.html                    | 웹 mockup                                                                                                             |
| admin-product-matrix-uploader.html | Product Matrix 관리자 입력용 단일 HTML 도구. category select, dynamic attributes, image-folder save, JSON export 지원 |

## 진입 규칙

1. mockup은 명세 검증용으로만 본다. 실제 컴포넌트는 `frontend/`에서 shadcn/ui로 구현.
2. 새 mockup이 추가되면 본 인덱스에 한 줄 등록.
3. mockup의 인터랙션이 명세보다 새로우면 `docs/page_content_specification_revised.md`에 반영 후 mockup을 갱신.
