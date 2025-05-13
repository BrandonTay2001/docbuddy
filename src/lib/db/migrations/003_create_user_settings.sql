-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY,
  clinic_prompt TEXT,
  summary_prompt TEXT
);