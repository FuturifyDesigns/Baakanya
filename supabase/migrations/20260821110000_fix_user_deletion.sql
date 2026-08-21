-- Fix Auth user deletion blocked by public FK constraints (NO ACTION),
-- and allow users to wipe their own account end-to-end.

-- Preserve trial abuse fingerprints after account deletion.
alter table public.trial_records
  alter column user_id drop not null;

alter table public.trial_records
  drop constraint if exists trial_records_user_id_fkey;
alter table public.trial_records
  add constraint trial_records_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.subscriptions
  drop constraint if exists subscriptions_user_id_fkey;
alter table public.subscriptions
  add constraint subscriptions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.credits
  drop constraint if exists credits_user_id_fkey;
alter table public.credits
  add constraint credits_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.generations
  drop constraint if exists generations_user_id_fkey;
alter table public.generations
  add constraint generations_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.payment_submissions
  drop constraint if exists payment_submissions_user_id_fkey;
alter table public.payment_submissions
  add constraint payment_submissions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.payment_submissions
  drop constraint if exists payment_submissions_reviewed_by_fkey;
alter table public.payment_submissions
  add constraint payment_submissions_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;

create or replace function public.delete_own_account(confirm_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, auth, extensions
as $$
declare
  uid uuid := auth.uid();
  user_email text;
  admin_count integer;
  is_owner boolean := false;
begin
  if uid is null then
    raise exception 'You must be signed in to delete your account.';
  end if;

  select email into user_email from auth.users where id = uid;
  if user_email is null then
    raise exception 'Account not found.';
  end if;
  if lower(trim(coalesce(confirm_email, ''))) <> lower(user_email) then
    raise exception 'Type your account email exactly to confirm deletion.';
  end if;

  select exists(select 1 from public.admin_users where user_id = uid)
    into is_owner;
  if is_owner then
    select count(*) into admin_count from public.admin_users;
    if admin_count <= 1 then
      raise exception 'The last administrator account cannot be deleted from the app. Remove other admin access first, or delete from Supabase as a project owner.';
    end if;
  end if;

  -- Remove uploaded receipts for this user.
  delete from storage.objects
  where bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = uid::text;

  -- Detach abuse fingerprints so a deleted account cannot open a fresh trial loophole,
  -- while still wiping personal identity from auth.users via cascades/set null.
  update public.trial_records
    set user_id = null
    where user_id = uid;
  update public.abuse_events
    set user_id = null
    where user_id = uid;
  update public.trial_reservations
    set claimed_by = null
    where claimed_by = uid;
  update public.automation_requests
    set user_id = null
    where user_id = uid;
  update public.payment_submissions
    set reviewed_by = null
    where reviewed_by = uid;

  delete from public.admin_users where user_id = uid;
  delete from public.generations where user_id = uid;
  delete from public.payment_submissions where user_id = uid;
  delete from public.subscriptions where user_id = uid;
  delete from public.credits where user_id = uid;
  delete from public.profiles where id = uid;

  delete from auth.users where id = uid;

  return jsonb_build_object(
    'deleted', true,
    'email', user_email
  );
end;
$$;

revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;

-- Optional admin helper: wipe a user by id from the control panel later.
create or replace function public.admin_delete_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, auth, extensions
as $$
declare
  user_email text;
  admin_count integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if target_user_id is null then
    raise exception 'missing user id';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Use delete own account for your own user.';
  end if;

  select email into user_email from auth.users where id = target_user_id;
  if user_email is null then
    raise exception 'User not found.';
  end if;

  if exists(select 1 from public.admin_users where user_id = target_user_id) then
    select count(*) into admin_count from public.admin_users;
    if admin_count <= 1 then
      raise exception 'Cannot delete the last administrator.';
    end if;
  end if;

  delete from storage.objects
  where bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = target_user_id::text;

  update public.trial_records set user_id = null where user_id = target_user_id;
  update public.abuse_events set user_id = null where user_id = target_user_id;
  update public.trial_reservations set claimed_by = null where claimed_by = target_user_id;
  update public.automation_requests set user_id = null where user_id = target_user_id;
  update public.payment_submissions set reviewed_by = null where reviewed_by = target_user_id;

  delete from public.admin_users where user_id = target_user_id;
  delete from public.generations where user_id = target_user_id;
  delete from public.payment_submissions where user_id = target_user_id;
  delete from public.subscriptions where user_id = target_user_id;
  delete from public.credits where user_id = target_user_id;
  delete from public.profiles where id = target_user_id;
  delete from auth.users where id = target_user_id;

  return jsonb_build_object('deleted', true, 'email', user_email, 'user_id', target_user_id);
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
