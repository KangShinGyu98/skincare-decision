# ADR-0001 Product Barcode Policy

> 이 파일은 ADR 작성 형식을 보여주기 위한 예시 파일입니다.

## Context

상품 바코드를 products 테이블에 직접 저장할지 결정이 필요했다.

## Decision

products 테이블에는 barcode 컬럼을 추가하지 않는다.

## Reason

바코드는 외부 lookup 기반으로 처리하며,
필요 시 별도 mapping 테이블로 분리 가능하다.
