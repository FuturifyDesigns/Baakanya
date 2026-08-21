-- Track how the user chose to enter Baakanya (trial vs paid) and let admins monitor status.

alter table public.profiles
  add column if not exists signup_intent text
    check (signup_intent is null or signup_intent in ('trial', 'credits', 'subscription'));

alter table public.profiles
  add column if not exists access_note text;

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
    case
      when coalesce(new.raw_user_meta_data->>'signup_intent', 'trial') in ('trial', 'credits', 'subscription')
        then new.raw_user_meta_data->>'signup_intent'
      else 'trial'
    end
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
declare
  reservation public.trial_reservations%rowtype;
  reservation_token text;
  reservation_found boolean := false;
  eligible boolean := false;
  denial_reason text := 'missing_reservation';
  intent text := coalesce(new.raw_user_meta_data->>'signup_intent', 'trial');
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles
    set signup_intent = case
      when intent in ('trial', 'credits', 'subscription') then intent
      else coalesce(signup_intent, 'trial')
    end
    where id = new.id;

    -- Paid path: never auto-start a trial. User must pay before tools unlock.
    if intent in ('credits', 'subscription') then
      update public.profiles
      set trial_start_date = null,
          trial_end_date = null,
          plan_type = 'none',
          access_note = 'Awaiting payment for ' || intent
      where id = new.id;
      insert into public.abuse_events(
        event_type, allowed, reason, user_id
      ) values (
        'paid_signup_confirmed', true, 'awaiting_payment_' || intent, new.id
      );
      return new;
    end if;

    reservation_token := new.raw_user_meta_data->>'trial_reservation_token';
    if coalesce(reservation_token, '') <> '' then
      select * into reservation
      from public.trial_reservations
      where token_hash = encode(extensions.digest(convert_to(reservation_token, 'UTF8'), 'sha256'), 'hex')
        and status = 'active'
        and expires_at > now()
        and claimed_by is null
        and email_normalized = public.normalize_trial_email(new.email)
      for update;
      reservation_found := found;
    end if;

    if reservation_found then
      if exists (
        select 1 from public.trial_records
        where email_normalized = reservation.email_normalized
           or email_fingerprint_hash = reservation.email_fingerprint_hash
           or device_fingerprint_hash = reservation.device_fingerprint_hash
           or user_id = new.id
      ) then
        denial_reason := 'identity_already_used';
      elsif (
        select count(*) from public.trial_records
        where ip_fingerprint_hash = reservation.ip_fingerprint_hash
          and trial_start_date >= now() - interval '90 days'
      ) >= 3 then
        denial_reason := 'ip_trial_limit';
      else
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
            new.id,
            reservation.email_normalized,
            reservation.email_fingerprint_hash,
            reservation.device_fingerprint_hash,
            reservation.ip_fingerprint_hash,
            now(),
            now() + interval '7 days'
          );
          update public.profiles
          set trial_start_date = now(),
              trial_end_date = now() + interval '7 days',
              plan_type = 'trial',
              access_note = '7-day trial active'
          where id = new.id;
          update public.trial_reservations
          set status = 'claimed', claimed_by = new.id
          where id = reservation.id;
          eligible := true;
          denial_reason := 'trial_activated';
        exception when unique_violation then
          denial_reason := 'identity_race_blocked';
        end;
      end if;
    elsif coalesce(reservation_token, '') <> '' then
      denial_reason := 'invalid_or_expired_reservation';
    end if;

    if not eligible then
      update public.profiles
      set trial_start_date = null,
          trial_end_date = null,
          plan_type = 'none',
          access_note = denial_reason
      where id = new.id;
      if reservation_found then
        update public.trial_reservations
        set status = 'blocked', claimed_by = new.id
        where id = reservation.id;
      end if;
    end if;

    insert into public.abuse_events(
      event_type,
      email_fingerprint_hash,
      device_fingerprint_hash,
      ip_fingerprint_hash,
      allowed,
      reason,
      user_id
    ) values (
      'trial_activation',
      case when reservation_found then reservation.email_fingerprint_hash end,
      case when reservation_found then reservation.device_fingerprint_hash end,
      case when reservation_found then reservation.ip_fingerprint_hash end,
      eligible,
      denial_reason,
      new.id
    );
  end if;
  return new;
end
$$;

drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "admins read all credits" on public.credits;
create policy "admins read all credits"
  on public.credits for select
  using (public.is_admin());

drop policy if exists "admins read all subscriptions" on public.subscriptions;
create policy "admins read all subscriptions"
  on public.subscriptions for select
  using (public.is_admin());

create or replace function public.admin_user_statuses()
returns table (
  user_id uuid,
  email text,
  name text,
  signup_intent text,
  plan_type text,
  trial_end_date timestamptz,
  credit_balance integer,
  subscription_end timestamptz,
  access_status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return query
  select
    p.id,
    u.email::text,
    p.name,
    p.signup_intent,
    p.plan_type,
    p.trial_end_date,
    coalesce(c.balance, 0),
    s.end_date,
    case
      when s.end_date is not null and s.end_date > now() then 'subscription_active'
      when coalesce(c.balance, 0) > 0 then 'credits_available'
      when p.trial_end_date is not null and p.trial_end_date > now() then 'trial_active'
      when p.trial_end_date is not null and p.trial_end_date <= now() then 'trial_expired'
      when p.signup_intent in ('credits', 'subscription') then 'awaiting_payment'
      else 'no_access'
    end,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.credits c on c.user_id = p.id
  left join lateral (
    select sub.end_date
    from public.subscriptions sub
    where sub.user_id = p.id and sub.status = 'active'
    order by sub.end_date desc
    limit 1
  ) s on true
  order by p.created_at desc;
end
$$;

grant execute on function public.admin_user_statuses() to authenticated;
