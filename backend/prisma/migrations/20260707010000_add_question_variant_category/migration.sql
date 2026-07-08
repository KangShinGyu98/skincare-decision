ALTER TABLE "question_variants"
ADD COLUMN "category" VARCHAR(50);

CREATE INDEX "idx_question_variants_screen_ui_section_category_sort_order"
ON "question_variants"("screen", "ui_section", "category", "sort_order");
