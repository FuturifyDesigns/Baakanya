-- Allow users stuck on unpaid paid intent to return to mode selection.

create or replace function public.clear_access_mode_selection()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  if exists (
    select 1 from public.profiles
    where id = uid and trial_end_date is not null and trial_end_date > now()
  ) or exists (
    select 1 from public.subscriptions
    where user_id = uid and status = 'active' and end_date > now()
  ) or exists (
    select 1 from public.credits where user_id = uid and balance > 0
  ) then
    raise exception 'You already have active access.';
  end if;

  update public.profiles
  set signup_intent = null,
      plan_type = 'none',
      access_note = 'Awaiting access mode selection'
  where id = uid;

  return jsonb_build_object('ok', true, 'status', 'awaiting_mode');
end;
$$;

revoke all on function public.clear_access_mode_selection() from public, anon;
grant execute on function public.clear_access_mode_selection() to authenticated;
