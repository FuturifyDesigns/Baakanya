insert into public.admin_users (user_id, email)
select id, lower(email)
from auth.users
where lower(email) = 'baakanya@baakanya.co.bw'
on conflict (user_id) do update set email = excluded.email;
