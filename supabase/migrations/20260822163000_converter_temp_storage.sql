-- Temporary storage for Word files during server-side PDF conversion.

insert into storage.buckets (id, name, public)
values ('converter-temp', 'converter-temp', false)
on conflict (id) do nothing;

drop policy if exists "upload own converter file" on storage.objects;
create policy "upload own converter file"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'converter-temp'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "read own converter file" on storage.objects;
create policy "read own converter file"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'converter-temp'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "delete own converter file" on storage.objects;
create policy "delete own converter file"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'converter-temp'
  and (storage.foldername(name))[1] = auth.uid()::text
);
