-- Phase 3: locale opt-in on profiles + richer signup metadata for Google.
-- Default is English (`en`). Trinidadian Creole (`tcr`) is opt-in.
-- Does not enable the T&T theme (that is a later phase).

alter table public.profiles
  add column if not exists locale text not null default 'en';

alter table public.profiles
  drop constraint if exists profiles_locale_check;

alter table public.profiles
  add constraint profiles_locale_check check (locale in ('en', 'tcr'));

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
  chosen_locale text;
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

  chosen_locale := coalesce(new.raw_user_meta_data ->> 'locale', 'en');
  if chosen_locale not in ('en', 'tcr') then
    chosen_locale := 'en';
  end if;

  insert into public.profiles (id, email, display_name, handle, locale)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    final_handle,
    chosen_locale
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        handle = coalesce(public.profiles.handle, excluded.handle),
        locale = coalesce(public.profiles.locale, excluded.locale);

  return new;
end;
$$;
