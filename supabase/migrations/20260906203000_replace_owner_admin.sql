do $$
declare
  target_user_id constant uuid := 'ea70d0c9-f4b3-4e40-ab73-42e2b8b59f1b';
  target_email text;
begin
  select lower(email)
    into target_email
    from auth.users
   where id = target_user_id;

  if target_email is null then
    raise exception 'Target admin user % does not exist', target_user_id;
  end if;

  insert into public.admin_users (user_id, email)
  values (target_user_id, target_email)
  on conflict (user_id) do update
    set email = excluded.email;

  delete from public.admin_users
   where lower(email) = 'baakanya@baakanya.co.bw'
     and user_id <> target_user_id;
end
$$;
