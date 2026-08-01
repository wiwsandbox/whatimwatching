-- Dedup tracking for "recommender notified that recipient watched their rec"
-- One row per recommendation ever notified; presence = already fired.
-- Service-role only (no RLS policies) since only server code touches this.
CREATE TABLE IF NOT EXISTS public.recommendation_watch_notifications (
  recommendation_id uuid PRIMARY KEY REFERENCES public.recommendations(id) ON DELETE CASCADE,
  notified_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_watch_notifications ENABLE ROW LEVEL SECURITY;

-- Widen notifications.type: 'rec_watched' and 'rec_watchlisted' are already
-- inserted by lib/sendPush.ts (see app/api/push/rec-accepted) but silently
-- fail today because the original CHECK only allowed friend_request/recommendation.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('friend_request', 'recommendation', 'rec_watched', 'rec_watchlisted'));
