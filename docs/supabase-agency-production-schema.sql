-- OrganizAPP Agency Production Module
-- Suggested Supabase schema for v0 to review and adapt.
-- IMPORTANT:
-- 1. Do not run blindly in production.
-- 2. Audit existing tables, columns, views, RPCs and RLS first.
-- 3. Do not drop existing objects.
-- 4. Use this as a starting point for staging or a reviewed migration.

create extension if not exists pgcrypto;

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text null,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  contact_name text null,
  contact_email text null,
  contact_phone text null,
  notes text null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_plans (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  brand_id uuid null references public.brands(id) on delete set null,
  name text not null,
  period_type text not null default 'monthly' check (period_type in ('monthly', 'weekly', 'campaign', 'custom')),
  period_start date not null,
  period_end date not null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  responsible_internal_id uuid null references public.profiles(id) on delete set null,
  notes text null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.production_plans(id) on delete cascade,
  deliverable_type text not null,
  target_quantity integer not null default 1 check (target_quantity > 0),
  channel text null,
  format text null,
  notes text null,
  created_at timestamptz not null default now()
);

create table if not exists public.production_deliverables (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.production_plans(id) on delete cascade,
  plan_item_id uuid null references public.production_plan_items(id) on delete set null,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  brand_id uuid null references public.brands(id) on delete set null,
  title text not null,
  description text null,
  deliverable_type text not null,
  channel text null,
  format text null,
  status text not null default 'pending' check (
    status in (
      'pending',
      'brief_sent',
      'in_production',
      'delivered',
      'in_review',
      'changes_requested',
      'approved',
      'published',
      'paused',
      'cancelled'
    )
  ),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date null,
  delivered_at timestamptz null,
  approved_at timestamptz null,
  published_at timestamptz null,
  responsible_internal_id uuid null references public.profiles(id) on delete set null,
  responsible_agency_member_id uuid null references public.profiles(id) on delete set null,
  external_url text null,
  notes text null,
  position integer not null default 0,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agencies_status_idx on public.agencies(status);
create index if not exists brands_status_idx on public.brands(status);
create index if not exists production_plans_agency_id_idx on public.production_plans(agency_id);
create index if not exists production_plans_brand_id_idx on public.production_plans(brand_id);
create index if not exists production_plans_period_idx on public.production_plans(period_start, period_end);
create index if not exists production_deliverables_plan_id_idx on public.production_deliverables(plan_id);
create index if not exists production_deliverables_agency_id_idx on public.production_deliverables(agency_id);
create index if not exists production_deliverables_status_idx on public.production_deliverables(status);
create index if not exists production_deliverables_due_date_idx on public.production_deliverables(due_date);

-- Helper function: approved global admin.
-- Confirm profiles.role and profiles.status exist before relying on this.
create or replace function public.is_approved_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.status = 'approved'
      and p.role = 'admin'
  );
$$;

create or replace function public.is_approved_user(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.status = 'approved'
  );
$$;

alter table public.agencies enable row level security;
alter table public.brands enable row level security;
alter table public.production_plans enable row level security;
alter table public.production_plan_items enable row level security;
alter table public.production_deliverables enable row level security;

-- Baseline policies: approved users can read, approved admins can manage.
-- v0 should tighten these if agency users need scoped access only.

drop policy if exists "approved users can read agencies" on public.agencies;
create policy "approved users can read agencies"
on public.agencies for select
to authenticated
using (public.is_approved_user(auth.uid()));

drop policy if exists "admins can manage agencies" on public.agencies;
create policy "admins can manage agencies"
on public.agencies for all
to authenticated
using (public.is_approved_admin(auth.uid()))
with check (public.is_approved_admin(auth.uid()));

drop policy if exists "approved users can read brands" on public.brands;
create policy "approved users can read brands"
on public.brands for select
to authenticated
using (public.is_approved_user(auth.uid()));

drop policy if exists "admins can manage brands" on public.brands;
create policy "admins can manage brands"
on public.brands for all
to authenticated
using (public.is_approved_admin(auth.uid()))
with check (public.is_approved_admin(auth.uid()));

drop policy if exists "approved users can read production plans" on public.production_plans;
create policy "approved users can read production plans"
on public.production_plans for select
to authenticated
using (public.is_approved_user(auth.uid()));

drop policy if exists "admins can manage production plans" on public.production_plans;
create policy "admins can manage production plans"
on public.production_plans for all
to authenticated
using (public.is_approved_admin(auth.uid()))
with check (public.is_approved_admin(auth.uid()));

drop policy if exists "approved users can read production plan items" on public.production_plan_items;
create policy "approved users can read production plan items"
on public.production_plan_items for select
to authenticated
using (public.is_approved_user(auth.uid()));

drop policy if exists "admins can manage production plan items" on public.production_plan_items;
create policy "admins can manage production plan items"
on public.production_plan_items for all
to authenticated
using (public.is_approved_admin(auth.uid()))
with check (public.is_approved_admin(auth.uid()));

drop policy if exists "approved users can read production deliverables" on public.production_deliverables;
create policy "approved users can read production deliverables"
on public.production_deliverables for select
to authenticated
using (public.is_approved_user(auth.uid()));

drop policy if exists "admins can manage production deliverables" on public.production_deliverables;
create policy "admins can manage production deliverables"
on public.production_deliverables for all
to authenticated
using (public.is_approved_admin(auth.uid()))
with check (public.is_approved_admin(auth.uid()));

-- If non-admin approved users should update their own assigned deliverables, enable this policy after review.
-- create policy "approved responsible users can update assigned deliverables"
-- on public.production_deliverables for update
-- to authenticated
-- using (
--   public.is_approved_user(auth.uid())
--   and responsible_internal_id = auth.uid()
-- )
-- with check (
--   public.is_approved_user(auth.uid())
--   and responsible_internal_id = auth.uid()
-- );
