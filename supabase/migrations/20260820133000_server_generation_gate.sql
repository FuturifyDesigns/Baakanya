drop function if exists public.authorize_generation(text);

create or replace function public.authorize_generation(target_user uuid, tool_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := target_user;
  now_at timestamptz := now();
  access_kind text;
  day_count integer;
  trial_count integer;
  credit_balance integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;
  if uid is null or tool_name is null or tool_name !~ '^[a-z0-9_]{2,40}$' then
    return jsonb_build_object('allowed', false, 'reason', 'Invalid generation request.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select count(*) into day_count from generations
    where user_id = uid and created_at >= now_at - interval '24 hours';
  if exists(select 1 from subscriptions
            where user_id = uid and status = 'active' and end_date > now_at) then
    if day_count >= 100 then
      return jsonb_build_object('allowed', false, 'reason', 'Daily fair-use limit reached. Try again tomorrow.');
    end if;
    access_kind := 'subscription';
  elsif exists(select 1 from profiles
               where id = uid and trial_end_date > now_at and plan_type = 'trial') then
    select count(*) into trial_count from generations
      where user_id = uid and access_type = 'trial';
    if day_count >= 20 or trial_count >= 50 then
      return jsonb_build_object('allowed', false, 'reason', 'Free-trial generation limit reached.');
    end if;
    access_kind := 'trial';
  else
    select balance into credit_balance from credits where user_id = uid for update;
    if coalesce(credit_balance, 0) <= 0 then
      return jsonb_build_object('allowed', false, 'reason', 'No active access or credits remain.');
    end if;
    update credits set balance = balance - 1, last_updated = now_at where user_id = uid;
    access_kind := 'credits';
  end if;
  insert into generations(user_id, tool_used, access_type)
  values(uid, tool_name, access_kind);
  return jsonb_build_object(
    'allowed', true,
    'accessType', access_kind,
    'remainingCredits', case when access_kind = 'credits' then credit_balance - 1 else null end
  );
end
$$;
revoke all on function public.authorize_generation(uuid, text) from public, anon, authenticated;
grant execute on function public.authorize_generation(uuid, text) to service_role;
