-- Track Word → PDF conversions and iLovePDF credit balance.

create table if not exists public.word_conversion_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text,
  file_size_bytes bigint,
  engine text not null check (engine in ('ilovepdf', 'browser')),
  credits_remaining integer,
  created_at timestamptz not null default now()
);

create index if not exists word_conversion_logs_created_at_idx
  on public.word_conversion_logs (created_at desc);

create index if not exists word_conversion_logs_engine_idx
  on public.word_conversion_logs (engine);

alter table public.word_conversion_logs enable row level security;

drop policy if exists "admin read conversion logs" on public.word_conversion_logs;
create policy "admin read conversion logs"
on public.word_conversion_logs
for select
to authenticated
using (public.is_admin());

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.admin_word_conversion_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return (
    select jsonb_build_object(
      'credits_remaining',
        (select nullif(value->>'remaining', '')::int
         from public.platform_settings
         where key = 'ilovepdf_credits'),
      'credits_updated_at',
        (select updated_at
         from public.platform_settings
         where key = 'ilovepdf_credits'),
      'ilovepdf_this_month',
        (select count(*)
         from public.word_conversion_logs
         where engine = 'ilovepdf'
           and created_at >= date_trunc('month', timezone('utc', now()))),
      'ilovepdf_total',
        (select count(*)
         from public.word_conversion_logs
         where engine = 'ilovepdf'),
      'browser_this_month',
        (select count(*)
         from public.word_conversion_logs
         where engine = 'browser'
           and created_at >= date_trunc('month', timezone('utc', now()))),
      'browser_total',
        (select count(*)
         from public.word_conversion_logs
         where engine = 'browser'),
      'recent',
        coalesce((
          select jsonb_agg(entry order by entry->>'created_at' desc)
          from (
            select jsonb_build_object(
              'created_at', w.created_at,
              'engine', w.engine,
              'credits_remaining', w.credits_remaining,
              'file_name', w.file_name,
              'name', p.name,
              'email', p.email
            ) as entry
            from public.word_conversion_logs w
            left join public.profiles p on p.id = w.user_id
            order by w.created_at desc
            limit 20
          ) recent_rows
        ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_word_conversion_stats() from public, anon;
grant execute on function public.admin_word_conversion_stats() to authenticated;
