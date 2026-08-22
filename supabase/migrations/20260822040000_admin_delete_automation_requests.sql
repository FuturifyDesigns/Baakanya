-- Allow admins to delete automation recommendations to free space.

grant delete on public.automation_requests to authenticated;

drop policy if exists "admins delete automation requests" on public.automation_requests;
create policy "admins delete automation requests"
on public.automation_requests
for delete
to authenticated
using (public.is_admin());
