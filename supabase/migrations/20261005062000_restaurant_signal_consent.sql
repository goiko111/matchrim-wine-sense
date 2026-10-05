-- Restaurant demand is visible to administrators only when the user explicitly opts in.
drop policy if exists "Admins can read restaurant demand" on public.restaurant_matchrim_sessions;
create policy "Admins can read consented restaurant demand"
on public.restaurant_matchrim_sessions
for select
to authenticated
using (
  private.has_role((select auth.uid()), 'admin'::public.app_role)
  and source = 'restaurant_lead_opt_in'
);
