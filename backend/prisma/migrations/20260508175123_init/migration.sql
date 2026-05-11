-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FactGroup" AS ENUM ('LIFE', 'ROUTINE', 'PRODUCT', 'CONTEXT', 'CATEGORY', 'REACTION');

-- CreateEnum
CREATE TYPE "FactValueType" AS ENUM ('BOOLEAN', 'ENUM', 'MULTI_ENUM', 'NUMBER', 'JSON');

-- CreateEnum
CREATE TYPE "AttributeValueType" AS ENUM ('BOOLEAN', 'ENUM', 'NUMBER', 'MULTI_ENUM', 'STRING');

-- CreateEnum
CREATE TYPE "QuestionInputType" AS ENUM ('BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'CHECKBOX', 'TAG');

-- CreateEnum
CREATE TYPE "QuestionScreen" AS ENUM ('priority_gate', 'context');

-- CreateEnum
CREATE TYPE "ComparisonOperator" AS ENUM ('EQ', 'IN', 'CONTAINS', 'GTE', 'LTE', 'NEQ');

-- CreateEnum
CREATE TYPE "ConditionState" AS ENUM ('REQUIRED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "UserFactSource" AS ENUM ('priority_gate', 'context', 'concern', 'traceback');

-- CreateEnum
CREATE TYPE "PriorityResultType" AS ENUM ('STOP', 'HOLD', 'CAUTION', 'PASS', 'ROUTE_CATEGORY');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('PRIORITY_GATE', 'CATEGORY_DECISION', 'PRODUCT_MATRIX', 'REACTION_TRACEBACK');

-- CreateEnum
CREATE TYPE "PriceBand" AS ENUM ('UNDER_20000', 'BETWEEN_20000_50000', 'OVER_50000');

-- CreateEnum
CREATE TYPE "FilterMode" AS ENUM ('HARD_FILTER', 'EXCLUDE', 'CAUTION', 'SORT', 'TAG');

-- CreateEnum
CREATE TYPE "FilterType" AS ENUM ('BASIC_CONDITION', 'PERSONALIZED');

-- CreateEnum
CREATE TYPE "ProductMatrixFilterStateSource" AS ENUM ('DIRECT', 'CATEGORY_DECISION_CTA', 'MANUAL', 'RESTORED');

-- CreateEnum
CREATE TYPE "ReactionReportProductType" AS ENUM ('PROBLEM', 'OK');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AvoidanceAction" AS ENUM ('AVOID', 'CAUTION');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "ab_variant" VARCHAR(100),
    "status" "SessionStatus" NOT NULL,
    "entry_path" VARCHAR(255) NOT NULL,
    "referrer" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_events" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "event_name" VARCHAR(100) NOT NULL,
    "screen" VARCHAR(100) NOT NULL,
    "element_id" VARCHAR(100),
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_definitions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "group" "FactGroup" NOT NULL,
    "value_type" "FactValueType" NOT NULL,
    "options" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fact_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_questions" (
    "id" UUID NOT NULL,
    "fact_key" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "question" TEXT NOT NULL,
    "input_type" "QuestionInputType" NOT NULL,
    "options" JSONB,
    "screen" "QuestionScreen" NOT NULL,
    "ui_section" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_visibility_conditions" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "fact_key" VARCHAR(100) NOT NULL,
    "operator" "ComparisonOperator" NOT NULL,
    "value" JSONB NOT NULL,
    "state" "ConditionState" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_visibility_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_facts" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID NOT NULL,
    "fact_key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "source" "UserFactSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priority_rules" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "priority" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "result_type" "PriorityResultType" NOT NULL,
    "result_title" TEXT NOT NULL,
    "result_description" TEXT NOT NULL,
    "hold_categories" JSONB,
    "recommend_category_id" UUID,
    "cta_label" VARCHAR(100),
    "cta_target" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "priority_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priority_rule_conditions" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "fact_key" VARCHAR(100) NOT NULL,
    "operator" "ComparisonOperator" NOT NULL,
    "value" JSONB NOT NULL,
    "state" "ConditionState" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "priority_rule_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_runs" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID NOT NULL,
    "decision_type" "DecisionType" NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attribute_definitions" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "value_type" "AttributeValueType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "barcode" VARCHAR(100),
    "price" INTEGER NOT NULL,
    "price_band" "PriceBand" NOT NULL,
    "volume" VARCHAR(50),
    "image_url" TEXT,
    "purchase_url" TEXT,
    "attributes" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_filter_mappings" (
    "id" UUID NOT NULL,
    "category_id" UUID,
    "source_fact_key" VARCHAR(100) NOT NULL,
    "source_operator" "ComparisonOperator" NOT NULL,
    "source_value" JSONB NOT NULL,
    "attribute_key" VARCHAR(100) NOT NULL,
    "attribute_operator" "ComparisonOperator" NOT NULL,
    "attribute_value" JSONB NOT NULL,
    "filter_mode" "FilterMode" NOT NULL,
    "filter_type" "FilterType" NOT NULL,
    "filter_key" VARCHAR(100) NOT NULL,
    "filter_label" VARCHAR(100) NOT NULL,
    "tag_label" VARCHAR(100),
    "caution_message" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_filter_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_matrix_filter_states" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "source" "ProductMatrixFilterStateSource" NOT NULL,
    "filters" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_matrix_filter_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL,
    "name_ko" VARCHAR(200) NOT NULL,
    "name_en" VARCHAR(200) NOT NULL,
    "inci_name" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_ingredients" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "raw_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_groups" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredient_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_group_members" (
    "id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "ingredient_group_id" UUID NOT NULL,

    CONSTRAINT "ingredient_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction_reports" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID NOT NULL,
    "symptoms" JSONB NOT NULL,
    "affected_areas" JSONB NOT NULL,
    "onset_timing" VARCHAR(100),
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reaction_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction_report_products" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" "ReactionReportProductType" NOT NULL,
    "used_period" VARCHAR(100),
    "used_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reaction_report_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspected_causes" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "ingredient_group_id" UUID NOT NULL,
    "confidence" "ConfidenceLevel" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suspected_causes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avoidance_rules" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "ingredient_group_id" UUID NOT NULL,
    "action" "AvoidanceAction" NOT NULL,
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avoidance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "devices_user_id_idx" ON "devices"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_device_id_idx" ON "user_sessions"("device_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "session_events_device_id_idx" ON "session_events"("device_id");

-- CreateIndex
CREATE INDEX "session_events_session_id_idx" ON "session_events"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "fact_definitions_key_key" ON "fact_definitions"("key");

-- CreateIndex
CREATE INDEX "context_questions_fact_key_idx" ON "context_questions"("fact_key");

-- CreateIndex
CREATE INDEX "question_visibility_conditions_fact_key_idx" ON "question_visibility_conditions"("fact_key");

-- CreateIndex
CREATE INDEX "question_visibility_conditions_question_id_idx" ON "question_visibility_conditions"("question_id");

-- CreateIndex
CREATE INDEX "user_facts_device_id_fact_key_created_at_idx" ON "user_facts"("device_id", "fact_key", "created_at");

-- CreateIndex
CREATE INDEX "user_facts_session_id_idx" ON "user_facts"("session_id");

-- CreateIndex
CREATE INDEX "user_facts_user_id_fact_key_created_at_idx" ON "user_facts"("user_id", "fact_key", "created_at");

-- CreateIndex
CREATE INDEX "priority_rules_priority_is_active_idx" ON "priority_rules"("priority", "is_active");

-- CreateIndex
CREATE INDEX "priority_rules_recommend_category_id_idx" ON "priority_rules"("recommend_category_id");

-- CreateIndex
CREATE INDEX "priority_rule_conditions_fact_key_idx" ON "priority_rule_conditions"("fact_key");

-- CreateIndex
CREATE INDEX "priority_rule_conditions_rule_id_idx" ON "priority_rule_conditions"("rule_id");

-- CreateIndex
CREATE INDEX "decision_runs_category_id_idx" ON "decision_runs"("category_id");

-- CreateIndex
CREATE INDEX "decision_runs_device_id_decision_type_created_at_idx" ON "decision_runs"("device_id", "decision_type", "created_at");

-- CreateIndex
CREATE INDEX "decision_runs_filter_state_id_idx" ON "decision_runs"("filter_state_id");

-- CreateIndex
CREATE INDEX "decision_runs_session_id_idx" ON "decision_runs"("session_id");

-- CreateIndex
CREATE INDEX "decision_runs_user_id_decision_type_created_at_idx" ON "decision_runs"("user_id", "decision_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_key_key" ON "product_categories"("key");

-- CreateIndex
CREATE INDEX "category_attribute_definitions_category_id_sort_order_idx" ON "category_attribute_definitions"("category_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "category_attribute_definitions_category_id_key_key" ON "category_attribute_definitions"("category_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");

-- CreateIndex
CREATE INDEX "products_category_id_is_active_sort_order_idx" ON "products"("category_id", "is_active", "sort_order");

-- CreateIndex
CREATE INDEX "product_filter_mappings_category_id_filter_type_sort_order_idx" ON "product_filter_mappings"("category_id", "filter_type", "sort_order");

-- CreateIndex
CREATE INDEX "product_filter_mappings_source_fact_key_idx" ON "product_filter_mappings"("source_fact_key");

-- CreateIndex
CREATE INDEX "product_matrix_filter_states_category_id_is_active_updated__idx" ON "product_matrix_filter_states"("category_id", "is_active", "updated_at");

-- CreateIndex
CREATE INDEX "product_matrix_filter_states_device_id_category_id_is_activ_idx" ON "product_matrix_filter_states"("device_id", "category_id", "is_active", "updated_at");

-- CreateIndex
CREATE INDEX "product_matrix_filter_states_session_id_idx" ON "product_matrix_filter_states"("session_id");

-- CreateIndex
CREATE INDEX "product_matrix_filter_states_user_id_category_id_is_active__idx" ON "product_matrix_filter_states"("user_id", "category_id", "is_active", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_inci_name_key" ON "ingredients"("inci_name");

-- CreateIndex
CREATE INDEX "product_ingredients_ingredient_id_idx" ON "product_ingredients"("ingredient_id");

-- CreateIndex
CREATE INDEX "product_ingredients_product_id_idx" ON "product_ingredients"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_ingredients_product_id_ingredient_id_key" ON "product_ingredients"("product_id", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_groups_key_key" ON "ingredient_groups"("key");

-- CreateIndex
CREATE INDEX "ingredient_group_members_ingredient_group_id_idx" ON "ingredient_group_members"("ingredient_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_group_members_ingredient_id_ingredient_group_id_key" ON "ingredient_group_members"("ingredient_id", "ingredient_group_id");

-- CreateIndex
CREATE INDEX "reaction_reports_device_id_created_at_idx" ON "reaction_reports"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "reaction_reports_session_id_idx" ON "reaction_reports"("session_id");

-- CreateIndex
CREATE INDEX "reaction_reports_user_id_created_at_idx" ON "reaction_reports"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "reaction_report_products_product_id_idx" ON "reaction_report_products"("product_id");

-- CreateIndex
CREATE INDEX "reaction_report_products_report_id_idx" ON "reaction_report_products"("report_id");

-- CreateIndex
CREATE INDEX "suspected_causes_ingredient_group_id_idx" ON "suspected_causes"("ingredient_group_id");

-- CreateIndex
CREATE INDEX "suspected_causes_report_id_idx" ON "suspected_causes"("report_id");

-- CreateIndex
CREATE INDEX "avoidance_rules_device_id_is_active_updated_at_idx" ON "avoidance_rules"("device_id", "is_active", "updated_at");

-- CreateIndex
CREATE INDEX "avoidance_rules_ingredient_group_id_idx" ON "avoidance_rules"("ingredient_group_id");

-- CreateIndex
CREATE INDEX "avoidance_rules_user_id_is_active_updated_at_idx" ON "avoidance_rules"("user_id", "is_active", "updated_at");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_questions" ADD CONSTRAINT "context_questions_fact_key_fkey" FOREIGN KEY ("fact_key") REFERENCES "fact_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_visibility_conditions" ADD CONSTRAINT "question_visibility_conditions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "context_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_visibility_conditions" ADD CONSTRAINT "question_visibility_conditions_fact_key_fkey" FOREIGN KEY ("fact_key") REFERENCES "fact_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_facts" ADD CONSTRAINT "user_facts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_facts" ADD CONSTRAINT "user_facts_fact_key_fkey" FOREIGN KEY ("fact_key") REFERENCES "fact_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_facts" ADD CONSTRAINT "user_facts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_facts" ADD CONSTRAINT "user_facts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_rules" ADD CONSTRAINT "priority_rules_recommend_category_id_fkey" FOREIGN KEY ("recommend_category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_rule_conditions" ADD CONSTRAINT "priority_rule_conditions_fact_key_fkey" FOREIGN KEY ("fact_key") REFERENCES "fact_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_rule_conditions" ADD CONSTRAINT "priority_rule_conditions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "priority_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_runs" ADD CONSTRAINT "decision_runs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_runs" ADD CONSTRAINT "decision_runs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_runs" ADD CONSTRAINT "decision_runs_filter_state_id_fkey" FOREIGN KEY ("filter_state_id") REFERENCES "product_matrix_filter_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_runs" ADD CONSTRAINT "decision_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_runs" ADD CONSTRAINT "decision_runs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attribute_definitions" ADD CONSTRAINT "category_attribute_definitions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_filter_mappings" ADD CONSTRAINT "product_filter_mappings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_filter_mappings" ADD CONSTRAINT "product_filter_mappings_source_fact_key_fkey" FOREIGN KEY ("source_fact_key") REFERENCES "fact_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matrix_filter_states" ADD CONSTRAINT "product_matrix_filter_states_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matrix_filter_states" ADD CONSTRAINT "product_matrix_filter_states_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matrix_filter_states" ADD CONSTRAINT "product_matrix_filter_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matrix_filter_states" ADD CONSTRAINT "product_matrix_filter_states_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_group_members" ADD CONSTRAINT "ingredient_group_members_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_group_members" ADD CONSTRAINT "ingredient_group_members_ingredient_group_id_fkey" FOREIGN KEY ("ingredient_group_id") REFERENCES "ingredient_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_reports" ADD CONSTRAINT "reaction_reports_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_reports" ADD CONSTRAINT "reaction_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_reports" ADD CONSTRAINT "reaction_reports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_report_products" ADD CONSTRAINT "reaction_report_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_report_products" ADD CONSTRAINT "reaction_report_products_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reaction_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspected_causes" ADD CONSTRAINT "suspected_causes_ingredient_group_id_fkey" FOREIGN KEY ("ingredient_group_id") REFERENCES "ingredient_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspected_causes" ADD CONSTRAINT "suspected_causes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reaction_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoidance_rules" ADD CONSTRAINT "avoidance_rules_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoidance_rules" ADD CONSTRAINT "avoidance_rules_ingredient_group_id_fkey" FOREIGN KEY ("ingredient_group_id") REFERENCES "ingredient_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoidance_rules" ADD CONSTRAINT "avoidance_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
