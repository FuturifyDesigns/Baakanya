-- Soft-check access without consuming credits; finalize once per draft_key.

create table if not exists public.document_finalizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_key text not null,
  tool_name text not null,
  access_type text not null,
  created_at timestamptz not null default now(),
  unique (user_id, draft_key)
);

alter table public.document_finalizations enable row level security;

drop policy if exists "read own finalizations" on public.document_finalizations;
create policy "read own finalizations"
  on public.document_finalizations for select
  using (auth.uid() = user_id);

create index if not exists document_finalizations_user_created_idx
  on public.document_finalizations (user_id, created_at desc);

create or replace function public.check_generation_access(
  target_user uuid,
  tool_name text
)
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

  select count(*) into day_count from generations
    where user_id = uid and created_at >= now_at - interval '24 hours';

  if exists(
    select 1 from subscriptions
    where user_id = uid and status = 'active' and end_date > now_at
  ) then
    if day_count >= 100 then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'Daily fair-use limit reached. Try again tomorrow.'
      );
    end if;
    access_kind := 'subscription';
  elsif exists(
    select 1 from profiles
    where id = uid and trial_end_date > now_at and plan_type = 'trial'
  ) then
    select count(*) into trial_count from generations
      where user_id = uid and access_type = 'trial';
    if day_count >= 20 or trial_count >= 50 then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'Free-trial generation limit reached.'
      );
    end if;
    access_kind := 'trial';
  else
    select balance into credit_balance from credits where user_id = uid;
    if coalesce(credit_balance, 0) <= 0 then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'No active access or credits remain.'
      );
    end if;
    access_kind := 'credits';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'accessType', access_kind,
    'remainingCredits', case
      when access_kind = 'credits' then credit_balance
      else null
    end,
    'charged', false
  );
end
$$;

revoke all on function public.check_generation_access(uuid, text) from public, anon, authenticated;
grant execute on function public.check_generation_access(uuid, text) to service_role;

drop function if exists public.authorize_generation(uuid, text);

create or replace function public.authorize_generation(
  target_user uuid,
  tool_name text,
  p_draft_key text default null
)
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
  existing_access text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;
  if uid is null or tool_name is null or tool_name !~ '^[a-z0-9_]{2,40}$' then
    return jsonb_build_object('allowed', false, 'reason', 'Invalid generation request.');
  end if;
  if p_draft_key is not null and p_draft_key !~ '^[a-f0-9-]{8,64}$' then
    return jsonb_build_object('allowed', false, 'reason', 'Invalid document draft.');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  if p_draft_key is not null then
    select access_type into existing_access
    from document_finalizations
    where user_id = uid and draft_key = p_draft_key;
    if found then
      select balance into credit_balance from credits where user_id = uid;
      return jsonb_build_object(
        'allowed', true,
        'accessType', existing_access,
        'remainingCredits', credit_balance,
        'charged', false,
        'alreadyFinalized', true
      );
    end if;
  end if;

  select count(*) into day_count from generations
    where user_id = uid and created_at >= now_at - interval '24 hours';

  if exists(
    select 1 from subscriptions
    where user_id = uid and status = 'active' and end_date > now_at
  ) then
    if day_count >= 100 then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'Daily fair-use limit reached. Try again tomorrow.'
      );
    end if;
    access_kind := 'subscription';
  elsif exists(
    select 1 from profiles
    where id = uid and trial_end_date > now_at and plan_type = 'trial'
  ) then
    select count(*) into trial_count from generations
      where user_id = uid and access_type = 'trial';
    if day_count >= 20 or trial_count >= 50 then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'Free-trial generation limit reached.'
      );
    end if;
    access_kind := 'trial';
  else
    select balance into credit_balance from credits where user_id = uid for update;
    if coalesce(credit_balance, 0) <= 0 then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'No active access or credits remain.'
      );
    end if;
    update credits
      set balance = balance - 1, last_updated = now_at
      where user_id = uid;
    access_kind := 'credits';
  end if;

  insert into generations(user_id, tool_used, access_type)
  values(uid, tool_name, access_kind);

  if p_draft_key is not null then
    insert into document_finalizations(user_id, draft_key, tool_name, access_type)
    values(uid, p_draft_key, tool_name, access_kind)
    on conflict (user_id, draft_key) do nothing;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'accessType', access_kind,
    'remainingCredits', case
      when access_kind = 'credits' then credit_balance - 1
      else null
    end,
    'charged', true,
    'alreadyFinalized', false
  );
end
$$;

revoke all on function public.authorize_generation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.authorize_generation(uuid, text, text) to service_role;
