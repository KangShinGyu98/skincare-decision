ALTER TABLE "product_categories" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

UPDATE "product_categories"
SET "sort_order" = CASE "key"
    WHEN 'toner' THEN 10
    WHEN 'sunscreen' THEN 20
    WHEN 'serum' THEN 30
    WHEN 'lipcare' THEN 40
    WHEN 'moisturizer' THEN 50
    WHEN 'cleanser' THEN 60
    ELSE 999
  END;

CREATE INDEX "idx_product_categories_sort_order" ON "product_categories"("sort_order");
