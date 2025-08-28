-- =========================================================
-- STRUKT Supabase schema (idempotent)
-- =========================================================

-- Extensions
create extension if not exists "pgcrypto";

-- =========================
-- Tables
-- =========================

-- USER PROFILES (1:1 with auth.users)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  timezone text default 'UTC',

  -- Identity
  gender_identity text,      -- woman | man | non-binary | self-describe | prefer-not
  identity_other text,
  pronouns text,             -- she/her | he/him | they/them | custom

  -- Culture & Faith
  cultural_practices text[] default '{}',
  faith_diet_rules text[] default '{}', -- halal | kosher | fasting | etc.
  cultural_notes text,

  -- Lifestyle / Obstacles
  obstacles text[] default '{}',        -- travel, childcare, injury-rehab, etc.
  work_pattern text,                    -- shift | 9-5 | freelance | etc.
  support_system text,
  lifestyle_notes text,

  -- Medical & Safety
  injuries text[] default '{}',
  conditions text[] default '{}',
  contraindications text[] default '{}',
  emergency_ack boolean default false,

  -- Goals & Priorities
  primary_goal text,
  secondary_goals text[] default '{}',
  target_event text,
  target_event_date date,

  -- Schedule & Access
  days_per_week int,
  session_minutes int,
  equipment_access text[] default '{}', -- dumbbells, bands, barbell, machines
  workout_location text,                -- home | gym | hybrid

  -- Experience & Coaching Style
  experience_level text,                -- beginner | intermediate | advanced
  coaching_tone text,                   -- gentle | direct | cheerleader | brief
  learning_style text,                  -- text | visual | audio | step-by-step

  -- Measurements & Sleep Window
  height_cm numeric(5,2),
  weight_kg numeric(6,2),
  units text default 'metric',          -- metric | imperial
  sleep_time time,
  wake_time time,

  -- Diet & Habits
  diet_pattern text,                    -- vegetarian | vegan | etc.
  fasting_pattern text,                 -- 16:8 | none | etc.
  diet_notes text,

  -- Dietary Preferences
  allergies text[] default '{}',
  intolerances text[] default '{}',
  cuisines_like text[] default '{}',
  cuisines_avoid text[] default '{}',
  budget_band text,                     -- low | medium | high

  -- Supplements (current list)
  supplements_current jsonb[] default '{}',

  -- Sleep & Recovery
  sleep_quality text,                   -- self-rated
  avg_sleep_hours numeric(3,1),
  recovery_habits text[] default '{}',  -- stretching, sauna, walks, etc.

  -- Charity & Success
  charity_choice text,
  success_definition text,
  motivation_notes text,

  -- Nutrition targets
  daily_kcal_target int,
  macro_targets jsonb,        -- {"protein_g":..., "carbs_g":..., "fat_g":..., "fiber_g":...}
  nutrition_targets jsonb,    -- full computed object {kcal, protein_g, carbs_g, fat_g, fiber_g, method, activity_factor}

  -- Meta
  onboarding_completed boolean default false,
  cohort text,
  data_env text default 'test',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_profiles_email on public.user_profiles (email);
create index if not exists idx_user_profiles_onboarding on public.user_profiles (onboarding_completed);

-- WORKOUTS
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text,
  description text,
  duration_minutes int,
  calories numeric(6,1),
  notes text,
  date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz default now()
);
create index if not exists idx_workouts_userid_date on public.workouts (user_id, date desc);

-- MEALS
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text,
  macros jsonb,       -- {protein, carbs, fat, fiber}
  calories numeric(6,1),
  notes text,
  date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz default now()
);
create index if not exists idx_meals_userid_date on public.meals (user_id, date desc);

-- SLEEP LOGS
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_minutes int,
  quality text,      -- poor | ok | great, etc.
  bedtime timestamptz,
  wake_time timestamptz,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_sleep_userid_created on public.sleep_logs (user_id, created_at desc);

-- SUPPLEMENTS
create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplement_name text,
  dose text,
  time timestamptz,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_supplements_userid_time on public.supplements (user_id, time desc);

-- MOOD LOGS
create table if not exists public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood_score int check (mood_score between 1 and 10),
  stress_level int check (stress_level between 1 and 10),
  notes text,
  date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz default now()
);
create index if not exists idx_mood_userid_date on public.mood_logs (user_id, date desc);

-- CHAT INTERACTIONS
create table if not exists public.chat_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  response text,
  context jsonb,
  timestamp timestamptz default now()
);
create index if not exists idx_chat_userid_ts on public.chat_interactions (user_id, timestamp desc);

-- PHOTOS (metadata)
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null, -- Supabase storage key
  kind text,                  -- meal | workout | sleep | progress
  taken_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_photos_userid_created on public.photos (user_id, created_at desc);

-- =========================
-- Add nutrition targets columns (idempotent)
-- =========================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
    and table_name = 'user_profiles' 
    and column_name = 'daily_kcal_target'
  ) then
    alter table public.user_profiles add column daily_kcal_target int;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
    and table_name = 'user_profiles' 
    and column_name = 'macro_targets'
  ) then
    alter table public.user_profiles add column macro_targets jsonb;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
    and table_name = 'user_profiles' 
    and column_name = 'nutrition_targets'
  ) then
    alter table public.user_profiles add column nutrition_targets jsonb;
  end if;
end $$;

-- =========================
-- RLS
-- =========================
alter table public.user_profiles      enable row level security;
alter table public.workouts          enable row level security;
alter table public.meals             enable row level security;
alter table public.sleep_logs        enable row level security;
alter table public.supplements       enable row level security;
alter table public.mood_logs         enable row level security;
alter table public.chat_interactions enable row level security;
alter table public.photos            enable row level security;

-- =========================
-- Policies (idempotent)
-- =========================

-- user_profiles policies (based on user_id)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles' and policyname='users_select_own_profile'
  ) then
    create policy "users_select_own_profile"
      on public.user_profiles for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles' and policyname='users_insert_own_profile'
  ) then
    create policy "users_insert_own_profile"
      on public.user_profiles for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles' and policyname='users_update_own_profile'
  ) then
    create policy "users_update_own_profile"
      on public.user_profiles for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles' and policyname='users_delete_own_profile'
  ) then
    create policy "users_delete_own_profile"
      on public.user_profiles for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- Generic per-table policies for tables that use user_id
do $$
declare t text;
begin
  for t in
    select unnest(array['workouts','meals','sleep_logs','supplements','mood_logs','chat_interactions','photos'])
  loop
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname='users_select_own_'||t
    ) then
      execute format('create policy "users_select_own_%I" on public.%I for select using (auth.uid() = user_id);', t, t);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname='users_insert_own_'||t
    ) then
      execute format('create policy "users_insert_own_%I" on public.%I for insert with check (auth.uid() = user_id);', t, t);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname='users_update_own_'||t
    ) then
      execute format('create policy "users_update_own_%I" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t, t);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname='users_delete_own_'||t
    ) then
      execute format('create policy "users_delete_own_%I" on public.%I for delete using (auth.uid() = user_id);', t, t);
    end if;
  end loop;
end $$;

-- =========================
-- Trigger: keep updated_at fresh
-- =========================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_user_profiles on public.user_profiles;
create trigger trg_touch_user_profiles
before update on public.user_profiles
for each row execute function public.touch_updated_at();

-- =========================
-- OPTIONAL: Storage policies for a private 'photos' bucket
-- (Uncomment after you create a Storage bucket named 'photos')
-- =========================
/*
create policy if not exists "photos_read_own"
on storage.objects for select to authenticated
using (bucket_id = 'photos' and substring(name from 1 for 36) = auth.uid()::text);

create policy if not exists "photos_write_own"
on storage.objects for insert to authenticated
with check (bucket_id = 'photos' and substring(name from 1 for 36) = auth.uid()::text);

create policy if not exists "photos_update_own"
on storage.objects for update to authenticated
using (bucket_id = 'photos' and substring(name from 1 for 36) = auth.uid()::text);

create policy if not exists "photos_delete_own"
on storage.objects for delete to authenticated
using (bucket_id = 'photos' and substring(name from 1 for 36) = auth.uid()::text);
*/
