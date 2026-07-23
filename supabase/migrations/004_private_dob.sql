-- Keep date of birth private: only the owning user can read/write it.

create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth date,
  updated_at timestamptz not null default now()
);

-- If an earlier draft put DOB on profiles, move it and drop the column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'date_of_birth'
  ) then
    insert into public.profile_private (user_id, date_of_birth)
    select id, date_of_birth
    from public.profiles
    where date_of_birth is not null
    on conflict (user_id) do update
      set date_of_birth = excluded.date_of_birth;
    alter table public.profiles drop column date_of_birth;
  end if;
end $$;

alter table public.profile_private enable row level security;

drop policy if exists "Users manage own private profile" on public.profile_private;
create policy "Users manage own private profile"
  on public.profile_private for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
