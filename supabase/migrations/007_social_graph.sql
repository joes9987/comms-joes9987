-- Phase 2: social graph + public feed tables (Lime absorption).
-- Does not touch channels / dm_threads / messages / chat_notifications RLS.
-- Does not add a notifications table (PM already owns public.notifications).
-- E2EE transport (pre_key_bundles, envelopes) waits for a later phase.
--
-- RLS: `create policy` lowercase. Inventory: docs/RLS_POLICIES.md

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ── helpers ────────────────────────────────────────────────────────────────

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  );
$$;

grant execute on function public.is_staff() to authenticated;

-- ── graph ──────────────────────────────────────────────────────────────────

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id, created_at desc);

create table if not exists public.close_friends (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, friend_id),
  constraint close_friends_not_self check (owner_id <> friend_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create table if not exists public.mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  constraint mutes_not_self check (muter_id <> muted_id)
);

create or replace function public.is_blocked(left_id uuid, right_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = left_id and blocked_id = right_id)
       or (blocker_id = right_id and blocked_id = left_id)
  );
$$;

grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- ── posts + engagement ─────────────────────────────────────────────────────

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '',
  visibility text not null default 'public'
    check (visibility in ('public', 'followers', 'close_friends')),
  reposted_from uuid references public.posts (id) on delete set null,
  body_tsv tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz,
  like_count int not null default 0,
  comment_count int not null default 0,
  repost_count int not null default 0
);

create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc)
  where deleted_at is null;
create index if not exists posts_body_trgm_idx on public.posts using gin (body gin_trgm_ops);
create index if not exists posts_body_tsv_idx on public.posts using gin (body_tsv);

create or replace function public.posts_body_tsv_trigger()
returns trigger
language plpgsql
as $$
begin
  new.body_tsv := to_tsvector('english', coalesce(new.body, ''));
  return new;
end;
$$;

drop trigger if exists posts_body_tsv_update on public.posts;
create trigger posts_body_tsv_update
  before insert or update of body on public.posts
  for each row execute function public.posts_body_tsv_trigger();

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  parent_id uuid references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create index if not exists comments_post_alive_idx
  on public.comments (post_id, created_at desc)
  where deleted_at is null;

create table if not exists public.likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.hashtags (
  tag text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.post_hashtags (
  post_id uuid not null references public.posts (id) on delete cascade,
  tag text not null references public.hashtags (tag) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, tag)
);

create index if not exists post_hashtags_tag_created_idx
  on public.post_hashtags (tag, created_at desc);

-- ── 24h status (ciphertext columns reserved for later E2EE) ────────────────

create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  caption text,
  visibility text not null check (visibility in ('public', 'close_friends')),
  ciphertext text,
  ciphertext_kind text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists statuses_expiry_idx on public.statuses (expires_at);
create index if not exists statuses_author_created_idx
  on public.statuses (author_id, created_at desc);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete cascade,
  status_id uuid references public.statuses (id) on delete cascade,
  kind text not null,
  storage_path text not null,
  thumbnail_path text,
  mime text not null,
  width int,
  height int,
  duration_ms int,
  created_at timestamptz not null default now(),
  constraint media_one_parent check (
    (post_id is not null and status_id is null)
    or (post_id is null and status_id is not null)
  )
);

create index if not exists media_post_idx on public.media (post_id);
create index if not exists media_status_idx on public.media (status_id);

-- ── reports (staff queue lands in a later phase; schema + RLS now) ─────────

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_kind text not null
    check (target_kind in ('post', 'comment', 'profile', 'message', 'status')),
  target_id uuid not null,
  reason text not null,
  detail text,
  evidence_plaintext text,
  status text not null default 'open',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  outcome text,
  outcome_notes text,
  created_at timestamptz not null default now()
);

create index if not exists reports_open_idx on public.reports (status, created_at desc);

-- ── counter triggers ───────────────────────────────────────────────────────

create or replace function public.adjust_post_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'likes' then
    if tg_op = 'INSERT' then
      update public.posts set like_count = like_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    end if;
  elsif tg_table_name = 'comments' then
    if tg_op = 'INSERT' and new.deleted_at is null then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    elsif tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
    elsif tg_op = 'UPDATE' and old.deleted_at is not null and new.deleted_at is null then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' and old.deleted_at is null then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    end if;
  elsif tg_table_name = 'posts' then
    if tg_op = 'INSERT' and new.reposted_from is not null then
      update public.posts set repost_count = repost_count + 1 where id = new.reposted_from;
    elsif tg_op = 'UPDATE' and old.reposted_from is not null
      and (new.deleted_at is not null and old.deleted_at is null) then
      update public.posts set repost_count = greatest(repost_count - 1, 0) where id = old.reposted_from;
    elsif tg_op = 'DELETE' and old.reposted_from is not null and old.deleted_at is null then
      update public.posts set repost_count = greatest(repost_count - 1, 0) where id = old.reposted_from;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists likes_adjust_count on public.likes;
create trigger likes_adjust_count
  after insert or delete on public.likes
  for each row execute function public.adjust_post_count();

drop trigger if exists comments_adjust_count on public.comments;
create trigger comments_adjust_count
  after insert or update of deleted_at or delete on public.comments
  for each row execute function public.adjust_post_count();

drop trigger if exists posts_adjust_repost_count on public.posts;
create trigger posts_adjust_repost_count
  after insert or update of deleted_at or delete on public.posts
  for each row execute function public.adjust_post_count();

-- ── visibility helper (after posts / graph exist) ──────────────────────────

create or replace function public.can_view_post(p public.posts)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not public.is_blocked(auth.uid(), p.author_id)
    and (
      p.author_id = auth.uid()
      or (
        p.deleted_at is null
        and (
          p.visibility = 'public'
          or (
            p.visibility = 'followers'
            and exists (
              select 1 from public.follows f
              where f.follower_id = auth.uid() and f.followee_id = p.author_id
            )
          )
          or (
            p.visibility = 'close_friends'
            and exists (
              select 1 from public.close_friends cf
              where cf.owner_id = p.author_id and cf.friend_id = auth.uid()
            )
          )
        )
      )
    );
$$;

create or replace function public.can_view_status(s public.statuses)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    s.expires_at > now()
    and not public.is_blocked(auth.uid(), s.author_id)
    and (
      s.author_id = auth.uid()
      or s.visibility = 'public'
      or (
        s.visibility = 'close_friends'
        and exists (
          select 1 from public.close_friends cf
          where cf.owner_id = s.author_id and cf.friend_id = auth.uid()
        )
      )
    );
$$;

grant execute on function public.can_view_post(public.posts) to authenticated;
grant execute on function public.can_view_status(public.statuses) to authenticated;

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.follows enable row level security;
alter table public.close_friends enable row level security;
alter table public.blocks enable row level security;
alter table public.mutes enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.statuses enable row level security;
alter table public.media enable row level security;
alter table public.reports enable row level security;

drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows
  for select to authenticated using (true);

drop policy if exists "follows_insert" on public.follows;
create policy "follows_insert" on public.follows
  for insert to authenticated
  with check (
    auth.uid() = follower_id
    and not public.is_blocked(follower_id, followee_id)
  );

drop policy if exists "follows_delete" on public.follows;
create policy "follows_delete" on public.follows
  for delete to authenticated using (auth.uid() = follower_id);

drop policy if exists "close_friends_select_own" on public.close_friends;
create policy "close_friends_select_own" on public.close_friends
  for select to authenticated using (auth.uid() = owner_id);

drop policy if exists "close_friends_insert_own" on public.close_friends;
create policy "close_friends_insert_own" on public.close_friends
  for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "close_friends_delete_own" on public.close_friends;
create policy "close_friends_delete_own" on public.close_friends
  for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own" on public.blocks
  for select to authenticated using (auth.uid() = blocker_id);

drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own" on public.blocks
  for insert to authenticated with check (auth.uid() = blocker_id);

drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks
  for delete to authenticated using (auth.uid() = blocker_id);

drop policy if exists "mutes_select_own" on public.mutes;
create policy "mutes_select_own" on public.mutes
  for select to authenticated using (auth.uid() = muter_id);

drop policy if exists "mutes_insert_own" on public.mutes;
create policy "mutes_insert_own" on public.mutes
  for insert to authenticated with check (auth.uid() = muter_id);

drop policy if exists "mutes_delete_own" on public.mutes;
create policy "mutes_delete_own" on public.mutes
  for delete to authenticated using (auth.uid() = muter_id);

drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts
  for select to authenticated using (public.can_view_post(posts));

drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts
  for insert to authenticated
  with check (
    auth.uid() = author_id
    and not public.is_blocked(auth.uid(), author_id)
  );

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p))
  );

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p))
  );

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments
  for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "likes_select" on public.likes;
create policy "likes_select" on public.likes
  for select to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p))
  );

drop policy if exists "likes_insert" on public.likes;
create policy "likes_insert" on public.likes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p))
  );

drop policy if exists "likes_delete" on public.likes;
create policy "likes_delete" on public.likes
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "hashtags_select" on public.hashtags;
create policy "hashtags_select" on public.hashtags
  for select to authenticated using (true);

drop policy if exists "hashtags_insert" on public.hashtags;
create policy "hashtags_insert" on public.hashtags
  for insert to authenticated with check (char_length(trim(tag)) > 0);

drop policy if exists "post_hashtags_select" on public.post_hashtags;
create policy "post_hashtags_select" on public.post_hashtags
  for select to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p))
  );

drop policy if exists "post_hashtags_insert" on public.post_hashtags;
create policy "post_hashtags_insert" on public.post_hashtags
  for insert to authenticated
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists "post_hashtags_delete" on public.post_hashtags;
create policy "post_hashtags_delete" on public.post_hashtags
  for delete to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists "statuses_select" on public.statuses;
create policy "statuses_select" on public.statuses
  for select to authenticated using (public.can_view_status(statuses));

drop policy if exists "statuses_insert" on public.statuses;
create policy "statuses_insert" on public.statuses
  for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists "statuses_delete_own" on public.statuses;
create policy "statuses_delete_own" on public.statuses
  for delete to authenticated using (auth.uid() = author_id);

drop policy if exists "media_select" on public.media;
create policy "media_select" on public.media
  for select to authenticated
  using (
    (
      post_id is not null
      and exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p))
    )
    or (
      status_id is not null
      and exists (select 1 from public.statuses s where s.id = status_id and public.can_view_status(s))
    )
  );

drop policy if exists "media_insert" on public.media;
create policy "media_insert" on public.media
  for insert to authenticated
  with check (
    (
      post_id is not null
      and exists (
        select 1 from public.posts p
        where p.id = post_id and p.author_id = auth.uid()
      )
    )
    or (
      status_id is not null
      and exists (
        select 1 from public.statuses s
        where s.id = status_id and s.author_id = auth.uid()
      )
    )
  );

drop policy if exists "media_delete" on public.media;
create policy "media_delete" on public.media
  for delete to authenticated
  using (
    (
      post_id is not null
      and exists (
        select 1 from public.posts p
        where p.id = post_id and p.author_id = auth.uid()
      )
    )
    or (
      status_id is not null
      and exists (
        select 1 from public.statuses s
        where s.id = status_id and s.author_id = auth.uid()
      )
    )
  );

drop policy if exists "reports_select" on public.reports;
create policy "reports_select" on public.reports
  for select to authenticated
  using (auth.uid() = reporter_id or public.is_staff());

drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert" on public.reports
  for insert to authenticated with check (auth.uid() = reporter_id);

drop policy if exists "reports_update_staff" on public.reports;
create policy "reports_update_staff" on public.reports
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ── storage (avatars already exist in 003; do not rewrite those policies) ──

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('chat-blob', 'chat-blob', false, 20971520),
  ('status-blob', 'status-blob', false, 20971520)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "Public read post-media" on storage.objects;
create policy "Public read post-media" on storage.objects
  for select using (bucket_id = 'post-media');

drop policy if exists "Users upload own post-media" on storage.objects;
create policy "Users upload own post-media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own post-media" on storage.objects;
create policy "Users update own post-media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own post-media" on storage.objects;
create policy "Users delete own post-media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owner read encrypted blobs" on storage.objects;
create policy "Owner read encrypted blobs" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('chat-blob', 'status-blob')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owner write encrypted blobs" on storage.objects;
create policy "Owner write encrypted blobs" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('chat-blob', 'status-blob')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owner delete encrypted blobs" on storage.objects;
create policy "Owner delete encrypted blobs" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('chat-blob', 'status-blob')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
