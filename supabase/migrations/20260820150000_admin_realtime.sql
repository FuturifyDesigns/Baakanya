do $$
begin
  alter publication supabase_realtime add table public.payment_submissions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.automation_requests;
exception
  when duplicate_object then null;
end $$;
