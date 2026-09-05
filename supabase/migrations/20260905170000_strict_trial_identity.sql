-- Enforce one lifetime free trial per account, normalized email, device and IP.
-- Only keyed hashes are retained for device/network identities.

alter table public.trial_records
  add column if not exists device_fingerprint_v2_hash text;
alter table public.trial_reservations
  add column if not exists device_fingerprint_v2_hash text;
alter table public.abuse_events
  add column if not exists device_fingerprint_v2_hash text;

create unique index if not exists one_trial_per_device_fingerprint_v2
  on public.trial_records(device_fingerprint_v2_hash)
  where device_fingerprint_v2_hash is not null;

create table if not exists public.trial_identity_claims (
  identity_type text not null
    check (identity_type in ('account', 'email', 'device', 'device_v2', 'ip')),
  identity_hash text not null,
  created_at timestamptz not null default now(),
  primary key (identity_type, identity_hash)
);

alter table public.trial_identity_claims enable row level security;
revoke all on public.trial_identity_claims from public, anon, authenticated;

-- Preserve all historical usage, including trials whose user account was deleted.
insert into public.trial_identity_claims(identity_type, identity_hash)
select 'account', user_id::text from public.trial_records where user_id is not null
on conflict do nothing;
insert into public.trial_identity_claims(identity_type, identity_hash)
select 'email', email_fingerprint_hash from public.trial_records
where email_fingerprint_hash is not null
on conflict do nothing;
insert into public.trial_identity_claims(identity_type, identity_hash)
select 'device', device_fingerprint_hash from public.trial_records
where device_fingerprint_hash is not null
on conflict do nothing;
insert into public.trial_identity_claims(identity_type, identity_hash)
select 'device_v2', device_fingerprint_v2_hash from public.trial_records
where device_fingerprint_v2_hash is not null
on conflict do nothing;
insert into public.trial_identity_claims(identity_type, identity_hash)
select 'ip', ip_fingerprint_hash from public.trial_records
where ip_fingerprint_hash is not null
on conflict do nothing;

create or replace function public.choose_access_mode(
  selected_mode text,
  reservation_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  user_email text;
  reservation public.trial_reservations%rowtype;
  reservation_found boolean := false;
  claimed_identity_count integer := 0;
begin
  if uid is null then
    raise exception 'Sign in to choose an access mode.';
  end if;
  if selected_mode not in ('trial', 'credits', 'subscription') then
    raise exception 'Choose free trial, credits, or monthly access.';
  end if;

  if exists (
    select 1 from public.payment_submissions
    where user_id = uid and status = 'pending'
  ) then
    raise exception 'Your receipt is under review. Wait for admin verification before choosing another option.';
  end if;

  select email into user_email from auth.users where id = uid;
  if user_email is null then
    raise exception 'Account not found.';
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
    return jsonb_build_object('ok', true, 'status', 'already_active');
  end if;

  if selected_mode in ('credits', 'subscription') then
    update public.profiles
    set signup_intent = selected_mode,
        plan_type = 'none',
        trial_start_date = null,
        trial_end_date = null,
        access_note = 'Awaiting payment for ' || selected_mode
    where id = uid;
    return jsonb_build_object('ok', true, 'status', 'awaiting_payment', 'mode', selected_mode);
  end if;

  if coalesce(reservation_token, '') = '' then
    raise exception 'Trial reservation missing. Try again.';
  end if;

  select * into reservation
  from public.trial_reservations
  where token_hash = encode(extensions.digest(convert_to(reservation_token, 'UTF8'), 'sha256'), 'hex')
    and status = 'active'
    and expires_at > now()
    and claimed_by is null
    and email_normalized = public.normalize_trial_email(user_email)
  for update;
  reservation_found := found;

  if not reservation_found then
    raise exception 'This trial reservation is invalid or expired.';
  end if;
  if reservation.device_fingerprint_v2_hash is null then
    raise exception 'This trial reservation needs to be refreshed.';
  end if;

  -- Serialize competing activations for every identity dimension.
  perform pg_advisory_xact_lock(hashtextextended('account:' || uid::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('email:' || reservation.email_fingerprint_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended('device:' || reservation.device_fingerprint_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended('device_v2:' || reservation.device_fingerprint_v2_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended('ip:' || reservation.ip_fingerprint_hash, 0));

  if exists (
    select 1 from public.trial_records
    where email_normalized = reservation.email_normalized
       or email_fingerprint_hash = reservation.email_fingerprint_hash
       or device_fingerprint_hash = reservation.device_fingerprint_hash
       or device_fingerprint_v2_hash = reservation.device_fingerprint_v2_hash
       or ip_fingerprint_hash = reservation.ip_fingerprint_hash
       or user_id = uid
  ) then
    raise exception 'A free trial has already been used by this account, device or network.';
  end if;

  with inserted as (
    insert into public.trial_identity_claims(identity_type, identity_hash)
    values
      ('account', uid::text),
      ('email', reservation.email_fingerprint_hash),
      ('device', reservation.device_fingerprint_hash),
      ('device_v2', reservation.device_fingerprint_v2_hash),
      ('ip', reservation.ip_fingerprint_hash)
    on conflict do nothing
    returning 1
  )
  select count(*) into claimed_identity_count from inserted;

  if claimed_identity_count <> 5 then
    raise exception 'A free trial has already been used by this account, device or network.';
  end if;

  begin
    insert into public.trial_records(
      user_id,
      email_normalized,
      email_fingerprint_hash,
      device_fingerprint_hash,
      device_fingerprint_v2_hash,
      ip_fingerprint_hash,
      trial_start_date,
      trial_end_date
    ) values (
      uid,
      reservation.email_normalized,
      reservation.email_fingerprint_hash,
      reservation.device_fingerprint_hash,
      reservation.device_fingerprint_v2_hash,
      reservation.ip_fingerprint_hash,
      now(),
      now() + interval '7 days'
    );
  exception when unique_violation then
    raise exception 'A free trial has already been used by this account, device or network.';
  end;

  update public.profiles
  set signup_intent = 'trial',
      plan_type = 'trial',
      trial_start_date = now(),
      trial_end_date = now() + interval '7 days',
      access_note = '7-day trial active'
  where id = uid;

  update public.trial_reservations
  set status = 'claimed', claimed_by = uid
  where id = reservation.id;

  insert into public.abuse_events(
    event_type,
    email_fingerprint_hash,
    device_fingerprint_hash,
    device_fingerprint_v2_hash,
    ip_fingerprint_hash,
    allowed,
    reason,
    user_id
  ) values (
    'trial_activation',
    reservation.email_fingerprint_hash,
    reservation.device_fingerprint_hash,
    reservation.device_fingerprint_v2_hash,
    reservation.ip_fingerprint_hash,
    true,
    'trial_activated_strict_identity',
    uid
  );

  return jsonb_build_object('ok', true, 'status', 'trial_active', 'mode', 'trial');
end;
$$;

revoke all on function public.choose_access_mode(text, text) from public, anon;
grant execute on function public.choose_access_mode(text, text) to authenticated;
