-- Migrate watchlist status from binary to three-state
-- Drop existing check constraint and replace with three valid states
alter table public.watchlist
  drop constraint if exists watchlist_status_check;

alter table public.watchlist
  add constraint watchlist_status_check
  check (status in ('to_watch', 'watching', 'watched'));

-- Migrate existing 'want_to_watch' rows to 'to_watch'
update public.watchlist
  set status = 'to_watch'
  where status = 'want_to_watch';

-- Add rating column (1–10)
alter table public.watchlist
  add column if not exists rating integer
  check (rating is null or (rating >= 1 and rating <= 10));

-- Allow friends to view each other's watchlists
drop policy if exists "Users can view their own watchlist" on public.watchlist;

create policy "Users can view own and friends watchlists"
  on public.watchlist for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships
      where user_id = auth.uid()
        and friend_id = watchlist.user_id
        and status = 'accepted'
    )
  );
