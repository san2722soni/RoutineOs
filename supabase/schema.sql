create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key,
  display_name text not null default 'RoutineOS',
  avatar_url text,
  theme_mode text not null default 'dark',
  sound_enabled boolean not null default true,
  start_reminder_minutes integer not null default 10,
  end_reminder_minutes integer not null default 5,
  onboarding_completed boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table profiles add column if not exists display_name text not null default 'RoutineOS';
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists theme_mode text not null default 'dark';
alter table profiles add column if not exists sound_enabled boolean not null default true;
alter table profiles add column if not exists start_reminder_minutes integer not null default 10;
alter table profiles add column if not exists end_reminder_minutes integer not null default 5;
alter table profiles add column if not exists reminder_retention_minutes integer not null default 30;
alter table profiles add column if not exists onboarding_completed boolean not null default true;
alter table profiles add column if not exists updated_at timestamptz not null default now();
alter table profiles drop column if exists notifications_enabled;
alter table profiles drop column if exists watch_forwarding_note_seen;
alter table profiles drop column if exists sync_mode;
alter table profiles drop column if exists sync_time;

create table if not exists categories (
  id uuid primary key,
  user_id uuid not null,
  label text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, label)
);

alter table categories add column if not exists user_id uuid;
alter table categories add column if not exists label text;
alter table categories add column if not exists color text not null default '#94A3B8';
alter table categories add column if not exists created_at timestamptz not null default now();
alter table categories add column if not exists updated_at timestamptz not null default now();
create unique index if not exists categories_user_label_lower_key on categories (user_id, lower(label));

create table if not exists routine_templates (
  id uuid primary key,
  user_id uuid not null,
  name text not null,
  description text,
  day_rules integer[] not null default '{}',
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table routine_templates add column if not exists user_id uuid;
alter table routine_templates add column if not exists name text;
alter table routine_templates add column if not exists description text;
alter table routine_templates add column if not exists day_rules integer[] not null default '{}';
alter table routine_templates add column if not exists blocks jsonb not null default '[]'::jsonb;
alter table routine_templates add column if not exists created_at timestamptz not null default now();
alter table routine_templates add column if not exists updated_at timestamptz not null default now();

create table if not exists resources (
  id uuid primary key,
  user_id uuid not null,
  category_id uuid,
  title text not null,
  type text not null default 'youtube-playlist',
  url text,
  chunk_minutes integer,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table resources add column if not exists user_id uuid;
alter table resources add column if not exists category_id uuid;
alter table resources add column if not exists title text;
alter table resources add column if not exists type text not null default 'youtube-playlist';
alter table resources add column if not exists url text;
alter table resources add column if not exists chunk_minutes integer;
alter table resources add column if not exists items jsonb not null default '[]'::jsonb;
alter table resources add column if not exists created_at timestamptz not null default now();
alter table resources add column if not exists updated_at timestamptz not null default now();
create unique index if not exists resources_user_category_type_key on resources (user_id, category_id, type);

create table if not exists daily_plans (
  id uuid primary key,
  user_id uuid not null,
  date_key date not null,
  template_id uuid,
  status text not null default 'draft',
  blocks jsonb not null default '[]'::jsonb,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date_key)
);

alter table daily_plans add column if not exists user_id uuid;
alter table daily_plans add column if not exists date_key date;
alter table daily_plans add column if not exists template_id uuid;
alter table daily_plans add column if not exists status text not null default 'draft';
alter table daily_plans add column if not exists blocks jsonb not null default '[]'::jsonb;
alter table daily_plans add column if not exists locked_at timestamptz;
alter table daily_plans add column if not exists created_at timestamptz not null default now();
alter table daily_plans add column if not exists updated_at timestamptz not null default now();

create table if not exists execution_events (
  id uuid primary key,
  user_id uuid not null,
  date_key date not null,
  block_id text not null,
  resource_item_id text,
  type text not null,
  happened_at timestamptz not null default now()
);

alter table execution_events add column if not exists user_id uuid;
alter table execution_events add column if not exists date_key date;
alter table execution_events add column if not exists block_id text;
alter table execution_events add column if not exists resource_item_id text;
alter table execution_events add column if not exists type text;
alter table execution_events add column if not exists happened_at timestamptz not null default now();

create table if not exists device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id text not null,
  session_id text not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create table if not exists saved_places (
  id text primary key,
  user_id uuid not null,
  name text not null,
  address text,
  provider_id text,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 100,
  is_home boolean not null default false,
  created_at timestamptz not null default now()
  ,updated_at timestamptz not null default now()
);

create table if not exists reminder_tasks (
  id text primary key,
  user_id uuid not null,
  title text not null,
  place_id uuid,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
  ,updated_at timestamptz not null default now()
);

alter table saved_places add column if not exists user_id uuid;
alter table saved_places add column if not exists name text;
alter table saved_places add column if not exists address text;
alter table saved_places add column if not exists provider_id text;
alter table saved_places add column if not exists latitude double precision;
alter table saved_places add column if not exists longitude double precision;
alter table saved_places add column if not exists radius_meters integer not null default 100;
alter table saved_places add column if not exists is_home boolean not null default false;
alter table saved_places add column if not exists created_at timestamptz not null default now();
alter table saved_places add column if not exists updated_at timestamptz not null default now();
alter table reminder_tasks add column if not exists user_id uuid;
alter table reminder_tasks add column if not exists title text;
alter table reminder_tasks add column if not exists place_id uuid;
alter table reminder_tasks add column if not exists due_date date not null default current_date;
alter table reminder_tasks add column if not exists completed boolean not null default false;
alter table reminder_tasks add column if not exists created_at timestamptz not null default now();
alter table reminder_tasks add column if not exists completed_at timestamptz;
alter table reminder_tasks add column if not exists updated_at timestamptz not null default now();

alter table saved_places alter column id type text using id::text;
alter table reminder_tasks alter column id type text using id::text;
alter table reminder_tasks alter column place_id type text using place_id::text;

alter table device_sessions add column if not exists user_id uuid;
alter table device_sessions add column if not exists device_id text;
alter table device_sessions add column if not exists session_id text not null default '';
alter table device_sessions add column if not exists last_seen_at timestamptz not null default now();
alter table device_sessions add column if not exists revoked_at timestamptz;
alter table device_sessions add column if not exists created_at timestamptz not null default now();
create index if not exists device_sessions_user_active_idx on device_sessions (user_id, revoked_at, last_seen_at desc);

alter table profiles enable row level security;
alter table categories enable row level security;
alter table routine_templates enable row level security;
alter table resources enable row level security;
alter table daily_plans enable row level security;
alter table execution_events enable row level security;
alter table device_sessions enable row level security;
alter table saved_places enable row level security;
alter table reminder_tasks enable row level security;

drop policy if exists "own profile" on profiles;
drop policy if exists "own categories" on categories;
drop policy if exists "own templates" on routine_templates;
drop policy if exists "own resources" on resources;
drop policy if exists "own plans" on daily_plans;
drop policy if exists "own events" on execution_events;
drop policy if exists "own device sessions" on device_sessions;
drop policy if exists "own saved places" on saved_places;
drop policy if exists "own reminder tasks" on reminder_tasks;

create policy "own profile" on profiles
  for all using (id = auth.uid())
  with check (id = auth.uid());

create policy "own categories" on categories
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own templates" on routine_templates
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own resources" on resources
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own plans" on daily_plans
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own events" on execution_events
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own device sessions" on device_sessions
  for select using (user_id = auth.uid());

create policy "own saved places" on saved_places
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own reminder tasks" on reminder_tasks
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function routineos_activate_device(p_device_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid text := coalesce(auth.jwt() ->> 'session_id', auth.jwt() ->> 'sid', '');
begin
  if uid is null or nullif(trim(p_device_id), '') is null then
    return false;
  end if;

  -- Serialize activation so two devices cannot both win the single-device lock.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  delete from device_sessions
  where user_id = uid
    and device_id <> p_device_id;

  insert into device_sessions (user_id, device_id, session_id, last_seen_at, revoked_at)
  values (uid, p_device_id, sid, now(), null)
  on conflict (user_id, device_id) do update set
    session_id = excluded.session_id,
    last_seen_at = now(),
    revoked_at = null;

  return true;
end;
$$;

create or replace function routineos_delete_device(p_device_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or nullif(trim(p_device_id), '') is null then
    return false;
  end if;

  delete from device_sessions
  where user_id = uid
    and device_id = p_device_id;

  return true;
end;
$$;

create or replace function routineos_is_active_device(p_device_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ok boolean;
begin
  if uid is null or nullif(trim(p_device_id), '') is null then
    return false;
  end if;

  if not exists (select 1 from device_sessions where user_id = uid) then
    insert into device_sessions (user_id, device_id, session_id, last_seen_at, revoked_at)
    values (uid, p_device_id, coalesce(auth.jwt() ->> 'session_id', auth.jwt() ->> 'sid', ''), now(), null)
    on conflict (user_id, device_id) do update set
      last_seen_at = now(),
      revoked_at = null;
    return true;
  end if;

  update device_sessions
  set last_seen_at = now()
  where user_id = uid
    and device_id = p_device_id
    and revoked_at is null;

  select exists (
    select 1
    from device_sessions
    where user_id = uid
      and device_id = p_device_id
      and revoked_at is null
  ) into ok;

  return ok;
end;
$$;

create or replace function routineos_cleanup_stale_devices(p_cutoff_minutes integer default 43200)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  deleted_count integer;
begin
  if uid is null then
    return 0;
  end if;

  delete from device_sessions
  where user_id = uid
    and last_seen_at < now() - make_interval(mins => p_cutoff_minutes);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke execute on function routineos_cleanup_stale_devices(integer) from public;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "own avatar objects" on storage.objects;
create policy "own avatar objects" on storage.objects
  for all using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

select pg_notify('pgrst', 'reload schema');
