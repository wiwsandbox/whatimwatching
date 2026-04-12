-- Fix watchlist status constraint to support three-state system
-- (live DB still has old constraint from 001_initial.sql)
alter table public.watchlist
  drop constraint if exists watchlist_status_check;

alter table public.watchlist
  add constraint watchlist_status_check
  check (status in ('to_watch', 'watching', 'watched'));

-- Migrate any legacy rows
update public.watchlist
  set status = 'to_watch'
  where status = 'want_to_watch';

update public.watchlist
  set status = 'watched'
  where status not in ('to_watch', 'watching', 'watched');

-- Update default value
alter table public.watchlist
  alter column status set default 'to_watch';

-- Add rating column (safe to run if already exists)
alter table public.watchlist
  add column if not exists rating integer
  check (rating is null or (rating >= 1 and rating <= 10));

-- Make profiles.username nullable so phone OTP users can proceed to
-- the create-profile step before their username is set
alter table public.profiles
  alter column username drop not null;
