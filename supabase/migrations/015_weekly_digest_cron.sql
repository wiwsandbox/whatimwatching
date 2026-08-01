-- Schedules the weekly-digest edge function for every Sunday.
--
-- No events-table schema change is needed: the events table (untracked by
-- any migration — see supabase/functions/weekly-digest/index.ts for why)
-- already stores an arbitrary text event_type, so 'digest_sent' just needs
-- to be a value the function writes, not a column/constraint change.
--
-- MANUAL STEP REQUIRED before this runs successfully:
--   The Authorization header below reads a secret named
--   'weekly_digest_service_key' out of Supabase Vault rather than embedding
--   the service role key in this file (this file is committed to git).
--   In the Supabase dashboard: Project Settings > Vault > add a new secret
--   named `weekly_digest_service_key` with the project's service role key
--   as its value. The cron job schedules fine without it, but every run
--   will fail at the http_post step (null Authorization header) until the
--   secret exists. Project ref (pqjhlmyxqmsgligewsav) is already filled in.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select
  cron.schedule(
    'weekly-digest',
    '0 15 * * 0', -- Sundays at 15:00 UTC
    $$
    select net.http_post(
      url := 'https://pqjhlmyxqmsgligewsav.supabase.co/functions/v1/weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'weekly_digest_service_key'
        )
      ),
      body := '{}'::jsonb
    );
    $$
  );
