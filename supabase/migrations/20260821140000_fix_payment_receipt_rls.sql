-- Fix payment receipt uploads failing RLS (metadata.size is often 0/null on insert).

drop policy if exists "upload own receipt" on storage.objects;
create policy "upload own receipt"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(name) ~ '\.(png|jpe?g|webp|pdf)$'
);

drop policy if exists "update own receipt" on storage.objects;
create policy "update own receipt"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "submit own payment" on public.payment_submissions;
create policy "submit own payment"
on public.payment_submissions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
  and plan_type in ('credits', 'subscription')
  and payment_method in ('bank', 'ewallet')
  and amount in (25, 40)
  and receipt_image_path like auth.uid()::text || '/%'
);

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

  pay_amount := case when selected_plan = 'credits' then 25 else 40 end;

  if (select count(*) from public.payment_submissions
      where user_id = uid and status = 'pending') >= 3 then
    raise exception 'You already have pending payment submissions under review.';
  end if;
  if exists(
    select 1 from public.payment_submissions
    where user_id = uid
      and submitted_at > now() - interval '2 minutes'
  ) then
    raise exception 'Please wait a moment before submitting another receipt.';
  end if;

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

revoke all on function public.submit_payment_proof(text, text, text) from public, anon;
grant execute on function public.submit_payment_proof(text, text, text) to authenticated;
