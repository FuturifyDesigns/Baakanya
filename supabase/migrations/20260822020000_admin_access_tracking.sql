-- Improve admin user access tracking for trials, credits, and monthly plans.

drop function if exists public.admin_user_statuses();

create function public.admin_user_statuses()
returns table (
  user_id uuid,
  email text,
  name text,
  signup_intent text,
  plan_type text,
  trial_end_date timestamptz,
  credit_balance integer,
  subscription_end timestamptz,
  subscription_status text,
  access_status text,
  trial_days_left numeric,
  subscription_days_left numeric,
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
    coalesce(c.balance, 0)::integer,
    s.end_date,
    s.status,
    case
      when p.trial_end_date is not null and p.trial_end_date > now() then 'trial_active'
      when s.end_date is not null and s.end_date > now() and coalesce(s.status, 'active') = 'active'
        then 'subscription_active'
      when coalesce(c.balance, 0) > 0 then 'credits_available'
      when exists (
        select 1 from public.payment_submissions ps
        where ps.user_id = p.id and ps.status = 'pending'
      ) then 'under_review'
      when p.trial_end_date is not null and p.trial_end_date <= now() then 'trial_expired'
      when s.end_date is not null and s.end_date <= now() then 'subscription_expired'
      when p.plan_type = 'credits' and coalesce(c.balance, 0) <= 0 then 'credits_exhausted'
      when p.signup_intent in ('credits', 'subscription') and p.plan_type = 'none'
        then 'awaiting_payment'
      else 'no_access'
    end,
    case
      when p.trial_end_date is not null and p.trial_end_date > now()
        then round(extract(epoch from (p.trial_end_date - now())) / 86400.0, 2)
      else null
    end,
    case
      when s.end_date is not null and s.end_date > now()
        then round(extract(epoch from (s.end_date - now())) / 86400.0, 2)
      else null
    end,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.credits c on c.user_id = p.id
  left join lateral (
    select sub.end_date, sub.status
    from public.subscriptions sub
    where sub.user_id = p.id
    order by sub.end_date desc nulls last
    limit 1
  ) s on true
  order by p.created_at desc;
end
$$;

grant execute on function public.admin_user_statuses() to authenticated;
