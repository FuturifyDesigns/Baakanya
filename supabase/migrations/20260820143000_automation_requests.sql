create table if not exists public.automation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null check(length(email) between 5 and 254),
  tool_name text not null check(length(tool_name) between 3 and 120),
  details text not null check(length(details) between 10 and 800),
  email_fingerprint_hash text not null,
  ip_fingerprint_hash text not null,
  status text not null default 'new'
    check(status in ('new', 'reviewing', 'planned', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists automation_requests_created_idx
  on public.automation_requests(created_at desc);
create index if not exists automation_requests_email_date_idx
  on public.automation_requests(email_fingerprint_hash, created_at desc);
create index if not exists automation_requests_ip_date_idx
  on public.automation_requests(ip_fingerprint_hash, created_at desc);

alter table public.automation_requests enable row level security;
revoke all on public.automation_requests from anon, authenticated;
grant select, update on public.automation_requests to authenticated;

create policy "admins read automation requests"
on public.automation_requests for select to authenticated
using(public.is_admin());

create policy "admins update automation requests"
on public.automation_requests for update to authenticated
using(public.is_admin())
with check(public.is_admin());
