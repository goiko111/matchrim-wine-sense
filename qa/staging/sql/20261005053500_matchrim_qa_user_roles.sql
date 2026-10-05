create table if not exists matchrim_qa.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table matchrim_qa.user_roles enable row level security;

drop policy if exists "QA users read own roles" on matchrim_qa.user_roles;
create policy "QA users read own roles"
on matchrim_qa.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on matchrim_qa.user_roles to authenticated;
grant all on matchrim_qa.user_roles to service_role;
