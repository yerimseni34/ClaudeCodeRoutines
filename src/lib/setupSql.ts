// Supabase'de bir kez çalıştırılacak kurulum. Tüm veriler tek tabloda,
// satır bazlı güvenlik (RLS) ile yalnızca kullanıcının kendi verisine erişimi olur.
export const SQL_SETUP = `-- FitLog kurulum (Supabase SQL Editor'da çalıştır)
create table if not exists public.fitlog_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  id text not null,
  updated_at bigint not null,
  deleted int not null default 0,
  data jsonb not null,
  primary key (user_id, kind, id)
);

alter table public.fitlog_records enable row level security;

drop policy if exists "own rows select" on public.fitlog_records;
drop policy if exists "own rows modify" on public.fitlog_records;

create policy "own rows select" on public.fitlog_records
  for select using (auth.uid() = user_id);

create policy "own rows modify" on public.fitlog_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists fitlog_updated_idx
  on public.fitlog_records (user_id, updated_at);
`;
