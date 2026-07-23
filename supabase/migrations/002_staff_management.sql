-- Staff management: admins can grant/revoke is_admin; non-admins cannot escalate.

-- Bootstrap owner as staff before the guard trigger exists
update public.profiles
set is_admin = true
where email = 'singhjoe57@gmail.com';

create or replace function public.guard_profile_is_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
begin
  if new.is_admin is not distinct from old.is_admin then
    return new;
  end if;

  -- Service role / SQL editor (no JWT) may bootstrap staff
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(p.is_admin, false) into actor_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if not coalesce(actor_is_admin, false) then
    raise exception 'Only staff can change admin status';
  end if;

  -- Keep at least one staff account
  if old.is_admin = true and new.is_admin = false then
    if (
      select count(*)::int from public.profiles where is_admin = true and id <> old.id
    ) = 0 then
      raise exception 'Cannot remove the last staff member';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_is_admin on public.profiles;
create trigger profiles_guard_is_admin
  before update on public.profiles
  for each row execute function public.guard_profile_is_admin_change();

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
  on public.profiles for update to authenticated
  using (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.is_admin
    )
  )
  with check (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.is_admin
    )
  );
