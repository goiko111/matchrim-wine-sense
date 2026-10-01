-- Isolated QA schema used only in qpbmqvfnunkylvtvnyyx.
-- The project Data API exposes this schema instead of the middleware public schema.
create schema if not exists matchrim_qa;
revoke all on schema matchrim_qa from public;
grant usage on schema matchrim_qa to authenticated, service_role;

create table if not exists matchrim_qa.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  potente integer not null check (potente between 0 and 5),
  acidez integer not null check (acidez between 0 and 5),
  dulce integer not null check (dulce between 0 and 5),
  tanico integer not null check (tanico between 0 and 5),
  afrutado integer not null check (afrutado between 0 and 5),
  created_at timestamptz not null default now()
);

create table if not exists matchrim_qa.user_wines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  producer text,
  region text,
  country text,
  grape_varieties text[],
  vintage integer,
  rating text,
  sensory_attributes jsonb,
  use_for_profile_training boolean not null default false,
  matchrim_affinity integer,
  place_details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table matchrim_qa.quiz_results enable row level security;
alter table matchrim_qa.user_wines enable row level security;

drop policy if exists "qa quiz owner select" on matchrim_qa.quiz_results;
create policy "qa quiz owner select" on matchrim_qa.quiz_results
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "qa wine owner select" on matchrim_qa.user_wines;
create policy "qa wine owner select" on matchrim_qa.user_wines
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "qa wine owner insert" on matchrim_qa.user_wines;
create policy "qa wine owner insert" on matchrim_qa.user_wines
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "qa wine owner update" on matchrim_qa.user_wines;
create policy "qa wine owner update" on matchrim_qa.user_wines
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "qa wine owner delete" on matchrim_qa.user_wines;
create policy "qa wine owner delete" on matchrim_qa.user_wines
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select on matchrim_qa.quiz_results to authenticated;
grant select, insert, update, delete on matchrim_qa.user_wines to authenticated;
grant all on all tables in schema matchrim_qa to service_role;
