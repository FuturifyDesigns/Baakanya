-- Client-readable returning-user context (trial used, prior paid access).
create or replace function public.get_user_access_context()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p public.profiles%rowtype;
  trial_used boolean := false;
  had_sub boolean := false;
  had_credits boolean := false;
  returning_user boolean := false;
begin
  if uid is null then
    return jsonb_build_object(
      'has_used_trial', false,
      'is_returning_user', false,
      'had_subscription', false,
      'had_credits', false
    );
  end if;

  select * into p from public.profiles where id = uid;

  select
    coalesce(p.trial_end_date is not null, false)
    or exists (select 1 from public.trial_records tr where tr.user_id = uid)
  into trial_used;

  select exists (
    select 1 from public.subscriptions s where s.user_id = uid
  ) into had_sub;

  select
    p.plan_type = 'credits'
    or exists (
      select 1
      from public.payment_submissions ps
      where ps.user_id = uid
        and ps.plan_type = 'credits'
        and ps.status in ('approved', 'pending')
    )
  into had_credits;

  returning_user := trial_used
    or had_sub
    or had_credits
    or p.plan_type in ('credits', 'subscription', 'trial')
    or exists (
      select 1
      from public.payment_submissions ps
      where ps.user_id = uid
        and ps.status = 'approved'
    );

  return jsonb_build_object(
    'has_used_trial', trial_used,
    'is_returning_user', returning_user,
    'had_subscription', had_sub,
    'had_credits', had_credits
  );
end;
$$;

revoke all on function public.get_user_access_context() from public, anon;
grant execute on function public.get_user_access_context() to authenticated;
