-- EudaChat schema for Hult Cohort — cohort chat platform
-- Run in Supabase SQL editor or via `supabase db push`

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  handle text not null unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create type public.channel_kind as enum ('public', 'announcements');

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  kind public.channel_kind not null default 'public',
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists channels_archived_at_idx on public.channels (archived_at)
  where archived_at is null;

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint dm_threads_ordered_pair check (user_a < user_b),
  unique (user_a, user_b)
);

create index if not exists dm_threads_user_a_idx on public.dm_threads (user_a);
create index if not exists dm_threads_user_b_idx on public.dm_threads (user_b);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels (id) on delete cascade,
  dm_thread_id uuid references public.dm_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  constraint messages_one_target check (
    (channel_id is not null and dm_thread_id is null)
    or (channel_id is null and dm_thread_id is not null)
  )
);

create index if not exists messages_channel_id_idx on public.messages (channel_id, created_at);
create index if not exists messages_dm_thread_id_idx on public.messages (dm_thread_id, created_at);
create index if not exists messages_body_search_idx on public.messages
  using gin (to_tsvector('english', body));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('dm', 'mention')),
  message_id uuid references public.messages (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.dm_threads enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "channels_select_all" on public.channels
  for select to authenticated using (true);

create policy "channels_insert" on public.channels
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      kind = 'public'
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );

-- Any authenticated member can rename/archive public channels.
-- Announcements channel metadata stays admin-only.
create policy "channels_update" on public.channels
  for update to authenticated
  using (
    kind = 'public'
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    kind = 'public'
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "dm_threads_select_own" on public.dm_threads
  for select to authenticated using (auth.uid() in (user_a, user_b));

create policy "dm_threads_insert_own" on public.dm_threads
  for insert to authenticated with check (auth.uid() in (user_a, user_b));

create policy "messages_select" on public.messages
  for select to authenticated
  using (
    (channel_id is not null and exists (select 1 from public.channels c where c.id = channel_id))
    or (
      dm_thread_id is not null
      and exists (
        select 1 from public.dm_threads t
        where t.id = dm_thread_id and auth.uid() in (t.user_a, t.user_b)
      )
    )
  );

create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    auth.uid() = author_id
    and (
      (
        channel_id is not null
        and exists (
          select 1 from public.channels c
          where c.id = channel_id
            and c.archived_at is null
            and (
              c.kind = 'public'
              or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
            )
        )
      )
      or (
        dm_thread_id is not null
        and exists (
          select 1 from public.dm_threads t
          where t.id = dm_thread_id and auth.uid() in (t.user_a, t.user_b)
        )
      )
    )
  );

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (auth.uid() = user_id);

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notifications_insert_own" on public.notifications
  for insert to authenticated with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Trigger: new auth user -> profile row (handle derived + de-duplicated)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
  suffix int := 0;
begin
  base_handle := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
  if base_handle = '' then
    base_handle := 'member';
  end if;
  final_handle := base_handle;

  while exists (select 1 from public.profiles where handle = final_handle) loop
    suffix := suffix + 1;
    final_handle := base_handle || suffix::text;
  end loop;

  insert into public.profiles (id, email, display_name, handle)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    final_handle
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Trigger: new DM message -> notify the other participant
-- ---------------------------------------------------------------------------

create or replace function public.notify_dm_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  if new.dm_thread_id is not null then
    select case when t.user_a = new.author_id then t.user_b else t.user_a end
      into recipient
    from public.dm_threads t
    where t.id = new.dm_thread_id;

    if recipient is not null and recipient <> new.author_id then
      insert into public.notifications (user_id, type, message_id, body)
      values (recipient, 'dm', new.id, left(new.body, 160));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_message_notify_dm on public.messages;
create trigger on_message_notify_dm
  after insert on public.messages
  for each row execute function public.notify_dm_message();

-- ---------------------------------------------------------------------------
-- Trigger: new message -> notify @handle mentions (channel or DM)
-- ---------------------------------------------------------------------------

create or replace function public.notify_message_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mention_handle text;
  mentioned_id uuid;
begin
  for mention_handle in
    select distinct lower(m[1])
    from regexp_matches(new.body, '@([a-zA-Z0-9_]+)', 'g') as m
  loop
    select id into mentioned_id
    from public.profiles
    where handle = mention_handle and id <> new.author_id;

    if mentioned_id is not null then
      insert into public.notifications (user_id, type, message_id, body)
      values (mentioned_id, 'mention', new.id, left(new.body, 160));
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists on_message_notify_mentions on public.messages;
create trigger on_message_notify_mentions
  after insert on public.messages
  for each row execute function public.notify_message_mentions();

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'channels'
    ) then
      alter publication supabase_realtime add table public.channels;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Seed channels
-- ---------------------------------------------------------------------------

insert into public.channels (name, slug, kind)
values
  ('general', 'general', 'public'),
  ('random', 'random', 'public'),
  ('help', 'help', 'public'),
  ('Announcements', 'announcements', 'announcements')
on conflict (slug) do nothing;
