-- Phase 6+10+7: E2EE transport, push tokens, Trini post reactions.
-- Does not create a notifications table (EudaPM owns public.notifications).
-- Does not touch avatars, channels, DMs, chat_notifications, or posts RLS.
--
-- RLS: `create policy` lowercase. Inventory: docs/RLS_POLICIES.md

-- ── E2EE transport ─────────────────────────────────────────────────────────

create table if not exists public.pre_key_bundles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  device_id int not null default 1,
  registration_id int not null,
  identity_key text not null,
  signed_pre_key jsonb not null,
  one_time_pre_keys jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.message_envelopes (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null
    check (kind in (
      'session_init',
      'message',
      'media',
      'reaction',
      'receipt',
      'typing',
      'group_session'
    )),
  ciphertext text not null,
  created_at timestamptz not null default now()
);

create index if not exists message_envelopes_recipient_idx
  on public.message_envelopes (recipient_id);
create index if not exists message_envelopes_conversation_idx
  on public.message_envelopes (conversation_id);

-- ── device push (not EudaPM public.notifications) ──────────────────────────

create table if not exists public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- ── feed reactions (reuse public.can_view_post from 007) ───────────────────

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null
    check (reaction in ('yeah', 'sweet', 'doh', 'mas', 'love', 'wine')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.pre_key_bundles enable row level security;
alter table public.message_envelopes enable row level security;
alter table public.push_tokens enable row level security;
alter table public.post_reactions enable row level security;

drop policy if exists "pre_key_bundles_select" on public.pre_key_bundles;
create policy "pre_key_bundles_select" on public.pre_key_bundles
  for select to authenticated using (true);

drop policy if exists "pre_key_bundles_insert" on public.pre_key_bundles;
create policy "pre_key_bundles_insert" on public.pre_key_bundles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "pre_key_bundles_update" on public.pre_key_bundles;
create policy "pre_key_bundles_update" on public.pre_key_bundles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "pre_key_bundles_delete" on public.pre_key_bundles;
create policy "pre_key_bundles_delete" on public.pre_key_bundles
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "message_envelopes_select" on public.message_envelopes;
create policy "message_envelopes_select" on public.message_envelopes
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "message_envelopes_insert" on public.message_envelopes;
create policy "message_envelopes_insert" on public.message_envelopes
  for insert to authenticated with check (auth.uid() = sender_id);

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "post_reactions_select" on public.post_reactions;
create policy "post_reactions_select" on public.post_reactions
  for select to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p))
  );

drop policy if exists "post_reactions_insert" on public.post_reactions;
create policy "post_reactions_insert" on public.post_reactions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p))
  );

drop policy if exists "post_reactions_update" on public.post_reactions;
create policy "post_reactions_update" on public.post_reactions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "post_reactions_delete" on public.post_reactions;
create policy "post_reactions_delete" on public.post_reactions
  for delete to authenticated using (auth.uid() = user_id);

-- ── realtime (envelopes only; already-added is a no-op) ────────────────────

do $$
begin
  alter publication supabase_realtime add table public.message_envelopes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
