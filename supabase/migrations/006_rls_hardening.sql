-- Peer-review hardening (gge513, jiaxinaspenlin-dotcom):
-- 1) channels_update: creator-or-admin only (match README)
-- 2) mention notifications: do not leak DM body snippets to non-participants
-- 3) drop redundant client insert on chat_notifications (triggers are security definer)

drop policy if exists "channels_update" on public.channels;
create policy "channels_update" on public.channels
  for update to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

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

    if mentioned_id is null then
      continue;
    end if;

    -- Channel mentions: any authenticated profile may be notified.
    -- DM mentions: only notify if the mentioned user is a thread participant
    -- (avoids leaking a 160-char DM snippet to outsiders).
    if new.dm_thread_id is not null then
      if not exists (
        select 1
        from public.dm_threads t
        where t.id = new.dm_thread_id
          and mentioned_id in (t.user_a, t.user_b)
      ) then
        continue;
      end if;
    end if;

    insert into public.chat_notifications (user_id, type, message_id, body)
    values (mentioned_id, 'mention', new.id, left(new.body, 160));
  end loop;
  return new;
end;
$$;

drop policy if exists "chat_notifications_insert_own" on public.chat_notifications;
