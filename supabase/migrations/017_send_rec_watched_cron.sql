-- Polls every minute for due rec_watched sends (see migration 016 and
-- supabase/functions/send-rec-watched). Reuses the same Vault secret
-- 'weekly_digest_service_key' set up for the weekly-digest cron job — it's
-- just the project's service role key, not specific to that function.
select
  cron.schedule(
    'send-rec-watched',
    '* * * * *', -- every minute
    $$
    select net.http_post(
      url := 'https://pqjhlmyxqmsgligewsav.supabase.co/functions/v1/send-rec-watched',
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
