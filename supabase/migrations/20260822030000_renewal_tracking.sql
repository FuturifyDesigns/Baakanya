-- Track credit top-ups vs monthly renewals.
-- Block monthly renew while a subscription is still active.

alter table public.payment_submissions
  add column if not exists submission_kind text;

alter table public.payment_submissions
  drop constraint if exists payment_submissions_submission_kind_check;

alter table public.payment_submissions
  add constraint payment_submissions_submission_kind_check
  check (
    submission_kind is null
    or submission_kind in (
      'new_credits',
      'credit_topup',
      'new_subscription',
      'monthly_renewal'
    )
  );

comment on column public.payment_submissions.submission_kind is
  'Purchase intent: first buy vs credit top-up vs monthly renewal.';

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
  kind text;
  has_active_access boolean := false;
  has_active_subscription boolean := false;
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

  select exists (
    select 1
    from public.subscriptions
    where user_id = uid
      and coalesce(status, 'active') = 'active'
      and end_date > now()
  ) into has_active_subscription;

  if selected_plan = 'subscription' and has_active_subscription then
    raise exception 'Your monthly access is still active. You can renew after it expires.';
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

  if selected_plan = 'credits' then
    if exists (
      select 1 from public.payment_submissions
      where user_id = uid and plan_type = 'credits' and status = 'approved'
    ) or exists (
      select 1 from public.credits where user_id = uid and balance > 0
    ) or exists (
      select 1 from public.profiles where id = uid and plan_type = 'credits'
    ) then
      kind := 'credit_topup';
    else
      kind := 'new_credits';
    end if;
  else
    if exists (
      select 1 from public.subscriptions where user_id = uid
    ) or exists (
      select 1 from public.payment_submissions
      where user_id = uid and plan_type = 'subscription' and status = 'approved'
    ) then
      kind := 'monthly_renewal';
    else
      kind := 'new_subscription';
    end if;
  end if;

  select (
    exists (
      select 1 from public.profiles
      where id = uid and trial_end_date is not null and trial_end_date > now()
    )
    or has_active_subscription
    or exists (
      select 1 from public.credits where user_id = uid and balance > 0
    )
  ) into has_active_access;

  pay_amount := case when selected_plan = 'credits' then 25 else 40 end;

  insert into public.payment_submissions(
    user_id, amount, plan_type, payment_method, receipt_image_path, status, submission_kind
  ) values (
    uid, pay_amount, selected_plan, selected_method, receipt_path, 'pending', kind
  )
  returning id into new_id;

  if has_active_access then
    update public.profiles
    set signup_intent = selected_plan,
        access_note = case
          when kind = 'credit_topup' then 'Credit top-up receipt under admin review'
          when kind = 'monthly_renewal' then 'Monthly renewal receipt under admin review'
          else 'Payment receipt under admin review'
        end
    where id = uid;
  else
    update public.profiles
    set signup_intent = selected_plan,
        plan_type = 'none',
        access_note = case
          when kind = 'credit_topup' then 'Credit top-up receipt under admin review'
          when kind = 'monthly_renewal' then 'Monthly renewal receipt under admin review'
          else 'Payment receipt under admin review'
        end
    where id = uid;
  end if;

  return jsonb_build_object(
    'ok', true,
    'submission_id', new_id,
    'status', 'under_review',
    'plan', selected_plan,
    'submission_kind', kind
  );
end;
$$;

-- Backfill kinds for existing rows where we can infer them.
with ranked as (
  select
    id,
    user_id,
    plan_type,
    status,
    row_number() over (
      partition by user_id, plan_type
      order by submitted_at asc
    ) as rn
  from public.payment_submissions
)
update public.payment_submissions ps
set submission_kind = case
  when r.plan_type = 'credits' and r.rn = 1 then 'new_credits'
  when r.plan_type = 'credits' then 'credit_topup'
  when r.plan_type = 'subscription' and r.rn = 1 then 'new_subscription'
  else 'monthly_renewal'
end
from ranked r
where ps.id = r.id
  and ps.submission_kind is null;
