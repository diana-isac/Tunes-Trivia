create extension if not exists pgcrypto;

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  player_name text not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  duration_ms integer,
  correct_count integer,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.game_sessions(id) on delete cascade,
  device_id text not null,
  player_name text not null,
  correct_count integer not null,
  duration_ms integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_game_sessions_device_id on public.game_sessions(device_id);
create index if not exists idx_game_sessions_status on public.game_sessions(status);
create index if not exists idx_leaderboard_rank
  on public.leaderboard_entries(correct_count desc, duration_ms asc, created_at asc);

alter table public.game_sessions replica identity full;
alter table public.leaderboard_entries replica identity full;

-- Enable realtime for leaderboard updates in the Supabase dashboard:
-- Database -> Replication -> add `public.leaderboard_entries`.
