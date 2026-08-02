-- Revises rec_watched notifications (migration 014) to fire after a delay
-- instead of immediately, so a recipient's rating has time to land before
-- the recommender is notified. Extends the existing idempotency table
-- rather than replacing it — app/api/push/rec-watched/route.ts still does
-- the same claim/dedupe upsert it always did, it just no longer sends
-- synchronously.

ALTER TABLE public.recommendation_watch_notifications
  RENAME COLUMN notified_at TO claimed_at;

ALTER TABLE public.recommendation_watch_notifications
  ADD COLUMN IF NOT EXISTS watched_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS send_after timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Config table so the delay window is editable via UPDATE, no redeploy.
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- Service-role only (server reads via service key) — no policies needed.

INSERT INTO public.app_config (key, value)
VALUES ('rec_watched_delay_minutes', '15')
ON CONFLICT (key) DO NOTHING;

-- Rows that already exist predate this delay system entirely — they were
-- sent synchronously under the old immediate-send code. Mark them as
-- already-sent so the new polling function never picks them up and
-- retroactively fires real notifications for historical watch events.
UPDATE public.recommendation_watch_notifications
SET watched_at = claimed_at, send_after = claimed_at, sent_at = claimed_at
WHERE sent_at IS NULL;

-- New rows compute their own send_after from the config row via trigger
-- (a plain column DEFAULT can't contain a subquery), so the route that
-- inserts them doesn't need a second query — and the window is
-- centralized here regardless of what inserts the row.
CREATE OR REPLACE FUNCTION public.set_rec_watched_send_after()
RETURNS trigger AS $$
BEGIN
  IF NEW.send_after IS NULL THEN
    NEW.send_after := NEW.watched_at + (
      (SELECT value FROM public.app_config WHERE key = 'rec_watched_delay_minutes')::int
      * interval '1 minute'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rec_watched_send_after ON public.recommendation_watch_notifications;
CREATE TRIGGER trg_rec_watched_send_after
  BEFORE INSERT ON public.recommendation_watch_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_rec_watched_send_after();
