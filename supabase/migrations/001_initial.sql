-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Friendships
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  unique(user_id, friend_id)
);

alter table public.friendships enable row level security;

create policy "Users can view their own friendships"
  on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can insert friendships"
  on public.friendships for insert with check (auth.uid() = user_id);

create policy "Users can delete their own friendships"
  on public.friendships for delete using (auth.uid() = user_id);

-- Recommendations
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  note text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.recommendations enable row level security;

create policy "Users can view recommendations they sent or received"
  on public.recommendations for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Authenticated users can send recommendations"
  on public.recommendations for insert
  with check (auth.uid() = sender_id);

create policy "Receivers can mark recommendations as read"
  on public.recommendations for update
  using (auth.uid() = receiver_id);

-- Watchlist
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  status text not null default 'want_to_watch' check (status in ('want_to_watch', 'watched')),
  created_at timestamptz not null default now(),
  unique(user_id, tmdb_id, media_type)
);

alter table public.watchlist enable row level security;

create policy "Users can view their own watchlist"
  on public.watchlist for select using (auth.uid() = user_id);

create policy "Users can manage their own watchlist"
  on public.watchlist for insert with check (auth.uid() = user_id);

create policy "Users can update their own watchlist"
  on public.watchlist for update using (auth.uid() = user_id);

create policy "Users can delete from their own watchlist"
  on public.watchlist for delete using (auth.uid() = user_id);

-- Push subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage their own push subscription"
  on public.push_subscriptions for all using (auth.uid() = user_id);
