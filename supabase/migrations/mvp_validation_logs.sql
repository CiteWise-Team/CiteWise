CREATE TABLE mvp_validation_logs (
    id SERIAL PRIMARY KEY,
    test_run_id UUID NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    expected_target VARCHAR(255) NOT NULL,
    actual_result VARCHAR(255) NOT NULL,
    raw_data_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
