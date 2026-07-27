# EudaChat — @joes9987

Project 2 submission for the Hult Cohort Summer Pilot 2026: an internal comms platform for the
cohort — channels, direct messages, staff-only announcements, keyword search, and realtime
updates.

**Product name:** EudaChat (repo / hostname remain `comms-joes9987`).

## Production URL

https://comms-joes9987.vercel.app

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Supabase** (Auth + Postgres + Row Level Security + Realtime)
- **Tailwind CSS 4**
- `@supabase/ssr` + `@supabase/supabase-js`, cookie handling via `getAll`/`setAll` only (no
  deprecated per-cookie helpers)

## Architecture

```
Browser (React)
  → Supabase Auth (email/password, cookie session via @supabase/ssr)
  → Postgres (profiles, channels, dm_threads, messages, notifications)
  → Row Level Security scopes every read/write to the authenticated cohort member
  → Realtime on messages, notifications, channels (Supabase Postgres Changes)
  → DB triggers: new-user → profile, new message → DM/@mention notifications
```

### Data model

| Table | Purpose |
|-------|---------|
| `profiles` | Cohort member email, display name, `handle`, `avatar_url`, `banner_url`, `bio`, `is_admin` |
| `profile_private` | Per-user private fields (e.g. date of birth) — RLS: owner only |
| Storage `avatars` | Public bucket for profile pictures, banners, and personal wallpapers (2 MB, image MIME types) |
| `channels` | Named rooms; `kind` is `public` or `announcements`; `archived_at` soft-archive |
| `dm_threads` | One row per unique unordered pair of profiles (`user_a < user_b`, unique) |
| `messages` | Belongs to exactly one of `channel_id` / `dm_thread_id` (checked in SQL) |
| `chat_notifications` | In-app alerts for DMs and `@mentions` (PM already owns `notifications`) |

RLS highlights:

- Everyone authenticated can read all channels and profiles.
- Only admins (or the channel's own creator) can rename/archive a channel; only admins can post in
  an `announcements`-kind channel or create a new one of that kind.
- DM threads and DM messages are only visible to their two participants.
- Notifications are only ever visible to / updatable by the owning user. DM and `@mention` rows are
  inserted by `security definer` triggers (no client insert policy). Mention notifications on DMs
  only fire for thread participants (no body-snippet leak to outsiders).

## Setup (fresh clone)

1. Clone and install:

```bash
git clone https://github.com/joes9987/comms-joes9987.git
cd comms-joes9987
npm install
```

2. Create a Supabase project (or use an existing one) and run
   [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) in the SQL editor (or via
   `supabase db push`). It creates the schema, RLS policies, triggers, and seeds the `general`,
   `random`, `help`, and `announcements` channels.

3. Copy the committed env template:

```bash
cp .env.example .env.local
```

4. Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

5. In Supabase Auth settings, disable email confirmation for quick local testing (optional).

6. Run locally:

```bash
npm run dev
```

7. Sign up, land in `#general`. The first staff account (`singhjoe57@gmail.com`) is bootstrapped
   by migration `002_staff_management.sql`. Other staff can be granted in-app at **Manage staff**
   (`/app/staff`) by an existing admin.

8. Build for production: `npm run build`

## Features

- [x] Email/password auth; `profiles` row auto-created on signup via trigger
- [x] Channels: `general`, `random`, `help` seeded public; create, rename, archive/unarchive
- [x] `announcements` channel: everyone can read, only `is_admin` accounts can post
- [x] Staff management UI (`/app/staff`) — admins can grant/revoke staff for other members
- [x] Direct messages: 1:1 thread between any two cohort members, deduplicated per pair
- [x] All messages persisted in Postgres, scoped by Row Level Security
- [x] Keyword search (`/app/search`) across every channel and your own DMs
- [x] Realtime message + notification delivery via Supabase Postgres Changes (no polling)
- [x] In-app notifications for new DMs and `@handle` mentions, with mark-read and deep links
- [x] `@handle` mention autocomplete in the composer
- [x] Middleware-enforced auth gate on `/app/*`
- [x] Profile customization (`/app/profile`) — photo, banner, display name, handle, bio; optional private DOB
- [x] Discord-style profile popover from chat names, avatars, and `@mentions`
- [x] Personal app background presets + custom wallpaper (local to this browser)

## Known limitations

- The channel/DM sidebar refreshes via Next.js server-component refresh after you create,
  rename, or archive something (or open a new DM) — it does not (yet) live-update if a
  *different* browser session creates a channel while you're looking at the sidebar. Message
  content itself is fully realtime.
- No message editing or deletion; no typing indicators or read receipts.
- No invite-only signup — anyone with a link can create an account (matches the cohort's open
  registration model used by `pm-joes9987`).
- Search is a simple `ilike` substring match, not full-text ranking (a `tsvector` index is present
  in the schema for a future upgrade).
- Email confirmation may need to be disabled in Supabase for frictionless reviewer access.

## Agent usage

Built with Cursor Agent: scaffolded the Next.js app, implemented the Supabase schema + RLS +
triggers, auth flows (reusing the `@supabase/ssr` cookie pattern from `pm-joes9987`), the
channel/DM chat UI, realtime subscriptions, keyword search, and `@mention`/DM notifications.

## License

MIT
