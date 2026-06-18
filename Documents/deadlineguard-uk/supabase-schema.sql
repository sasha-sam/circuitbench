-- DeadlineGuard UK — Supabase schema
-- Run this in the Supabase SQL editor

create table if not exists tracked_companies (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company_number text not null,
  company_name text,
  company_status text,
  accounts_due date,
  confirmation_statement_due date,
  risk_level text,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'free',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for cron job lookups
create index if not exists tracked_companies_email_idx
  on tracked_companies(email);

create index if not exists tracked_companies_company_number_idx
  on tracked_companies(company_number);

-- Prevent duplicate subscriptions for the same email + company
create unique index if not exists tracked_companies_unique_email_company
  on tracked_companies(email, company_number);

-- Row Level Security: service role bypasses, anon cannot read
alter table tracked_companies enable row level security;

create policy "Service role only"
  on tracked_companies
  for all
  using (false);
