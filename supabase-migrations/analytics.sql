-- Analytics tables for tracking performance and insights

-- Job performance analytics
CREATE TABLE IF NOT EXISTS job_analytics (
  id BIGSERIAL PRIMARY KEY,
  feed_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  category TEXT,
  total_rows INTEGER NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  transform_time_ms INTEGER NOT NULL,
  llm_calls INTEGER NOT NULL DEFAULT 0,
  llm_errors INTEGER NOT NULL DEFAULT 0,
  cache_hits INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
  avg_confidence DECIMAL(5,4) NOT NULL DEFAULT 0,
  blank_fields_count INTEGER NOT NULL DEFAULT 0,
  warnings TEXT[],
  suggestions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Per-field analytics
CREATE TABLE IF NOT EXISTS field_analytics (
  id BIGSERIAL PRIMARY KEY,
  feed_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  total_occurrences INTEGER NOT NULL DEFAULT 0,
  successful_mappings INTEGER NOT NULL DEFAULT 0,
  blank_count INTEGER NOT NULL DEFAULT 0,
  avg_confidence DECIMAL(5,4) NOT NULL DEFAULT 0,
  common_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LLM call analytics
CREATE TABLE IF NOT EXISTS llm_analytics (
  id BIGSERIAL PRIMARY KEY,
  feed_id TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  prompt_length INTEGER NOT NULL,
  response_length INTEGER NOT NULL,
  confidence DECIMAL(5,4) NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL,
  estimated_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  temperature DECIMAL(3,2) NOT NULL,
  max_tokens INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB,
  feed_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_analytics_feed_id ON job_analytics(feed_id);
CREATE INDEX IF NOT EXISTS idx_job_analytics_created_at ON job_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_job_analytics_platform ON job_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_job_analytics_category ON job_analytics(category);

CREATE INDEX IF NOT EXISTS idx_field_analytics_feed_id ON field_analytics(feed_id);
CREATE INDEX IF NOT EXISTS idx_field_analytics_field_name ON field_analytics(field_name);

CREATE INDEX IF NOT EXISTS idx_llm_analytics_feed_id ON llm_analytics(feed_id);
CREATE INDEX IF NOT EXISTS idx_llm_analytics_created_at ON llm_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_analytics_model ON llm_analytics(model);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_job_analytics_updated_at 
    BEFORE UPDATE ON job_analytics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE job_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on job_analytics" ON job_analytics FOR ALL USING (true);
CREATE POLICY "Allow all operations on field_analytics" ON field_analytics FOR ALL USING (true);
CREATE POLICY "Allow all operations on llm_analytics" ON llm_analytics FOR ALL USING (true);
CREATE POLICY "Allow all operations on performance_metrics" ON performance_metrics FOR ALL USING (true);

-- Create views for common analytics queries
CREATE OR REPLACE VIEW job_performance_summary AS
SELECT 
  platform,
  category,
  COUNT(*) as total_jobs,
  AVG(processing_time_ms) as avg_processing_time_ms,
  AVG(transform_time_ms) as avg_transform_time_ms,
  AVG(llm_calls) as avg_llm_calls,
  AVG(success_rate) as avg_success_rate,
  AVG(avg_confidence) as avg_confidence,
  SUM(llm_calls) as total_llm_calls,
  SUM(llm_errors) as total_llm_errors,
  SUM(cache_hits) as total_cache_hits
FROM job_analytics 
GROUP BY platform, category
ORDER BY total_jobs DESC;

CREATE OR REPLACE VIEW field_performance_summary AS
SELECT 
  field_name,
  field_type,
  COUNT(DISTINCT feed_id) as feeds_processed,
  SUM(total_occurrences) as total_occurrences,
  SUM(successful_mappings) as total_successful,
  AVG(avg_confidence) as avg_confidence,
  SUM(blank_count) as total_blanks
FROM field_analytics 
GROUP BY field_name, field_type
ORDER BY total_occurrences DESC;

CREATE OR REPLACE VIEW llm_performance_summary AS
SELECT 
  model,
  COUNT(*) as total_calls,
  AVG(duration_ms) as avg_duration_ms,
  AVG(confidence) as avg_confidence,
  SUM(estimated_cost) as total_cost,
  COUNT(CASE WHEN success = false THEN 1 END) as error_count
FROM llm_analytics 
GROUP BY model
ORDER BY total_calls DESC; 