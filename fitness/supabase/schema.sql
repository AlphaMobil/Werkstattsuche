-- FitDuell – Datenbankschema für Supabase (einmalig im SQL-Editor ausführen)
-- Tabellen: digests (Tageswerte je Nutzer), friendships (beidseitige Freundschaften), duels (30-Tage-Duelle)

create extension if not exists pgcrypto;

-- Tages-Zusammenfassung pro Nutzer (Trainings, Volumen, Schritte, Gewicht … der letzten ~60 Tage)
create table if not exists public.digests (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  friend_code text unique not null default upper(encode(gen_random_bytes(5), 'hex')),
  name        text not null default 'Sportler' check (char_length(name) <= 40),
  color       text,
  goal        text,
  since       date,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.friendships (
  user_id    uuid not null references auth.users (id) on delete cascade,
  friend_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists public.duels (
  id         uuid primary key default gen_random_uuid(),
  challenger uuid not null references auth.users (id) on delete cascade,
  opponent   uuid not null references auth.users (id) on delete cascade,
  type       text not null check (type in ('vol', 'max', 'loss', 'wo', 'steps')),
  exercise   text,
  start_date date not null,
  end_date   date not null,
  created_at timestamptz not null default now(),
  check (challenger <> opponent),
  check (end_date > start_date)
);

alter table public.digests enable row level security;
alter table public.friendships enable row level security;
alter table public.duels enable row level security;

-- Digests: eigene und die von Freunden lesen; nur eigene schreiben
drop policy if exists digest_select on public.digests;
create policy digest_select on public.digests for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.friendships f where f.user_id = auth.uid() and f.friend_id = digests.user_id));
drop policy if exists digest_insert on public.digests;
create policy digest_insert on public.digests for insert to authenticated with check (user_id = auth.uid());
drop policy if exists digest_update on public.digests;
create policy digest_update on public.digests for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists digest_delete on public.digests;
create policy digest_delete on public.digests for delete to authenticated using (user_id = auth.uid());

-- Freundschaften: nur eigene Zeilen lesen; Anlegen/Entfernen nur über die Funktionen unten
drop policy if exists friend_select on public.friendships;
create policy friend_select on public.friendships for select to authenticated using (user_id = auth.uid());

-- Duelle: beide Teilnehmer sehen und löschen; anlegen nur gegen eigene Freunde
drop policy if exists duel_select on public.duels;
create policy duel_select on public.duels for select to authenticated using (auth.uid() in (challenger, opponent));
drop policy if exists duel_insert on public.duels;
create policy duel_insert on public.duels for insert to authenticated
  with check (challenger = auth.uid() and exists (select 1 from public.friendships f where f.user_id = auth.uid() and f.friend_id = opponent));
drop policy if exists duel_delete on public.duels;
create policy duel_delete on public.duels for delete to authenticated using (auth.uid() in (challenger, opponent));

-- Freund per Code hinzufügen (legt die Freundschaft in beide Richtungen an)
create or replace function public.add_friend(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select user_id into fid from public.digests where friend_code = upper(trim(code));
  if fid is null then raise exception 'Code nicht gefunden'; end if;
  if fid = auth.uid() then raise exception 'Das ist dein eigener Code'; end if;
  insert into public.friendships (user_id, friend_id) values (auth.uid(), fid) on conflict do nothing;
  insert into public.friendships (user_id, friend_id) values (fid, auth.uid()) on conflict do nothing;
  return fid;
end $$;

create or replace function public.remove_friend(fid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  delete from public.friendships where (user_id = auth.uid() and friend_id = fid) or (user_id = fid and friend_id = auth.uid());
end $$;

revoke all on function public.add_friend(text) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;

-- Zugriffsrechte für angemeldete Nutzer (neuere Supabase-Projekte vergeben diese nicht automatisch)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.digests to authenticated;
grant select on public.friendships to authenticated;
grant select, insert, delete on public.duels to authenticated;

-- Echtzeit-Updates für Rangliste und Duelle
do $$ begin
  alter publication supabase_realtime add table public.digests;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.duels;
exception when duplicate_object then null; end $$;
