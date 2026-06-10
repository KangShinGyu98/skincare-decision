-- CreateEnum
CREATE TYPE "users_role_enum" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "questions_answer_type_enum" AS ENUM ('BOOLEAN', 'THREE_CHOICE', 'FOUR_CHOICE', 'FIVE_CHOICE', 'SINGLE_CHOICE', 'MULTI_CHOICE');

-- CreateEnum
CREATE TYPE "category_attribute_definitions_value_type_enum" AS ENUM ('BOOLEAN', 'ENUM', 'NUMBER', 'MULTI_ENUM', 'STRING');

-- CreateEnum
CREATE TYPE "question_variants_screen_enum" AS ENUM ('priority_gate', 'context');

-- CreateEnum
CREATE TYPE "question_variants_ui_section_enum" AS ENUM ('life_routine', 'owned_products', 'basic', 'category');

-- CreateEnum
CREATE TYPE "comparison_operator_enum" AS ENUM ('EQ', 'IN', 'CONTAINS', 'GTE', 'LTE', 'NEQ');

-- CreateEnum
CREATE TYPE "condition_state_enum" AS ENUM ('REQUIRED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "user_responses_source_enum" AS ENUM ('priority_gate', 'context', 'concern', 'traceback');

-- CreateEnum
CREATE TYPE "priority_rules_result_type_enum" AS ENUM ('STOP', 'HOLD', 'CAUTION', 'PASS', 'ROUTE_CATEGORY');

-- CreateEnum
CREATE TYPE "products_volume_unit_enum" AS ENUM ('ML', 'G', 'L', 'MG');

-- CreateEnum
CREATE TYPE "products_count_unit_enum" AS ENUM ('SHEET', 'PIECE', 'PACK');

-- CreateEnum
CREATE TYPE "product_filter_definitions_input_type_enum" AS ENUM ('NUMBER', 'SELECT', 'MULTI_SELECT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "product_matrix_filter_definitions_kind_enum" AS ENUM ('ATTRIBUTE', 'COMPUTED');

-- CreateEnum
CREATE TYPE "product_matrix_filter_states_source_enum" AS ENUM ('DIRECT', 'CATEGORY_DECISION_CTA', 'MANUAL', 'RESTORED');

-- CreateEnum
CREATE TYPE "reaction_report_products_type_enum" AS ENUM ('PROBLEM', 'OK');

-- CreateEnum
CREATE TYPE "suspected_causes_confidence_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "avoidance_rules_action_enum" AS ENUM ('AVOID', 'CAUTION');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" "users_role_enum" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_users" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_devices" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "entry_path" VARCHAR(255) NOT NULL,
    "referrer" TEXT,
    "logged_in_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_user_sessions" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_events" (
    "id" BIGSERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "event_name" VARCHAR(100) NOT NULL,
    "screen" VARCHAR(100) NOT NULL,
    "element_id" VARCHAR(100),
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_session_events" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "answer_type" "questions_answer_type_enum" NOT NULL,
    "answer_values" INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_questions" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_variants" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "answers" TEXT[],
    "screen" "question_variants_screen_enum" NOT NULL,
    "ui_section" "question_variants_ui_section_enum" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_question_variants" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_visibility_conditions" (
    "id" UUID NOT NULL,
    "question_variant_id" UUID NOT NULL,
    "operator" "comparison_operator_enum" NOT NULL,
    "value" INTEGER NOT NULL,
    "state" "condition_state_enum" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "pk_question_visibility_conditions" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_responses" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "question_id" UUID NOT NULL,
    "value" INTEGER[],
    "source" "user_responses_source_enum" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "pk_user_responses" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priority_rules" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "priority" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "result_type" "priority_rules_result_type_enum" NOT NULL,
    "result_title" TEXT NOT NULL,
    "result_description" TEXT NOT NULL,
    "hold_categories" JSONB,
    "recommend_category_id" UUID,
    "cta_label" VARCHAR(100),
    "cta_target" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_priority_rules" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priority_rule_conditions" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "operator" "comparison_operator_enum" NOT NULL,
    "value" INTEGER[],
    "state" "condition_state_enum" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "pk_priority_rule_conditions" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_runs" (
    "id" BIGSERIAL NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID NOT NULL,
    "decision_type" VARCHAR(50) NOT NULL,
    "source_screen" VARCHAR(100) NOT NULL,
    "category_id" UUID,
    "filter_state_id" UUID,
    "result_type" VARCHAR(50),
    "result_title" TEXT,
    "result_description" TEXT,
    "cta_label" VARCHAR(100),
    "cta_target" VARCHAR(255),
    "input_snapshot" JSONB NOT NULL,
    "applied_filters_snapshot" JSONB NOT NULL,
    "result_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_decision_runs" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_brands" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_product_categories" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attribute_definitions" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "value_type" "category_attribute_definitions_value_type_enum" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_category_attribute_definitions" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "price_krw" INTEGER NOT NULL,
    "volume_amount" DECIMAL(10,2),
    "volume_unit" "products_volume_unit_enum",
    "count_amount" INTEGER,
    "count_unit" "products_count_unit_enum",
    "volume_label" VARCHAR(100),
    "image_url" TEXT,
    "purchase_url" TEXT,
    "attributes" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_products" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_filter_definitions" (
    "id" UUID NOT NULL,
    "attribute_definition_id" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "default_operator" "comparison_operator_enum" NOT NULL,
    "allowed_operators" "comparison_operator_enum"[],
    "default_value" JSONB NOT NULL,
    "input_type" "product_filter_definitions_input_type_enum" NOT NULL,
    "options" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_product_filter_definitions" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_matrix_filter_definitions" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "product_filter_definition_id" UUID,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "definition_kind" "product_matrix_filter_definitions_kind_enum" NOT NULL,
    "computed_filter_key" VARCHAR(100),
    "operator_override" "comparison_operator_enum",
    "value_override" JSONB,
    "condition_payload" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_manual_selectable" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_product_matrix_filter_definitions" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_filter_mappings" (
    "id" UUID NOT NULL,
    "trigger_question_id" UUID NOT NULL,
    "trigger_operator" "comparison_operator_enum" NOT NULL,
    "trigger_value" INTEGER[],
    "matrix_filter_definition_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_question_filter_mappings" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_matrix_filter_states" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "category_id" UUID NOT NULL,
    "source" "product_matrix_filter_states_source_enum" NOT NULL,
    "filters" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "pk_product_matrix_filter_states" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL,
    "name_ko" VARCHAR(200) NOT NULL,
    "name_en" VARCHAR(200) NOT NULL,
    "inci_name" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_ingredients" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_ingredients" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "raw_text" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_product_ingredients" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_groups" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_ingredient_groups" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_group_members" (
    "id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "ingredient_group_id" UUID NOT NULL,

    CONSTRAINT "pk_ingredient_group_members" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction_reports" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "symptoms" JSONB NOT NULL,
    "affected_areas" JSONB NOT NULL,
    "onset_timing" VARCHAR(100),
    "memo" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_reaction_reports" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction_report_products" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" "reaction_report_products_type_enum" NOT NULL,
    "used_period" VARCHAR(100),
    "used_count" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_reaction_report_products" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspected_causes" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "ingredient_group_id" UUID NOT NULL,
    "confidence" "suspected_causes_confidence_enum" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_suspected_causes" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avoidance_rules" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "ingredient_group_id" UUID NOT NULL,
    "action" "avoidance_rules_action_enum" NOT NULL,
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pk_avoidance_rules" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_questions_key" ON "questions"("key");

-- CreateIndex
CREATE INDEX "idx_question_variants_question_id" ON "question_variants"("question_id");

-- CreateIndex
CREATE INDEX "idx_question_variants_screen_ui_section_sort_order" ON "question_variants"("screen", "ui_section", "sort_order");

-- CreateIndex
CREATE INDEX "idx_question_visibility_conditions_question_variant_id" ON "question_visibility_conditions"("question_variant_id");

-- CreateIndex
CREATE INDEX "idx_priority_rule_conditions_question_id" ON "priority_rule_conditions"("question_id");

-- CreateIndex
CREATE INDEX "idx_priority_rule_conditions_rule_id" ON "priority_rule_conditions"("rule_id");

-- CreateIndex
CREATE INDEX "idx_decision_runs_device_id_decision_type_created_at" ON "decision_runs"("device_id", "decision_type", "created_at");

-- CreateIndex
CREATE INDEX "idx_decision_runs_session_id" ON "decision_runs"("session_id");

-- CreateIndex
CREATE INDEX "idx_decision_runs_user_id_decision_type_created_at" ON "decision_runs"("user_id", "decision_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_brands_name" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_categories_key" ON "product_categories"("key");

-- CreateIndex
CREATE INDEX "idx_category_attribute_definitions_category_id_sort_order" ON "category_attribute_definitions"("category_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "uq_category_attribute_definitions_category_id_key" ON "category_attribute_definitions"("category_id", "key");

-- CreateIndex
CREATE INDEX "idx_products_category_id_is_active_sort_order" ON "products"("category_id", "is_active", "sort_order");

-- CreateIndex
CREATE INDEX "idx_product_filter_defs_attr_def_id_active_sort" ON "product_filter_definitions"("attribute_definition_id", "is_active", "sort_order");

-- CreateIndex
CREATE INDEX "idx_product_matrix_filter_defs_category_id_active_sort" ON "product_matrix_filter_definitions"("category_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_matrix_filter_definitions_category_id_key" ON "product_matrix_filter_definitions"("category_id", "key");

-- CreateIndex
CREATE INDEX "idx_question_filter_mappings_trigger_question_id" ON "question_filter_mappings"("trigger_question_id");

-- CreateIndex
CREATE INDEX "idx_question_filter_mappings_matrix_filter_definition_id" ON "question_filter_mappings"("matrix_filter_definition_id");

-- CreateIndex
CREATE INDEX "idx_product_matrix_filter_states_device_id_category_id" ON "product_matrix_filter_states"("device_id", "category_id");

-- CreateIndex
CREATE INDEX "idx_product_matrix_filter_states_user_id_category_id" ON "product_matrix_filter_states"("user_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ingredients_inci_name" ON "ingredients"("inci_name");

-- CreateIndex
CREATE INDEX "idx_product_ingredients_ingredient_id" ON "product_ingredients"("ingredient_id");

-- CreateIndex
CREATE INDEX "idx_product_ingredients_product_id" ON "product_ingredients"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_ingredients_product_id_ingredient_id" ON "product_ingredients"("product_id", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_ingredients_product_id_order_index" ON "product_ingredients"("product_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ingredient_groups_key" ON "ingredient_groups"("key");

-- CreateIndex
CREATE INDEX "idx_ingredient_group_members_ingredient_group_id" ON "ingredient_group_members"("ingredient_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ingredient_group_members_ingredient_id_ingredient_group_id" ON "ingredient_group_members"("ingredient_id", "ingredient_group_id");

-- CreateIndex
CREATE INDEX "idx_reaction_reports_device_id_created_at" ON "reaction_reports"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_reaction_reports_user_id_created_at" ON "reaction_reports"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_reaction_report_products_product_id" ON "reaction_report_products"("product_id");

-- CreateIndex
CREATE INDEX "idx_reaction_report_products_report_id" ON "reaction_report_products"("report_id");

-- CreateIndex
CREATE INDEX "idx_suspected_causes_ingredient_group_id" ON "suspected_causes"("ingredient_group_id");

-- CreateIndex
CREATE INDEX "idx_suspected_causes_report_id" ON "suspected_causes"("report_id");

-- CreateIndex
CREATE INDEX "idx_avoidance_rules_device_id_is_active_updated_at" ON "avoidance_rules"("device_id", "is_active", "updated_at");

-- CreateIndex
CREATE INDEX "idx_avoidance_rules_ingredient_group_id" ON "avoidance_rules"("ingredient_group_id");

-- CreateIndex
CREATE INDEX "idx_avoidance_rules_user_id_is_active_updated_at" ON "avoidance_rules"("user_id", "is_active", "updated_at");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "fk_devices_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "fk_user_sessions_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "fk_user_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_events" ADD CONSTRAINT "fk_session_events_session_id" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_variants" ADD CONSTRAINT "fk_question_variants_question_id" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_visibility_conditions" ADD CONSTRAINT "fk_question_visibility_conditions_question_variant_id" FOREIGN KEY ("question_variant_id") REFERENCES "question_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_responses" ADD CONSTRAINT "fk_user_responses_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_responses" ADD CONSTRAINT "fk_user_responses_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_responses" ADD CONSTRAINT "fk_user_responses_question_id" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_rules" ADD CONSTRAINT "fk_priority_rules_recommend_category_id" FOREIGN KEY ("recommend_category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_rule_conditions" ADD CONSTRAINT "fk_priority_rule_conditions_rule_id" FOREIGN KEY ("rule_id") REFERENCES "priority_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_rule_conditions" ADD CONSTRAINT "fk_priority_rule_conditions_question_id" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_runs" ADD CONSTRAINT "fk_decision_runs_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_runs" ADD CONSTRAINT "fk_decision_runs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_runs" ADD CONSTRAINT "fk_decision_runs_session_id" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attribute_definitions" ADD CONSTRAINT "fk_category_attribute_definitions_category_id" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "fk_products_brand_id" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "fk_products_category_id" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_filter_definitions" ADD CONSTRAINT "fk_product_filter_definitions_attribute_definition_id" FOREIGN KEY ("attribute_definition_id") REFERENCES "category_attribute_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matrix_filter_definitions" ADD CONSTRAINT "fk_product_matrix_filter_definitions_category_id" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matrix_filter_definitions" ADD CONSTRAINT "fk_product_matrix_filter_defs_product_filter_definition_id" FOREIGN KEY ("product_filter_definition_id") REFERENCES "product_filter_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_filter_mappings" ADD CONSTRAINT "fk_question_filter_mappings_trigger_question_id" FOREIGN KEY ("trigger_question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_filter_mappings" ADD CONSTRAINT "fk_question_filter_mappings_matrix_filter_definition_id" FOREIGN KEY ("matrix_filter_definition_id") REFERENCES "product_matrix_filter_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matrix_filter_states" ADD CONSTRAINT "fk_product_matrix_filter_states_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matrix_filter_states" ADD CONSTRAINT "fk_product_matrix_filter_states_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matrix_filter_states" ADD CONSTRAINT "fk_product_matrix_filter_states_category_id" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "fk_product_ingredients_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "fk_product_ingredients_ingredient_id" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_group_members" ADD CONSTRAINT "fk_ingredient_group_members_ingredient_id" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_group_members" ADD CONSTRAINT "fk_ingredient_group_members_ingredient_group_id" FOREIGN KEY ("ingredient_group_id") REFERENCES "ingredient_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_reports" ADD CONSTRAINT "fk_reaction_reports_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_reports" ADD CONSTRAINT "fk_reaction_reports_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_report_products" ADD CONSTRAINT "fk_reaction_report_products_report_id" FOREIGN KEY ("report_id") REFERENCES "reaction_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_report_products" ADD CONSTRAINT "fk_reaction_report_products_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspected_causes" ADD CONSTRAINT "fk_suspected_causes_report_id" FOREIGN KEY ("report_id") REFERENCES "reaction_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspected_causes" ADD CONSTRAINT "fk_suspected_causes_ingredient_group_id" FOREIGN KEY ("ingredient_group_id") REFERENCES "ingredient_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoidance_rules" ADD CONSTRAINT "fk_avoidance_rules_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoidance_rules" ADD CONSTRAINT "fk_avoidance_rules_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoidance_rules" ADD CONSTRAINT "fk_avoidance_rules_ingredient_group_id" FOREIGN KEY ("ingredient_group_id") REFERENCES "ingredient_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 1. questions.answer_count generated column
ALTER TABLE questions
ADD COLUMN answer_count integer
GENERATED ALWAYS AS (cardinality(answer_values)) STORED;

ALTER TABLE questions
ADD CONSTRAINT uq_questions_id_answer_count
UNIQUE (id, answer_count);

-- 2. question_variants.answer_count generated column
ALTER TABLE question_variants
ADD COLUMN answer_count integer
GENERATED ALWAYS AS (cardinality(answers)) STORED;

ALTER TABLE question_variants
ADD CONSTRAINT fk_question_variants_question_answer_count
FOREIGN KEY (question_id, answer_count)
REFERENCES questions (id, answer_count);

-- 3. user_responses partial unique indexes
CREATE UNIQUE INDEX uq_user_responses_anonymous_device_question
ON user_responses (device_id, question_id)
WHERE user_id IS NULL;

CREATE UNIQUE INDEX uq_user_responses_user_question
ON user_responses (user_id, question_id)
WHERE user_id IS NOT NULL;

-- 4. product_matrix_filter_definitions XOR CHECK constraint
ALTER TABLE product_matrix_filter_definitions
ADD CONSTRAINT chk_product_matrix_filter_definitions_kind_target
CHECK (
  (
    definition_kind = 'ATTRIBUTE'
    AND product_filter_definition_id IS NOT NULL
    AND computed_filter_key IS NULL
  )
  OR
  (
    definition_kind = 'COMPUTED'
    AND product_filter_definition_id IS NULL
    AND computed_filter_key IS NOT NULL
  )
);
