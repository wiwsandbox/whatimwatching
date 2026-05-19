ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS opened_at timestamptz DEFAULT NULL;
