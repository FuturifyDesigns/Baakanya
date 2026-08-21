-- Close loophole: users could insert payment_submissions directly (bypass RPC) up to 3 pending.

create or replace function public.enforce_payment_submission_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.plan_type = 'credits' and new.amount <> 25)
     or (new.plan_type = 'subscription' and new.amount <> 40) then
    raise exception 'invalid payment amount';
  end if;
  if exists (
    select 1 from public.payment_submissions
    where user_id = new.user_id and status = 'pending'
  ) then
    raise exception 'Your receipt is already under review. Please wait for an admin to verify it.';
  end if;
  if exists (
    select 1 from public.payment_submissions
    where user_id = new.user_id
      and submitted_at > now() - interval '2 minutes'
  ) then
    raise exception 'Please wait a moment before submitting another receipt.';
  end if;
  return new;
end
$$;

-- Force receipt submission through submit_payment_proof (security definer).
drop policy if exists "submit own payment" on public.payment_submissions;
