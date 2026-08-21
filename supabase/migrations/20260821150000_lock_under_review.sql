-- Lock users into under-review once a receipt is pending. Close mode-switch loopholes.

create or replace function public.submit_payment_proof(
  selected_plan text,
  selected_method text,
  receipt_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pay_amount numeric(10,2);
  new_id uuid;
  existing_id uuid;
begin
  if uid is null then
    raise exception 'Sign in to submit a receipt.';
  end if;
  if selected_plan not in ('credits', 'subscription') then
    raise exception 'Choose credits or monthly access.';
  end if;
  if selected_method not in ('bank', 'ewallet') then
    raise exception 'Choose a valid payment method.';
  end if;
  if coalesce(receipt_path, '') = ''
     or receipt_path not like uid::text || '/%' then
    raise exception 'Upload a receipt linked to your account first.';
  end if;
  if lower(receipt_path) !~ '\.(png|jpe?g|webp|pdf)$' then
    raise exception 'Receipt must be a JPG, PNG, WebP or PDF file.';
  end if;

  select id into existing_id
  from public.payment_submissions
  where user_id = uid and status = 'pending'
  order by submitted_at desc
  limit 1;

  if existing_id is not null then
    raise exception 'Your receipt is already under review. Please wait for an admin to verify it.';
  end if;

  if exists(
    select 1 from public.payment_submissions
    where user_id = uid
      and submitted_at > now() - interval '2 minutes'
  ) then
    raise exception 'Please wait a moment before submitting another receipt.';
  end if;

  pay_amount := case when selected_plan = 'credits' then 25 else 40 end;

  insert into public.payment_submissions(
    user_id, amount, plan_type, payment_method, receipt_image_path, status
  ) values (
    uid, pay_amount, selected_plan, selected_method, receipt_path, 'pending'
  )
  returning id into new_id;

  update public.profiles
  set signup_intent = selected_plan,
      plan_type = 'none',
      access_note = 'Payment receipt under admin review'
  where id = uid;

  return jsonb_build_object(
    'ok', true,
    'submission_id', new_id,
    'status', 'under_review',
    'plan', selected_plan
  );
end;
$$;

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
    select 1 from public.payment_submissions
    where user_id = uid and status = 'pending'
  ) then
    raise exception 'Your receipt is under review. You cannot change access mode until an admin verifies or rejects it.';
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
