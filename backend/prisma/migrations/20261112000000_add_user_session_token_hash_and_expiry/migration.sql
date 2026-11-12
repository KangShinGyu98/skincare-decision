-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "token_hash" VARCHAR(64),
ADD COLUMN     "expires_at" TIMESTAMPTZ;

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_sessions_token_hash" ON "user_sessions"("token_hash");
