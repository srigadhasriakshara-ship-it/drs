-- Peer Tutoring Finder schema for Supabase PostgreSQL.
-- Run this file in Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (char_length(trim(subject)) between 2 and 80),
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  availability text not null check (char_length(trim(availability)) between 2 and 120),
  description text check (description is null or char_length(description) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tutoring_requests (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  tutor_listing_id uuid not null references public.tutor_listings(id) on delete cascade,
  message text check (message is null or char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_not_to_self check (learner_id <> tutor_id),
  constraint unique_learner_listing unique (learner_id, tutor_listing_id)
);

create index if not exists tutor_listings_subject_idx on public.tutor_listings (lower(subject));
create index if not exists tutor_listings_user_idx on public.tutor_listings (user_id);
create index if not exists tutor_listings_active_created_idx on public.tutor_listings (is_active, created_at desc);
create index if not exists tutoring_requests_learner_idx on public.tutoring_requests (learner_id, created_at desc);
create index if not exists tutoring_requests_tutor_idx on public.tutoring_requests (tutor_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists tutor_listings_set_updated_at on public.tutor_listings;
create trigger tutor_listings_set_updated_at before update on public.tutor_listings for each row execute function public.set_updated_at();
drop trigger if exists tutoring_requests_set_updated_at on public.tutoring_requests;
create trigger tutoring_requests_set_updated_at before update on public.tutoring_requests for each row execute function public.set_updated_at();

-- The Express backend uses the server-only service-role key after validating Supabase Auth tokens
-- and enforcing ownership/role checks in every private route. Browser clients never access tables directly.
-- RLS is enabled as defense in depth; only service-role backend requests bypass these policies.
alter table public.profiles enable row level security;
alter table public.tutor_listings enable row level security;
alter table public.tutoring_requests enable row level security;

-- No anon/authenticated table policies are intentionally created: the browser uses Express APIs only.
-- Do not expose the service-role key to frontend code or commit it to GitHub.
