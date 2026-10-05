create table if not exists matchrim_qa.wine_recommendations (
  id uuid primary key default gen_random_uuid(),
  quiz_result_id uuid not null references matchrim_qa.quiz_results(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  wine_name text not null,
  wine_type text not null,
  winery text not null,
  region text not null,
  country text not null,
  compatibility_score integer not null,
  created_at timestamptz not null default now()
);

create table if not exists matchrim_qa.wine_styles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  potente integer not null,
  acidez integer not null,
  dulce integer not null,
  tanico integer not null,
  afrutado integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table matchrim_qa.wine_recommendations enable row level security;
alter table matchrim_qa.wine_styles enable row level security;

drop policy if exists "QA users manage own recommendations" on matchrim_qa.wine_recommendations;
create policy "QA users manage own recommendations"
on matchrim_qa.wine_recommendations
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "QA users read wine styles" on matchrim_qa.wine_styles;
create policy "QA users read wine styles"
on matchrim_qa.wine_styles
for select
to authenticated
using (true);

grant select, insert, update, delete on matchrim_qa.wine_recommendations to authenticated;
grant all on matchrim_qa.wine_recommendations to service_role;
grant select on matchrim_qa.wine_styles to authenticated;
grant all on matchrim_qa.wine_styles to service_role;
