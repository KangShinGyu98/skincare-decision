#!/usr/bin/env bash
# RDS -> Supabase 데이터 이전 (ADR-0008). 한 번만 쓰는 스크립트다.
#
# 스키마는 Prisma migration 으로 만들고, 데이터만 옮긴다.
# (pg_dump 로 스키마까지 옮기면 RDS(18)와 Supabase 의 Postgres 버전 차이에 걸릴 수 있다.)
#
# 사용법:
#   SOURCE_URL='postgresql://...'  # RDS. SSM 포트포워딩을 열어둔 localhost 주소
#   TARGET_URL='postgresql://...'  # Supabase 의 Session pooler(5432) 주소
#   ./scripts/migrate-db-to-supabase.sh
set -euo pipefail

: "${SOURCE_URL:?SOURCE_URL(RDS) 이 필요합니다}"
: "${TARGET_URL:?TARGET_URL(Supabase session pooler) 이 필요합니다}"

cd "$(dirname "$0")/../backend"
DUMP_FILE="$(mktemp -t skincare-data-XXXXXX.sql)"
trap 'rm -f "$DUMP_FILE"' EXIT

echo "1/4 Supabase 에 스키마 생성 (prisma migrate deploy)"
NODE_ENV=production DATABASE_URL="$TARGET_URL" pnpm exec prisma migrate deploy

echo "2/4 RDS 에서 데이터만 덤프"
# 세션은 옮기지 않는다: 기존 Redis 세션은 어차피 사라지므로 모든 사용자가 새 세션으로 시작한다.
# user_sessions 를 참조하는 session_events, decision_runs 가 있어 row 자체는 그대로 옮긴다.
pg_dump "$SOURCE_URL" \
  --data-only --no-owner --no-privileges \
  --schema=public --exclude-table=_prisma_migrations \
  > "$DUMP_FILE"

echo "3/4 Supabase 로 복원"
# pg_dump 가 FK 의존 순서대로 테이블을 내보내므로 그대로 넣는다. 하나라도 실패하면 전체를 되돌린다.
psql "$TARGET_URL" -v ON_ERROR_STOP=1 --quiet --single-transaction -f "$DUMP_FILE"

echo "4/4 테이블별 row 수 비교"
COUNT_SQL="SELECT string_agg(format('SELECT %L AS t, count(*) FROM %I', tablename, tablename), ' UNION ALL ' ORDER BY tablename) FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'"
diff \
  <(psql "$SOURCE_URL" -At -c "$(psql "$SOURCE_URL" -At -c "$COUNT_SQL")") \
  <(psql "$TARGET_URL" -At -c "$(psql "$TARGET_URL" -At -c "$COUNT_SQL")") \
  && echo "모든 테이블의 row 수가 일치합니다."
