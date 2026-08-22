-- Saved finalized documents so users can re-download after leaving the editor.

create table if not exists public.document_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_key text not null,
  kind text not null,
  tool_name text not null,
  title text not null,
  template_id text not null,
  template_name text not null,
  payload jsonb not null,
  finalized_at timestamptz not null default now(),
  downloaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, draft_key)
);

create index if not exists document_history_user_finalized_idx
  on public.document_history (user_id, finalized_at desc);

alter table public.document_history enable row level security;

drop policy if exists "read own document history" on public.document_history;
create policy "read own document history"
  on public.document_history for select
  using (auth.uid() = user_id);

drop policy if exists "insert own document history" on public.document_history;
create policy "insert own document history"
  on public.document_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own document history" on public.document_history;
create policy "update own document history"
  on public.document_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own document history" on public.document_history;
create policy "delete own document history"
  on public.document_history for delete
  using (auth.uid() = user_id);
