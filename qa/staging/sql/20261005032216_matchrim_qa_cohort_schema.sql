-- Isolated Matchrim cohort schema. This migration is intended for the dedicated
-- middleware staging project and must never be applied to the production project.
create schema if not exists matchrim_qa;
comment on schema matchrim_qa is 'Isolated Matchrim QA accounts and synthetic content';

alter table matchrim_qa.quiz_results
  add column if not exists profile_description text not null default '';

alter table matchrim_qa.user_wines
  add column if not exists alcohol_content numeric,
  add column if not exists consumption_date date,
  add column if not exists consumption_place text,
  add column if not exists consumption_place_type text,
  add column if not exists image_url text,
  add column if not exists is_favorite boolean default false,
  add column if not exists personal_note text,
  add column if not exists price numeric,
  add column if not exists quantity integer default 1,
  add column if not exists restaurant_id text,
  add column if not exists status text not null default 'tasted',
  add column if not exists tasting_notes text;

create table if not exists matchrim_qa.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  name text,
  birth_date date,
  location text,
  preferred_language text default 'es',
  privacy_accepted boolean default false,
  terms_accepted boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists matchrim_qa.wine_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wine_types text[],
  taste_preferences text[],
  price_range text,
  experience_type text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists matchrim_qa.dietary_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dietary_restrictions text[],
  food_pairings text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists matchrim_qa.matchrim_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  potente integer not null,
  acidez integer not null,
  dulce integer not null,
  tanico integer not null,
  afrutado integer not null,
  grape_recommendations text[],
  region_recommendations text[],
  style_recommendations text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists matchrim_qa.restaurant_matchrim_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_name text not null,
  restaurant_address text,
  restaurant_place_id text,
  is_winerim_restaurant boolean not null default false,
  matchrim_code text not null,
  matchrim_profile jsonb not null default '{}'::jsonb,
  menu_scan_used boolean not null default false,
  wines_detected integer,
  source text not null default 'matchrim-qa',
  created_at timestamptz not null default now()
);

create table if not exists matchrim_qa.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_name text not null,
  route text,
  platform text,
  app_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists matchrim_qa_quiz_results_user_id_idx
  on matchrim_qa.quiz_results(user_id);
create index if not exists matchrim_qa_user_wines_user_id_idx
  on matchrim_qa.user_wines(user_id);
create index if not exists matchrim_qa_wine_preferences_user_id_idx
  on matchrim_qa.wine_preferences(user_id);
create index if not exists matchrim_qa_dietary_preferences_user_id_idx
  on matchrim_qa.dietary_preferences(user_id);
create index if not exists matchrim_qa_restaurant_sessions_user_id_idx
  on matchrim_qa.restaurant_matchrim_sessions(user_id);
create index if not exists matchrim_qa_app_events_user_id_idx
  on matchrim_qa.app_events(user_id);

alter table matchrim_qa.profiles enable row level security;
alter table matchrim_qa.quiz_results enable row level security;
alter table matchrim_qa.user_wines enable row level security;
alter table matchrim_qa.wine_preferences enable row level security;
alter table matchrim_qa.dietary_preferences enable row level security;
alter table matchrim_qa.restaurant_matchrim_sessions enable row level security;
alter table matchrim_qa.app_events enable row level security;
alter table matchrim_qa.matchrim_profiles enable row level security;

drop policy if exists "qa_profiles_own" on matchrim_qa.profiles;
create policy "qa_profiles_own" on matchrim_qa.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "qa_quiz_results_own" on matchrim_qa.quiz_results;
create policy "qa_quiz_results_own" on matchrim_qa.quiz_results
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "qa_user_wines_own" on matchrim_qa.user_wines;
create policy "qa_user_wines_own" on matchrim_qa.user_wines
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "qa_wine_preferences_own" on matchrim_qa.wine_preferences;
create policy "qa_wine_preferences_own" on matchrim_qa.wine_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "qa_dietary_preferences_own" on matchrim_qa.dietary_preferences;
create policy "qa_dietary_preferences_own" on matchrim_qa.dietary_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "qa_restaurant_sessions_own" on matchrim_qa.restaurant_matchrim_sessions;
create policy "qa_restaurant_sessions_own" on matchrim_qa.restaurant_matchrim_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "qa_app_events_select_own" on matchrim_qa.app_events;
create policy "qa_app_events_select_own" on matchrim_qa.app_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "qa_app_events_insert_own" on matchrim_qa.app_events;
create policy "qa_app_events_insert_own" on matchrim_qa.app_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "qa_matchrim_profiles_read" on matchrim_qa.matchrim_profiles;
create policy "qa_matchrim_profiles_read" on matchrim_qa.matchrim_profiles
  for select to anon, authenticated
  using (true);

grant usage on schema matchrim_qa to anon, authenticated, service_role;
grant select on matchrim_qa.matchrim_profiles to anon, authenticated;
grant select, insert, update, delete on
  matchrim_qa.profiles,
  matchrim_qa.quiz_results,
  matchrim_qa.user_wines,
  matchrim_qa.wine_preferences,
  matchrim_qa.dietary_preferences,
  matchrim_qa.restaurant_matchrim_sessions
to authenticated;
grant select, insert on matchrim_qa.app_events to authenticated;
grant all privileges on all tables in schema matchrim_qa to service_role;

insert into matchrim_qa.matchrim_profiles (
  name, description, potente, acidez, dulce, tanico, afrutado,
  grape_recommendations, region_recommendations, style_recommendations
)
select * from (values
  ('Atlantico fresco', 'Acidez viva, fruta y cuerpo ligero.', 2, 5, 1, 1, 4, array['Albarino', 'Godello'], array['Rias Baixas', 'Valdeorras'], array['Blanco fresco']),
  ('Clasico estructurado', 'Cuerpo, tanino y crianza con fruta contenida.', 5, 3, 1, 5, 3, array['Tempranillo', 'Nebbiolo'], array['Rioja', 'Barolo'], array['Tinto con crianza']),
  ('Frutal amable', 'Fruta directa, tanino suave y mucha facilidad.', 2, 3, 2, 1, 5, array['Garnacha', 'Mencia'], array['Bierzo', 'Campo de Borja'], array['Tinto frutal']),
  ('Aromatico dulce', 'Aromas intensos y dulzor claramente perceptible.', 2, 3, 5, 1, 5, array['Moscatel', 'Riesling'], array['Malaga', 'Mosel'], array['Dulce aromatico'])
) as seed(name, description, potente, acidez, dulce, tanico, afrutado, grape_recommendations, region_recommendations, style_recommendations)
where not exists (
  select 1 from matchrim_qa.matchrim_profiles existing where existing.name = seed.name
);
