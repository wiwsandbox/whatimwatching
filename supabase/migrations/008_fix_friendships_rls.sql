-- Fix RLS on friendships so receivers can see pending requests sent to them.
-- The live DB may only have the user_id check; we need friend_id too.

DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;

CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Ensure insert policy exists (sender must be user_id)
DROP POLICY IF EXISTS "Users can insert friendships" ON public.friendships;

CREATE POLICY "Users can insert friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);
