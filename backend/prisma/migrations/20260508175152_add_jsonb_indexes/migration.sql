-- Add GIN indexes for the JSONB columns queried by runtime filters and analytics.
CREATE INDEX products_attributes_gin ON products USING GIN (attributes);
CREATE INDEX user_facts_value_gin ON user_facts USING GIN (value);
CREATE INDEX session_events_payload_gin ON session_events USING GIN (payload);
