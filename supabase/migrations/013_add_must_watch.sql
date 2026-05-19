ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS is_must_watch boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS must_watch_remaining integer NOT NULL DEFAULT 3;
