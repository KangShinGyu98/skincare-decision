-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_id" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_google_id" ON "users"("google_id");
