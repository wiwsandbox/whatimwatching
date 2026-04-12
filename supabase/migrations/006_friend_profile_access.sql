-- Ensure profiles are readable by everyone (fix if policy was missing on live DB)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

-- Drop restrictive watchlist SELECT policy and replace with one that allows friends to read
DROP POLICY IF EXISTS "Users can view their own watchlist" ON public.watchlist;

CREATE POLICY "Users and friends can view watchlist"
  ON public.watchlist FOR SELECT
  USING (
    auth.uid() = watchlist.user_id
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.user_id = auth.uid() AND f.friend_id = watchlist.user_id)
        OR (f.friend_id = auth.uid() AND f.user_id = watchlist.user_id)
      )
    )
  );
