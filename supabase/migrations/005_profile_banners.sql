-- Public profile banner image URL (stored in avatars bucket as {uid}/banner.*)

alter table public.profiles
  add column if not exists banner_url text;
