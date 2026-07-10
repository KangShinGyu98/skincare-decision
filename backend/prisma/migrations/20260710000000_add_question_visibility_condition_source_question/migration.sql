-- Add source/base question to question visibility conditions.
ALTER TABLE "question_visibility_conditions"
ADD COLUMN "condition_question_id" UUID;

UPDATE "question_visibility_conditions" AS condition
SET "condition_question_id" = variant."question_id"
FROM "question_variants" AS variant
WHERE condition."question_variant_id" = variant."id";

ALTER TABLE "question_visibility_conditions"
ALTER COLUMN "condition_question_id" SET NOT NULL;

CREATE INDEX "idx_question_visibility_conditions_condition_question_id"
ON "question_visibility_conditions"("condition_question_id");

ALTER TABLE "question_visibility_conditions"
ADD CONSTRAINT "fk_question_visibility_conditions_condition_question_id"
FOREIGN KEY ("condition_question_id")
REFERENCES "questions"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
