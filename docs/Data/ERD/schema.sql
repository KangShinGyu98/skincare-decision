--
-- PostgreSQL database dump
--

\restrict fEzvHicm40oUIcqe6P0tOMezkb5Jv8OHLkyUcmBG6L1YUhxQZaFnwP0X1Jzd9yJ

-- Dumped from database version 16.14
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: skincare_decision
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO skincare_decision;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: skincare_decision
--

COMMENT ON SCHEMA public IS '';


--
-- Name: avoidance_rules_action_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.avoidance_rules_action_enum AS ENUM (
    'AVOID',
    'CAUTION'
);


ALTER TYPE public.avoidance_rules_action_enum OWNER TO skincare_decision;

--
-- Name: category_attribute_definitions_value_type_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.category_attribute_definitions_value_type_enum AS ENUM (
    'BOOLEAN',
    'ENUM',
    'NUMBER',
    'MULTI_ENUM',
    'STRING'
);


ALTER TYPE public.category_attribute_definitions_value_type_enum OWNER TO skincare_decision;

--
-- Name: comparison_operator_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.comparison_operator_enum AS ENUM (
    'EQ',
    'IN',
    'CONTAINS',
    'GTE',
    'LTE',
    'NEQ'
);


ALTER TYPE public.comparison_operator_enum OWNER TO skincare_decision;

--
-- Name: condition_state_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.condition_state_enum AS ENUM (
    'REQUIRED',
    'EXCLUDED'
);


ALTER TYPE public.condition_state_enum OWNER TO skincare_decision;

--
-- Name: priority_rules_result_type_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.priority_rules_result_type_enum AS ENUM (
    'STOP',
    'HOLD',
    'CAUTION',
    'PASS',
    'ROUTE_CATEGORY'
);


ALTER TYPE public.priority_rules_result_type_enum OWNER TO skincare_decision;

--
-- Name: product_filter_definitions_input_type_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.product_filter_definitions_input_type_enum AS ENUM (
    'NUMBER',
    'SELECT',
    'MULTI_SELECT',
    'BOOLEAN'
);


ALTER TYPE public.product_filter_definitions_input_type_enum OWNER TO skincare_decision;

--
-- Name: product_matrix_filter_definitions_kind_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.product_matrix_filter_definitions_kind_enum AS ENUM (
    'ATTRIBUTE',
    'COMPUTED'
);


ALTER TYPE public.product_matrix_filter_definitions_kind_enum OWNER TO skincare_decision;

--
-- Name: product_matrix_filter_states_source_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.product_matrix_filter_states_source_enum AS ENUM (
    'DIRECT',
    'CATEGORY_DECISION_CTA',
    'MANUAL',
    'RESTORED'
);


ALTER TYPE public.product_matrix_filter_states_source_enum OWNER TO skincare_decision;

--
-- Name: products_count_unit_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.products_count_unit_enum AS ENUM (
    'SHEET',
    'PIECE',
    'PACK'
);


ALTER TYPE public.products_count_unit_enum OWNER TO skincare_decision;

--
-- Name: products_volume_unit_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.products_volume_unit_enum AS ENUM (
    'ML',
    'G',
    'L',
    'MG'
);


ALTER TYPE public.products_volume_unit_enum OWNER TO skincare_decision;

--
-- Name: question_variants_screen_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.question_variants_screen_enum AS ENUM (
    'priority_gate',
    'context'
);


ALTER TYPE public.question_variants_screen_enum OWNER TO skincare_decision;

--
-- Name: question_variants_ui_section_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.question_variants_ui_section_enum AS ENUM (
    'life_routine',
    'owned_products',
    'basic',
    'category'
);


ALTER TYPE public.question_variants_ui_section_enum OWNER TO skincare_decision;

--
-- Name: questions_answer_type_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.questions_answer_type_enum AS ENUM (
    'SINGLE_CHOICE',
    'MULTI_CHOICE'
);


ALTER TYPE public.questions_answer_type_enum OWNER TO skincare_decision;

--
-- Name: reaction_report_products_type_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.reaction_report_products_type_enum AS ENUM (
    'PROBLEM',
    'OK'
);


ALTER TYPE public.reaction_report_products_type_enum OWNER TO skincare_decision;

--
-- Name: suspected_causes_confidence_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.suspected_causes_confidence_enum AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public.suspected_causes_confidence_enum OWNER TO skincare_decision;

--
-- Name: user_responses_source_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.user_responses_source_enum AS ENUM (
    'priority_gate',
    'context',
    'concern',
    'traceback'
);


ALTER TYPE public.user_responses_source_enum OWNER TO skincare_decision;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: skincare_decision
--

CREATE TYPE public.users_role_enum AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public.users_role_enum OWNER TO skincare_decision;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: avoidance_rules; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.avoidance_rules (
    id uuid NOT NULL,
    device_id uuid NOT NULL,
    user_id uuid,
    ingredient_group_id uuid NOT NULL,
    action public.avoidance_rules_action_enum NOT NULL,
    reason text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.avoidance_rules OWNER TO skincare_decision;

--
-- Name: brands; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.brands (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.brands OWNER TO skincare_decision;

--
-- Name: category_attribute_definitions; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.category_attribute_definitions (
    id uuid NOT NULL,
    category_id uuid NOT NULL,
    key character varying(100) NOT NULL,
    label character varying(200) NOT NULL,
    value_type public.category_attribute_definitions_value_type_enum NOT NULL,
    options jsonb,
    is_required boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.category_attribute_definitions OWNER TO skincare_decision;

--
-- Name: decision_runs; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.decision_runs (
    id bigint NOT NULL,
    device_id uuid NOT NULL,
    user_id uuid,
    session_id uuid NOT NULL,
    decision_type character varying(50) NOT NULL,
    source_screen character varying(100) NOT NULL,
    category_id uuid,
    filter_state_id uuid,
    result_type character varying(50),
    result_title text,
    result_description text,
    cta_label character varying(100),
    cta_target character varying(255),
    input_snapshot jsonb NOT NULL,
    applied_filters_snapshot jsonb NOT NULL,
    result_snapshot jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.decision_runs OWNER TO skincare_decision;

--
-- Name: decision_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: skincare_decision
--

CREATE SEQUENCE public.decision_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.decision_runs_id_seq OWNER TO skincare_decision;

--
-- Name: decision_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: skincare_decision
--

ALTER SEQUENCE public.decision_runs_id_seq OWNED BY public.decision_runs.id;


--
-- Name: devices; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.devices (
    id uuid NOT NULL,
    user_id uuid,
    last_seen_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.devices OWNER TO skincare_decision;

--
-- Name: ingredient_group_members; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.ingredient_group_members (
    id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    ingredient_group_id uuid NOT NULL
);


ALTER TABLE public.ingredient_group_members OWNER TO skincare_decision;

--
-- Name: ingredient_groups; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.ingredient_groups (
    id uuid NOT NULL,
    key character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.ingredient_groups OWNER TO skincare_decision;

--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.ingredients (
    id uuid NOT NULL,
    name_ko character varying(200) NOT NULL,
    name_en character varying(200),
    inci_name character varying(300),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.ingredients OWNER TO skincare_decision;

--
-- Name: priority_rule_conditions; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.priority_rule_conditions (
    id uuid NOT NULL,
    rule_id uuid NOT NULL,
    question_id uuid NOT NULL,
    operator public.comparison_operator_enum NOT NULL,
    value integer[],
    state public.condition_state_enum NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.priority_rule_conditions OWNER TO skincare_decision;

--
-- Name: priority_rules; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.priority_rules (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    sort_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    result_type public.priority_rules_result_type_enum NOT NULL,
    result_title text NOT NULL,
    result_description text NOT NULL,
    hold_categories jsonb,
    recommend_category_id uuid,
    cta_label character varying(100),
    cta_target character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    admin_note text
);


ALTER TABLE public.priority_rules OWNER TO skincare_decision;

--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.product_categories (
    id uuid NOT NULL,
    key character varying(100) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.product_categories OWNER TO skincare_decision;

--
-- Name: product_filter_definitions; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.product_filter_definitions (
    id uuid NOT NULL,
    attribute_definition_id uuid NOT NULL,
    label character varying(100) NOT NULL,
    default_operator public.comparison_operator_enum NOT NULL,
    allowed_operators public.comparison_operator_enum[],
    default_value jsonb NOT NULL,
    input_type public.product_filter_definitions_input_type_enum NOT NULL,
    options jsonb,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_filter_definitions OWNER TO skincare_decision;

--
-- Name: product_ingredients; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.product_ingredients (
    id uuid NOT NULL,
    product_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    order_index integer NOT NULL,
    raw_text text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.product_ingredients OWNER TO skincare_decision;

--
-- Name: product_matrix_filter_definitions; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.product_matrix_filter_definitions (
    id uuid NOT NULL,
    category_id uuid NOT NULL,
    product_filter_definition_id uuid,
    key character varying(100) NOT NULL,
    label character varying(100) NOT NULL,
    definition_kind public.product_matrix_filter_definitions_kind_enum NOT NULL,
    computed_filter_key character varying(100),
    operator_override public.comparison_operator_enum,
    value_override jsonb,
    condition_payload jsonb,
    is_default boolean DEFAULT false NOT NULL,
    is_manual_selectable boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_product_matrix_filter_definitions_kind_target CHECK ((((definition_kind = 'ATTRIBUTE'::public.product_matrix_filter_definitions_kind_enum) AND (product_filter_definition_id IS NOT NULL) AND (computed_filter_key IS NULL)) OR ((definition_kind = 'COMPUTED'::public.product_matrix_filter_definitions_kind_enum) AND (product_filter_definition_id IS NULL) AND (computed_filter_key IS NOT NULL))))
);


ALTER TABLE public.product_matrix_filter_definitions OWNER TO skincare_decision;

--
-- Name: product_matrix_filter_states; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.product_matrix_filter_states (
    id uuid NOT NULL,
    device_id uuid NOT NULL,
    user_id uuid,
    category_id uuid NOT NULL,
    source public.product_matrix_filter_states_source_enum NOT NULL,
    filters jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.product_matrix_filter_states OWNER TO skincare_decision;

--
-- Name: products; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.products (
    id uuid NOT NULL,
    brand_id uuid NOT NULL,
    category_id uuid NOT NULL,
    name character varying(500) NOT NULL,
    price_krw integer NOT NULL,
    volume_amount numeric(10,2),
    volume_unit public.products_volume_unit_enum,
    count_amount integer,
    count_unit public.products_count_unit_enum,
    volume_label character varying(100),
    image_url text,
    purchase_url text,
    attributes jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.products OWNER TO skincare_decision;

--
-- Name: question_filter_mappings; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.question_filter_mappings (
    id uuid NOT NULL,
    trigger_question_id uuid NOT NULL,
    trigger_operator public.comparison_operator_enum NOT NULL,
    trigger_value integer[],
    matrix_filter_definition_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.question_filter_mappings OWNER TO skincare_decision;

--
-- Name: question_variants; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.question_variants (
    id uuid NOT NULL,
    question_id uuid NOT NULL,
    title text NOT NULL,
    answers text[],
    screen public.question_variants_screen_enum NOT NULL,
    ui_section public.question_variants_ui_section_enum NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    answer_count integer GENERATED ALWAYS AS (cardinality(answers)) STORED,
    category character varying(50)
);


ALTER TABLE public.question_variants OWNER TO skincare_decision;

--
-- Name: question_visibility_conditions; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.question_visibility_conditions (
    id uuid NOT NULL,
    question_variant_id uuid NOT NULL,
    operator public.comparison_operator_enum NOT NULL,
    value integer NOT NULL,
    state public.condition_state_enum NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    condition_question_id uuid NOT NULL
);


ALTER TABLE public.question_visibility_conditions OWNER TO skincare_decision;

--
-- Name: questions; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.questions (
    id uuid NOT NULL,
    key character varying(100) NOT NULL,
    answer_type public.questions_answer_type_enum NOT NULL,
    answer_values integer[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    answer_count integer GENERATED ALWAYS AS (cardinality(answer_values)) STORED
);


ALTER TABLE public.questions OWNER TO skincare_decision;

--
-- Name: reaction_report_products; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.reaction_report_products (
    id uuid NOT NULL,
    report_id uuid NOT NULL,
    product_id uuid NOT NULL,
    type public.reaction_report_products_type_enum NOT NULL,
    used_period character varying(100),
    used_count integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reaction_report_products OWNER TO skincare_decision;

--
-- Name: reaction_reports; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.reaction_reports (
    id uuid NOT NULL,
    device_id uuid NOT NULL,
    user_id uuid,
    symptoms jsonb NOT NULL,
    affected_areas jsonb NOT NULL,
    onset_timing character varying(100),
    memo text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.reaction_reports OWNER TO skincare_decision;

--
-- Name: session_events; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.session_events (
    id bigint NOT NULL,
    session_id uuid NOT NULL,
    event_name character varying(100) NOT NULL,
    screen character varying(100) NOT NULL,
    element_id character varying(100),
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.session_events OWNER TO skincare_decision;

--
-- Name: session_events_id_seq; Type: SEQUENCE; Schema: public; Owner: skincare_decision
--

CREATE SEQUENCE public.session_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.session_events_id_seq OWNER TO skincare_decision;

--
-- Name: session_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: skincare_decision
--

ALTER SEQUENCE public.session_events_id_seq OWNED BY public.session_events.id;


--
-- Name: suspected_causes; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.suspected_causes (
    id uuid NOT NULL,
    report_id uuid NOT NULL,
    ingredient_group_id uuid NOT NULL,
    confidence public.suspected_causes_confidence_enum NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.suspected_causes OWNER TO skincare_decision;

--
-- Name: user_responses; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.user_responses (
    id uuid NOT NULL,
    device_id uuid NOT NULL,
    user_id uuid,
    question_id uuid NOT NULL,
    value integer[],
    source public.user_responses_source_enum NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.user_responses OWNER TO skincare_decision;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.user_sessions (
    id uuid NOT NULL,
    device_id uuid NOT NULL,
    user_id uuid,
    entry_path character varying(255) NOT NULL,
    referrer text,
    logged_in_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.user_sessions OWNER TO skincare_decision;

--
-- Name: users; Type: TABLE; Schema: public; Owner: skincare_decision
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    role public.users_role_enum NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    google_id character varying(255),
    consented_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO skincare_decision;

--
-- Name: decision_runs id; Type: DEFAULT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.decision_runs ALTER COLUMN id SET DEFAULT nextval('public.decision_runs_id_seq'::regclass);


--
-- Name: session_events id; Type: DEFAULT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.session_events ALTER COLUMN id SET DEFAULT nextval('public.session_events_id_seq'::regclass);


--
-- Name: avoidance_rules pk_avoidance_rules; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.avoidance_rules
    ADD CONSTRAINT pk_avoidance_rules PRIMARY KEY (id);


--
-- Name: brands pk_brands; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT pk_brands PRIMARY KEY (id);


--
-- Name: category_attribute_definitions pk_category_attribute_definitions; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.category_attribute_definitions
    ADD CONSTRAINT pk_category_attribute_definitions PRIMARY KEY (id);


--
-- Name: decision_runs pk_decision_runs; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.decision_runs
    ADD CONSTRAINT pk_decision_runs PRIMARY KEY (id);


--
-- Name: devices pk_devices; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT pk_devices PRIMARY KEY (id);


--
-- Name: ingredient_group_members pk_ingredient_group_members; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.ingredient_group_members
    ADD CONSTRAINT pk_ingredient_group_members PRIMARY KEY (id);


--
-- Name: ingredient_groups pk_ingredient_groups; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.ingredient_groups
    ADD CONSTRAINT pk_ingredient_groups PRIMARY KEY (id);


--
-- Name: ingredients pk_ingredients; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT pk_ingredients PRIMARY KEY (id);


--
-- Name: priority_rule_conditions pk_priority_rule_conditions; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.priority_rule_conditions
    ADD CONSTRAINT pk_priority_rule_conditions PRIMARY KEY (id);


--
-- Name: priority_rules pk_priority_rules; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.priority_rules
    ADD CONSTRAINT pk_priority_rules PRIMARY KEY (id);


--
-- Name: product_categories pk_product_categories; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT pk_product_categories PRIMARY KEY (id);


--
-- Name: product_filter_definitions pk_product_filter_definitions; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_filter_definitions
    ADD CONSTRAINT pk_product_filter_definitions PRIMARY KEY (id);


--
-- Name: product_ingredients pk_product_ingredients; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_ingredients
    ADD CONSTRAINT pk_product_ingredients PRIMARY KEY (id);


--
-- Name: product_matrix_filter_definitions pk_product_matrix_filter_definitions; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_matrix_filter_definitions
    ADD CONSTRAINT pk_product_matrix_filter_definitions PRIMARY KEY (id);


--
-- Name: product_matrix_filter_states pk_product_matrix_filter_states; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_matrix_filter_states
    ADD CONSTRAINT pk_product_matrix_filter_states PRIMARY KEY (id);


--
-- Name: products pk_products; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT pk_products PRIMARY KEY (id);


--
-- Name: question_filter_mappings pk_question_filter_mappings; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.question_filter_mappings
    ADD CONSTRAINT pk_question_filter_mappings PRIMARY KEY (id);


--
-- Name: question_variants pk_question_variants; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.question_variants
    ADD CONSTRAINT pk_question_variants PRIMARY KEY (id);


--
-- Name: question_visibility_conditions pk_question_visibility_conditions; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.question_visibility_conditions
    ADD CONSTRAINT pk_question_visibility_conditions PRIMARY KEY (id);


--
-- Name: questions pk_questions; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT pk_questions PRIMARY KEY (id);


--
-- Name: reaction_report_products pk_reaction_report_products; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.reaction_report_products
    ADD CONSTRAINT pk_reaction_report_products PRIMARY KEY (id);


--
-- Name: reaction_reports pk_reaction_reports; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.reaction_reports
    ADD CONSTRAINT pk_reaction_reports PRIMARY KEY (id);


--
-- Name: session_events pk_session_events; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.session_events
    ADD CONSTRAINT pk_session_events PRIMARY KEY (id);


--
-- Name: suspected_causes pk_suspected_causes; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.suspected_causes
    ADD CONSTRAINT pk_suspected_causes PRIMARY KEY (id);


--
-- Name: user_responses pk_user_responses; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.user_responses
    ADD CONSTRAINT pk_user_responses PRIMARY KEY (id);


--
-- Name: user_sessions pk_user_sessions; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT pk_user_sessions PRIMARY KEY (id);


--
-- Name: users pk_users; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT pk_users PRIMARY KEY (id);


--
-- Name: questions uq_questions_id_answer_count; Type: CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT uq_questions_id_answer_count UNIQUE (id, answer_count);


--
-- Name: idx_avoidance_rules_device_id_is_active_updated_at; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_avoidance_rules_device_id_is_active_updated_at ON public.avoidance_rules USING btree (device_id, is_active, updated_at);


--
-- Name: idx_avoidance_rules_ingredient_group_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_avoidance_rules_ingredient_group_id ON public.avoidance_rules USING btree (ingredient_group_id);


--
-- Name: idx_avoidance_rules_user_id_is_active_updated_at; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_avoidance_rules_user_id_is_active_updated_at ON public.avoidance_rules USING btree (user_id, is_active, updated_at);


--
-- Name: idx_category_attribute_definitions_category_id_sort_order; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_category_attribute_definitions_category_id_sort_order ON public.category_attribute_definitions USING btree (category_id, sort_order);


--
-- Name: idx_decision_runs_device_id_decision_type_created_at; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_decision_runs_device_id_decision_type_created_at ON public.decision_runs USING btree (device_id, decision_type, created_at);


--
-- Name: idx_decision_runs_session_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_decision_runs_session_id ON public.decision_runs USING btree (session_id);


--
-- Name: idx_decision_runs_user_id_decision_type_created_at; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_decision_runs_user_id_decision_type_created_at ON public.decision_runs USING btree (user_id, decision_type, created_at);


--
-- Name: idx_ingredient_group_members_ingredient_group_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_ingredient_group_members_ingredient_group_id ON public.ingredient_group_members USING btree (ingredient_group_id);


--
-- Name: idx_priority_rule_conditions_question_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_priority_rule_conditions_question_id ON public.priority_rule_conditions USING btree (question_id);


--
-- Name: idx_priority_rule_conditions_rule_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_priority_rule_conditions_rule_id ON public.priority_rule_conditions USING btree (rule_id);


--
-- Name: idx_product_categories_sort_order; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_product_categories_sort_order ON public.product_categories USING btree (sort_order);


--
-- Name: idx_product_filter_defs_attr_def_id_active_sort; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_product_filter_defs_attr_def_id_active_sort ON public.product_filter_definitions USING btree (attribute_definition_id, is_active, sort_order);


--
-- Name: idx_product_ingredients_ingredient_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_product_ingredients_ingredient_id ON public.product_ingredients USING btree (ingredient_id);


--
-- Name: idx_product_ingredients_product_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_product_ingredients_product_id ON public.product_ingredients USING btree (product_id);


--
-- Name: idx_product_matrix_filter_defs_category_id_active_sort; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_product_matrix_filter_defs_category_id_active_sort ON public.product_matrix_filter_definitions USING btree (category_id, is_active, sort_order);


--
-- Name: idx_product_matrix_filter_states_device_id_category_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_product_matrix_filter_states_device_id_category_id ON public.product_matrix_filter_states USING btree (device_id, category_id);


--
-- Name: idx_product_matrix_filter_states_user_id_category_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_product_matrix_filter_states_user_id_category_id ON public.product_matrix_filter_states USING btree (user_id, category_id);


--
-- Name: idx_products_category_id_is_active_sort_order; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_products_category_id_is_active_sort_order ON public.products USING btree (category_id, is_active, sort_order);


--
-- Name: idx_question_filter_mappings_matrix_filter_definition_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_question_filter_mappings_matrix_filter_definition_id ON public.question_filter_mappings USING btree (matrix_filter_definition_id);


--
-- Name: idx_question_filter_mappings_trigger_question_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_question_filter_mappings_trigger_question_id ON public.question_filter_mappings USING btree (trigger_question_id);


--
-- Name: idx_question_variants_question_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_question_variants_question_id ON public.question_variants USING btree (question_id);


--
-- Name: idx_question_variants_screen_ui_section_category_sort_order; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_question_variants_screen_ui_section_category_sort_order ON public.question_variants USING btree (screen, ui_section, category, sort_order);


--
-- Name: idx_question_variants_screen_ui_section_sort_order; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_question_variants_screen_ui_section_sort_order ON public.question_variants USING btree (screen, ui_section, sort_order);


--
-- Name: idx_question_visibility_conditions_condition_question_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_question_visibility_conditions_condition_question_id ON public.question_visibility_conditions USING btree (condition_question_id);


--
-- Name: idx_question_visibility_conditions_question_variant_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_question_visibility_conditions_question_variant_id ON public.question_visibility_conditions USING btree (question_variant_id);


--
-- Name: idx_reaction_report_products_product_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_reaction_report_products_product_id ON public.reaction_report_products USING btree (product_id);


--
-- Name: idx_reaction_report_products_report_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_reaction_report_products_report_id ON public.reaction_report_products USING btree (report_id);


--
-- Name: idx_reaction_reports_device_id_created_at; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_reaction_reports_device_id_created_at ON public.reaction_reports USING btree (device_id, created_at);


--
-- Name: idx_reaction_reports_user_id_created_at; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_reaction_reports_user_id_created_at ON public.reaction_reports USING btree (user_id, created_at);


--
-- Name: idx_suspected_causes_ingredient_group_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_suspected_causes_ingredient_group_id ON public.suspected_causes USING btree (ingredient_group_id);


--
-- Name: idx_suspected_causes_report_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE INDEX idx_suspected_causes_report_id ON public.suspected_causes USING btree (report_id);


--
-- Name: uq_brands_name; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_brands_name ON public.brands USING btree (name);


--
-- Name: uq_category_attribute_definitions_category_id_key; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_category_attribute_definitions_category_id_key ON public.category_attribute_definitions USING btree (category_id, key);


--
-- Name: uq_ingredient_group_members_ingredient_id_ingredient_group_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_ingredient_group_members_ingredient_id_ingredient_group_id ON public.ingredient_group_members USING btree (ingredient_id, ingredient_group_id);


--
-- Name: uq_ingredient_groups_key; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_ingredient_groups_key ON public.ingredient_groups USING btree (key);


--
-- Name: uq_ingredients_inci_name; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_ingredients_inci_name ON public.ingredients USING btree (inci_name);


--
-- Name: uq_product_categories_key; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_product_categories_key ON public.product_categories USING btree (key);


--
-- Name: uq_product_ingredients_product_id_ingredient_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_product_ingredients_product_id_ingredient_id ON public.product_ingredients USING btree (product_id, ingredient_id);


--
-- Name: uq_product_ingredients_product_id_order_index; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_product_ingredients_product_id_order_index ON public.product_ingredients USING btree (product_id, order_index);


--
-- Name: uq_product_matrix_filter_definitions_category_id_key; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_product_matrix_filter_definitions_category_id_key ON public.product_matrix_filter_definitions USING btree (category_id, key);


--
-- Name: uq_questions_key; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_questions_key ON public.questions USING btree (key);


--
-- Name: uq_user_responses_anonymous_device_question; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_user_responses_anonymous_device_question ON public.user_responses USING btree (device_id, question_id) WHERE (user_id IS NULL);


--
-- Name: uq_user_responses_user_question; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_user_responses_user_question ON public.user_responses USING btree (user_id, question_id) WHERE (user_id IS NOT NULL);


--
-- Name: uq_users_email; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_users_email ON public.users USING btree (email);


--
-- Name: uq_users_google_id; Type: INDEX; Schema: public; Owner: skincare_decision
--

CREATE UNIQUE INDEX uq_users_google_id ON public.users USING btree (google_id);


--
-- Name: avoidance_rules fk_avoidance_rules_device_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.avoidance_rules
    ADD CONSTRAINT fk_avoidance_rules_device_id FOREIGN KEY (device_id) REFERENCES public.devices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: avoidance_rules fk_avoidance_rules_ingredient_group_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.avoidance_rules
    ADD CONSTRAINT fk_avoidance_rules_ingredient_group_id FOREIGN KEY (ingredient_group_id) REFERENCES public.ingredient_groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: avoidance_rules fk_avoidance_rules_user_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.avoidance_rules
    ADD CONSTRAINT fk_avoidance_rules_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: category_attribute_definitions fk_category_attribute_definitions_category_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.category_attribute_definitions
    ADD CONSTRAINT fk_category_attribute_definitions_category_id FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: decision_runs fk_decision_runs_device_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.decision_runs
    ADD CONSTRAINT fk_decision_runs_device_id FOREIGN KEY (device_id) REFERENCES public.devices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: decision_runs fk_decision_runs_session_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.decision_runs
    ADD CONSTRAINT fk_decision_runs_session_id FOREIGN KEY (session_id) REFERENCES public.user_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: decision_runs fk_decision_runs_user_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.decision_runs
    ADD CONSTRAINT fk_decision_runs_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: devices fk_devices_user_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fk_devices_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ingredient_group_members fk_ingredient_group_members_ingredient_group_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.ingredient_group_members
    ADD CONSTRAINT fk_ingredient_group_members_ingredient_group_id FOREIGN KEY (ingredient_group_id) REFERENCES public.ingredient_groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ingredient_group_members fk_ingredient_group_members_ingredient_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.ingredient_group_members
    ADD CONSTRAINT fk_ingredient_group_members_ingredient_id FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: priority_rule_conditions fk_priority_rule_conditions_question_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.priority_rule_conditions
    ADD CONSTRAINT fk_priority_rule_conditions_question_id FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: priority_rule_conditions fk_priority_rule_conditions_rule_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.priority_rule_conditions
    ADD CONSTRAINT fk_priority_rule_conditions_rule_id FOREIGN KEY (rule_id) REFERENCES public.priority_rules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: priority_rules fk_priority_rules_recommend_category_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.priority_rules
    ADD CONSTRAINT fk_priority_rules_recommend_category_id FOREIGN KEY (recommend_category_id) REFERENCES public.product_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_filter_definitions fk_product_filter_definitions_attribute_definition_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_filter_definitions
    ADD CONSTRAINT fk_product_filter_definitions_attribute_definition_id FOREIGN KEY (attribute_definition_id) REFERENCES public.category_attribute_definitions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_ingredients fk_product_ingredients_ingredient_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_ingredients
    ADD CONSTRAINT fk_product_ingredients_ingredient_id FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_ingredients fk_product_ingredients_product_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_ingredients
    ADD CONSTRAINT fk_product_ingredients_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_matrix_filter_definitions fk_product_matrix_filter_definitions_category_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_matrix_filter_definitions
    ADD CONSTRAINT fk_product_matrix_filter_definitions_category_id FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_matrix_filter_definitions fk_product_matrix_filter_defs_product_filter_definition_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_matrix_filter_definitions
    ADD CONSTRAINT fk_product_matrix_filter_defs_product_filter_definition_id FOREIGN KEY (product_filter_definition_id) REFERENCES public.product_filter_definitions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_matrix_filter_states fk_product_matrix_filter_states_category_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_matrix_filter_states
    ADD CONSTRAINT fk_product_matrix_filter_states_category_id FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_matrix_filter_states fk_product_matrix_filter_states_device_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_matrix_filter_states
    ADD CONSTRAINT fk_product_matrix_filter_states_device_id FOREIGN KEY (device_id) REFERENCES public.devices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_matrix_filter_states fk_product_matrix_filter_states_user_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.product_matrix_filter_states
    ADD CONSTRAINT fk_product_matrix_filter_states_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products fk_products_brand_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_brand_id FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: products fk_products_category_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: question_filter_mappings fk_question_filter_mappings_matrix_filter_definition_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.question_filter_mappings
    ADD CONSTRAINT fk_question_filter_mappings_matrix_filter_definition_id FOREIGN KEY (matrix_filter_definition_id) REFERENCES public.product_matrix_filter_definitions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: question_filter_mappings fk_question_filter_mappings_trigger_question_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.question_filter_mappings
    ADD CONSTRAINT fk_question_filter_mappings_trigger_question_id FOREIGN KEY (trigger_question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: question_variants fk_question_variants_question_answer_count; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.question_variants
    ADD CONSTRAINT fk_question_variants_question_answer_count FOREIGN KEY (question_id, answer_count) REFERENCES public.questions(id, answer_count);


--
-- Name: question_variants fk_question_variants_question_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.question_variants
    ADD CONSTRAINT fk_question_variants_question_id FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: question_visibility_conditions fk_question_visibility_conditions_condition_question_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.question_visibility_conditions
    ADD CONSTRAINT fk_question_visibility_conditions_condition_question_id FOREIGN KEY (condition_question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: question_visibility_conditions fk_question_visibility_conditions_question_variant_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.question_visibility_conditions
    ADD CONSTRAINT fk_question_visibility_conditions_question_variant_id FOREIGN KEY (question_variant_id) REFERENCES public.question_variants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reaction_report_products fk_reaction_report_products_product_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.reaction_report_products
    ADD CONSTRAINT fk_reaction_report_products_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reaction_report_products fk_reaction_report_products_report_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.reaction_report_products
    ADD CONSTRAINT fk_reaction_report_products_report_id FOREIGN KEY (report_id) REFERENCES public.reaction_reports(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reaction_reports fk_reaction_reports_device_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.reaction_reports
    ADD CONSTRAINT fk_reaction_reports_device_id FOREIGN KEY (device_id) REFERENCES public.devices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reaction_reports fk_reaction_reports_user_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.reaction_reports
    ADD CONSTRAINT fk_reaction_reports_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: session_events fk_session_events_session_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.session_events
    ADD CONSTRAINT fk_session_events_session_id FOREIGN KEY (session_id) REFERENCES public.user_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: suspected_causes fk_suspected_causes_ingredient_group_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.suspected_causes
    ADD CONSTRAINT fk_suspected_causes_ingredient_group_id FOREIGN KEY (ingredient_group_id) REFERENCES public.ingredient_groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: suspected_causes fk_suspected_causes_report_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.suspected_causes
    ADD CONSTRAINT fk_suspected_causes_report_id FOREIGN KEY (report_id) REFERENCES public.reaction_reports(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_responses fk_user_responses_device_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.user_responses
    ADD CONSTRAINT fk_user_responses_device_id FOREIGN KEY (device_id) REFERENCES public.devices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_responses fk_user_responses_question_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.user_responses
    ADD CONSTRAINT fk_user_responses_question_id FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_responses fk_user_responses_user_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.user_responses
    ADD CONSTRAINT fk_user_responses_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_sessions fk_user_sessions_device_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT fk_user_sessions_device_id FOREIGN KEY (device_id) REFERENCES public.devices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_sessions fk_user_sessions_user_id; Type: FK CONSTRAINT; Schema: public; Owner: skincare_decision
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT fk_user_sessions_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: skincare_decision
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict fEzvHicm40oUIcqe6P0tOMezkb5Jv8OHLkyUcmBG6L1YUhxQZaFnwP0X1Jzd9yJ

