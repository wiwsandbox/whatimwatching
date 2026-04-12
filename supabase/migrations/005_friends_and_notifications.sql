-- Add phone to profiles for friend-by-phone lookup
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles(phone) WHERE phone IS NOT NULL;

-- Allow accepting/declining received friend requests
DO $$ BEGIN
  CREATE POLICY "Users can accept or decline received friend requests"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = friend_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow both parties to remove a friendship
DROP POLICY IF EXISTS "Users can delete their own friendships" ON public.friendships;

DO $$ BEGIN
  CREATE POLICY "Users can delete friendships they are part of"
    ON public.friendships FOR DELETE
    USING (auth.uid() = user_id OR auth.uid() = friend_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('friend_request', 'recommendation')),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert notifications"
    ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
