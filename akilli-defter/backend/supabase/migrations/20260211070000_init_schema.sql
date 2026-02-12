-- Duo Ledger / Akıllı Defter initial schema
create extension if not exists pgcrypto;

create type public.workspace_type as enum ('personal', 'business');
create type public.workspace_role as enum ('owner', 'member', 'accountant');
create type public.currency_code as enum ('TRY', 'USD', 'EUR');
create type public.transaction_type as enum ('income', 'expense', 'transfer');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  preferred_language text default 'tr',
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type workspace_type not null,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  currency currency_code not null,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  transaction_type transaction_type not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  type transaction_type not null,
  amount numeric(14,2) not null,
  currency currency_code not null,
  category_id uuid references public.categories(id),
  merchant text,
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid references public.categories(id),
  limit_amount numeric(14,2) not null,
  period_start date not null,
  period_end date not null
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email text,
  whatsapp text,
  kind text not null check (kind in ('customer','supplier'))
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid references public.contacts(id),
  code text not null,
  amount numeric(14,2) not null,
  currency currency_code not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deal_id uuid references public.deals(id),
  invoice_number text not null,
  issue_date date not null,
  due_date date not null,
  total_amount numeric(14,2) not null,
  currency currency_code not null
);

create table if not exists public.payment_schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid references public.invoices(id),
  due_date date not null,
  amount numeric(14,2) not null,
  paid_amount numeric(14,2) not null default 0,
  status text not null default 'pending'
);

create table if not exists public.cost_allocations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deal_id uuid references public.deals(id),
  cost_type text not null check (cost_type in ('freight','customs','packing','commission')),
  amount numeric(14,2) not null,
  currency currency_code not null
);

create table if not exists public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency currency_code not null,
  quote_currency currency_code not null,
  rate numeric(14,6) not null,
  as_of_date date not null
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid references public.transactions(id),
  deal_id uuid references public.deals(id),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  insight_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Helper function for RLS
create or replace function public.is_workspace_member(workspace uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.can_access_workspace(workspace uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.workspace_id = workspace
      and wm.user_id = auth.uid()
      and not (wm.role = 'accountant' and w.type = 'personal')
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create policy "profile self access" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "workspace member read" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspace owner manage" on public.workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "workspace members view" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "workspace owners manage members" on public.workspace_members
  for all using (
    exists (
      select 1 from public.workspace_members me
      where me.workspace_id = workspace_members.workspace_id
        and me.user_id = auth.uid()
        and me.role = 'owner'
    )
  );

-- Apply shared RLS policy to workspace-bound tables
DO $$
DECLARE
  tbl text;
  tables text[] := array[
    'accounts','categories','tags','transactions','budgets','contacts','deals',
    'invoices','payment_schedules','cost_allocations','attachments','ai_insights'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY "%s access" ON public.%I FOR ALL USING (public.can_access_workspace(workspace_id)) WITH CHECK (public.can_access_workspace(workspace_id))', tbl, tbl);
  END LOOP;
END;
$$;

alter table public.fx_rates enable row level security;
create policy "fx rates read" on public.fx_rates for select using (auth.role() = 'authenticated');
