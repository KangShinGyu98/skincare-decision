# docs/Data/ — DB 데이터 모델 폴더

> Data 폴더는 **DB 데이터 모델·스키마·ERD**에 대한 폴더입니다. 현실 도메인을 어떤 테이블로 매핑했고, Prisma/migration이 실제로 어떤 자료형·인덱스를 가지고 있으며, 화면별로 어떤 데이터를 읽고 쓰는지를 정리합니다.

| 파일명                                                       | 목적                                                                | 구성요소                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [db_modeling.md](db_modeling.md)                             | 현실 문제를 DB 테이블로 매핑하는 과정 정리                          | 테이블 목록(25개), 컬럼 정의, 관계도, 신원 3계층, question 사전, attribute 사전       |
| [db_schema_validation.md](db_schema_validation.md)           | schema.prisma + migration.sql과 db_modeling.md의 교차 검증 레퍼런스 | Prisma→PG 자료형 매핑, enum 목록, 테이블별 컬럼 표, 인덱스 목록, FK 정책, docs 불일치 |
| [screen_data_specification.md](screen_data_specification.md) | 화면(S01~S08)별 데이터 흐름 정의 — 어디서 읽고 어디에 쓰는지        | 화면별 Read / Write / Computed / Next 데이터 + 테이블 매핑 + Service flow             |
| [ERD/](ERD/)                                                 | ERD 시각화 다이어그램 이미지 모음                                   | (서브폴더) Skincare ERD PNG 파일들                                                    |
