-- TVK Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Members (TVK MLAs, ministers, party officials)
create table if not exists members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text not null,
  constituency text,
  party text not null default 'TVK',
  photo_url text,
  wiki_url text,
  created_at timestamptz default now()
);

-- Incidents
create table if not exists incidents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  summary text not null,
  category text not null,
  incident_date date not null,
  location text,
  source_urls text[] default '{}',
  member_ids uuid[] default '{}',
  is_credit_steal boolean default false,
  original_credit text,        -- what was actually done by previous govt
  severity int default 1 check (severity between 1 and 5),
  ai_confidence float default 0,
  status text default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  ai_raw jsonb,
  created_at timestamptz default now()
);

-- Promises (TVK election manifesto)
create table if not exists promises (
  id uuid primary key default uuid_generate_v4(),
  text text not null,
  category text not null,
  made_date date not null,
  deadline date,
  status text default 'pending' check (status in ('pending', 'kept', 'broken', 'partial')),
  evidence_url text,
  notes text,
  source text default 'manifesto',
  created_at timestamptz default now()
);

-- Sources (deduplicate scraped URLs)
create table if not exists sources (
  id uuid primary key default uuid_generate_v4(),
  url text unique not null,
  outlet text,
  title text,
  credibility_score float default 0.8,
  scraped_at timestamptz default now()
);

-- Indexes
create index if not exists idx_incidents_category on incidents(category);
create index if not exists idx_incidents_status on incidents(status);
create index if not exists idx_incidents_date on incidents(incident_date desc);
create index if not exists idx_incidents_credit_steal on incidents(is_credit_steal) where is_credit_steal = true;
create index if not exists idx_promises_status on promises(status);

-- Row Level Security (read-only public access)
alter table incidents enable row level security;
alter table promises enable row level security;
alter table members enable row level security;
alter table sources enable row level security;

-- Public can read approved incidents
create policy "public read approved incidents"
  on incidents for select
  using (status = 'approved');

-- Public can read all promises and members
create policy "public read promises" on promises for select using (true);
create policy "public read members" on members for select using (true);
