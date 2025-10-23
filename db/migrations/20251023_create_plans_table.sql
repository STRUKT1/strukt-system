-- =========================================================
-- STRUKT Plans Table Migration
-- =========================================================
-- Creates table for storing AI-generated training/nutrition plans
-- with version history support

-- =========================
-- PLANS TABLE
-- =========================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Plan content (JSON structure with training, nutrition, recovery, coaching)
  plan_data jsonb not null,
  
  -- Plan metadata
  version int not null default 1,
  generation_method text default 'ai', -- 'ai' | 'fallback' | 'manual'
  fallback_reason text,                -- Reason if fallback was used
  
  -- Context used for generation
  wellness_context jsonb,              -- Wellness data snapshot used for generation
  profile_snapshot jsonb,              -- Profile data snapshot at generation time
  
  -- Validation & Status
  is_valid boolean default true,
  validation_errors jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint version_positive check (version > 0)
);

-- Indexes for efficient queries
create index if not exists idx_plans_userid on public.plans (user_id);
create index if not exists idx_plans_userid_created on public.plans (user_id, created_at desc);
create index if not exists idx_plans_userid_version on public.plans (user_id, version desc);

-- =========================
-- RLS for plans
-- =========================
alter table public.plans enable row level security;

-- Policies (idempotent)
do $$
begin
  -- Select own plans
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plans' and policyname='users_select_own_plans'
  ) then
    create policy "users_select_own_plans"
      on public.plans for select
      using (auth.uid() = user_id);
  end if;

  -- Insert own plans
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plans' and policyname='users_insert_own_plans'
  ) then
    create policy "users_insert_own_plans"
      on public.plans for insert
      with check (auth.uid() = user_id);
  end if;

  -- Update own plans
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plans' and policyname='users_update_own_plans'
  ) then
    create policy "users_update_own_plans"
      on public.plans for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  -- Delete own plans
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plans' and policyname='users_delete_own_plans'
  ) then
    create policy "users_delete_own_plans"
      on public.plans for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- =========================
-- Trigger: keep updated_at fresh
-- =========================
drop trigger if exists trg_touch_plans on public.plans;
create trigger trg_touch_plans
before update on public.plans
for each row execute function public.touch_updated_at();
