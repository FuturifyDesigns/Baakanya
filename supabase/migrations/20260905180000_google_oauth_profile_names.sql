-- Keep new social-login accounts locked until they choose an access mode.
-- Provider-verified identity is not evidence of free-trial eligibility.
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
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data->>'name'), ''),
        nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
        nullif(btrim(new.raw_user_meta_data->>'display_name'), '')
      ),
      80
    ),
    'none',
    null
  )
  on conflict (id) do nothing;

  insert into credits(user_id, balance) values(new.id, 0)
  on conflict (user_id) do nothing;
  return new;
end
$$;

update public.profiles as profile
set name = left(
  coalesce(
    nullif(btrim(auth_user.raw_user_meta_data->>'name'), ''),
    nullif(btrim(auth_user.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(auth_user.raw_user_meta_data->>'display_name'), '')
  ),
  80
)
from auth.users as auth_user
where profile.id = auth_user.id
  and nullif(btrim(profile.name), '') is null;
