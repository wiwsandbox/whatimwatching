-- reset-must-watch resets everyone's allowance in one global UPDATE (not
-- per-user), so a single timestamp in app_config — not a per-profile
-- column — is the right place to track when it last ran. Lets the digest
-- compute "resets in N days" without a hardcoded day name, which was
-- never tracked anywhere before this.
INSERT INTO public.app_config (key, value)
VALUES
  ('must_watch_last_reset_at', now()::text),
  ('must_watch_reset_cadence_days', '30')
ON CONFLICT (key) DO NOTHING;
