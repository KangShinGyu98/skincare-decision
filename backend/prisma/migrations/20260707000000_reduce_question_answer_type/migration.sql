ALTER TYPE "questions_answer_type_enum" RENAME TO "questions_answer_type_enum_old";

CREATE TYPE "questions_answer_type_enum" AS ENUM ('SINGLE_CHOICE', 'MULTI_CHOICE');

ALTER TABLE "questions"
ALTER COLUMN "answer_type" TYPE "questions_answer_type_enum"
USING (
  CASE
    WHEN "answer_type"::text = 'MULTI_CHOICE' THEN 'MULTI_CHOICE'
    ELSE 'SINGLE_CHOICE'
  END
)::"questions_answer_type_enum";

DROP TYPE "questions_answer_type_enum_old";
