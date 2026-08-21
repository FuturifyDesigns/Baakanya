-- Mode is chosen after email verification, not during signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into profiles(id, name, plan_type, signup_intent)
  values(
    new.id,
    new.raw_user_meta_data->>'name',
    'none',
    null
  )
  on conflict (id) do nothing;
  insert into credits(user_id, balance) values(new.id, 0)
  on conflict (user_id) do nothing;
  return new;
end
$$;

create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- Access mode is selected in-app after sign-in. Do not auto-start a trial here.
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles
    set plan_type = coalesce(plan_type, 'none'),
        access_note = coalesce(access_note, 'Awaiting access mode selection')
    where id = new.id;
    insert into public.abuse_events(event_type, allowed, reason, user_id)
    values ('email_confirmed', true, 'awaiting_access_mode', new.id);
  end if;
  return new;
end
$$;

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
begin
  if uid is null then
    raise exception 'Sign in to choose an access mode.';
  end if;
  if selected_mode not in ('trial', 'credits', 'subscription') then
    raise exception 'Choose free trial, credits, or monthly access.';
  end if;

  select email into user_email from auth.users where id = uid;
  if user_email is null then
    raise exception 'Account not found.';
  end if;

  -- Already has usable access: do not re-run mode selection.
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

  -- Trial path requires a fresh reservation from trial-gate.
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

  if exists (
    select 1 from public.trial_records
    where email_normalized = reservation.email_normalized
       or email_fingerprint_hash = reservation.email_fingerprint_hash
       or device_fingerprint_hash = reservation.device_fingerprint_hash
       or user_id = uid
  ) then
    update public.trial_reservations
      set status = 'blocked', claimed_by = uid
      where id = reservation.id;
    raise exception 'This account is not eligible for another free trial.';
  end if;

  if (
    select count(*) from public.trial_records
    where ip_fingerprint_hash = reservation.ip_fingerprint_hash
      and trial_start_date >= now() - interval '90 days'
  ) >= 3 then
    update public.trial_reservations
      set status = 'blocked', claimed_by = uid
      where id = reservation.id;
    raise exception 'Too many free trials from this network. Choose a paid option.';
  end if;

  begin
    insert into public.trial_records(
      user_id,
      email_normalized,
      email_fingerprint_hash,
      device_fingerprint_hash,
      ip_fingerprint_hash,
      trial_start_date,
      trial_end_date
    ) values (
      uid,
      reservation.email_normalized,
      reservation.email_fingerprint_hash,
      reservation.device_fingerprint_hash,
      reservation.ip_fingerprint_hash,
      now(),
      now() + interval '7 days'
    );
  exception when unique_violation then
    update public.trial_reservations
      set status = 'blocked', claimed_by = uid
      where id = reservation.id;
    raise exception 'This account is not eligible for another free trial.';
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
    event_type, email_fingerprint_hash, device_fingerprint_hash, ip_fingerprint_hash, allowed, reason, user_id
  ) values (
    'trial_activation',
    reservation.email_fingerprint_hash,
    reservation.device_fingerprint_hash,
    reservation.ip_fingerprint_hash,
    true,
    'trial_activated_post_verify',
    uid
  );

  return jsonb_build_object('ok', true, 'status', 'trial_active', 'mode', 'trial');
end;
$$;

revoke all on function public.choose_access_mode(text, text) from public, anon;
grant execute on function public.choose_access_mode(text, text) to authenticated;
