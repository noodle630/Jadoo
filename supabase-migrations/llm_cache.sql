-- Create llm_cache table for storing LLM responses
CREATE TABLE IF NOT EXISTS llm_cache (
  id BIGSERIAL PRIMARY KEY,
  prompt_hash TEXT UNIQUE NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.8,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_llm_cache_prompt_hash ON llm_cache(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_llm_cache_created_at ON llm_cache(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_llm_cache_updated_at 
    BEFORE UPDATE ON llm_cache 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies (optional - for security)
ALTER TABLE llm_cache ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on llm_cache" ON llm_cache
    FOR ALL USING (true); 