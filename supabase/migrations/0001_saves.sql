-- IrtiQa cloud sync: one JSONB save per user, guarded by row-level security.
-- The client only ever reads/writes its own row (see src/lib/sync.ts). The whole
-- game runs client-side; this table is a mirror, not a referee.
--
-- Apply this once against your Supabase project:
--   • Supabase dashboard → SQL Editor → paste & run, OR
--   • supabase db push  (if you use the Supabase CLI with this repo linked)
-- It is idempotent — safe to run more than once.

create table if not exists public.saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Keep updated_at honest on every insert/upsert/update. The sync layer reads it back
-- to decide which side (local vs cloud) is newer, so it must always reflect the write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists saves_set_updated_at on public.saves;
create trigger saves_set_updated_at
  before insert or update on public.saves
  for each row execute function public.set_updated_at();

-- Row-level security: a signed-in user may touch exactly their own row, nothing else.
alter table public.saves enable row level security;

drop policy if exists "own save: select" on public.saves;
create policy "own save: select" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "own save: insert" on public.saves;
create policy "own save: insert" on public.saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "own save: update" on public.saves;
create policy "own save: update" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own save: delete" on public.saves;
create policy "own save: delete" on public.saves
  for delete using (auth.uid() = user_id);
