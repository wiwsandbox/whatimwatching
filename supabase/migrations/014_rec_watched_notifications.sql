-- Dedup tracking for "recommender notified that recipient watched their rec"
-- One row per recommendation ever notified; presence = already fired.
-- Service-role only (no RLS policies) since only server code touches this.
CREATE TABLE IF NOT EXISTS public.recommendation_watch_notifications (
  recommendation_id uuid PRIMARY KEY REFERENCES public.recommendations(id) ON DELETE CASCADE,
  notified_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_watch_notifications ENABLE ROW LEVEL SECURITY;
