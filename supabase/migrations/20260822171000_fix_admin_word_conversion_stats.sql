-- Fix admin_word_conversion_stats: email lives on auth.users, not profiles.

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
          select jsonb_agg(entry order by sort_at desc)
          from (
            select
              w.created_at as sort_at,
              jsonb_build_object(
                'created_at', w.created_at,
                'engine', w.engine,
                'credits_remaining', w.credits_remaining,
                'file_name', w.file_name,
                'name', p.name,
                'email', u.email::text
              ) as entry
            from public.word_conversion_logs w
            left join public.profiles p on p.id = w.user_id
            left join auth.users u on u.id = w.user_id
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
