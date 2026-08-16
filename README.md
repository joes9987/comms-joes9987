# EudaChat — @joes9987

Project 2 submission for the Hult Cohort Summer Pilot 2026: an internal comms platform for the
cohort — channels, direct messages, staff-only announcements, keyword search, and realtime
updates.

**Product name:** EudaChat (repo / hostname remain `comms-joes9987`).

## Production URL

https://comms-joes9987.vercel.app

## Stack

- **pnpm 9** + **Turborepo** workspace (`apps/web` is the Next.js app)
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
| `profiles` | Cohort member email, display name, `handle`, `avatar_url`, `banner_url`, `bio`, `is_admin`, `locale` (`en` default, `tcr` opt-in) |
| `profile_private` | Per-user private fields (e.g. date of birth) — RLS: owner only |
| Storage `avatars` | Public bucket for profile pictures, banners, and personal wallpapers (2 MB, image MIME types) |
| `channels` | Named rooms; `kind` is `public` or `announcements`; `archived_at` soft-archive |
| `dm_threads` | One row per unique unordered pair of profiles (`user_a < user_b`, unique) |
| `messages` | Belongs to exactly one of `channel_id` / `dm_thread_id` (checked in SQL) |
| `chat_notifications` | In-app alerts for DMs and `@mentions` (PM already owns `notifications`) |
| `follows` / `close_friends` | Directed follow graph; owner-only close-friends list |
| `posts` / `comments` / `likes` / `hashtags` | Public feed (reposts via `posts.reposted_from`) |
| `statuses` | 24h stories (`public` or `close_friends`; E2EE ciphertext reserved) |
| `blocks` / `mutes` / `reports` | Safety primitives; staff queue at `/app/staff/reports` |
| `pre_key_bundles` / `message_envelopes` | Signal E2EE transport over Supabase Realtime |
| `push_tokens` | Expo / web push device tokens (not EudaPM `notifications`) |
| `post_reactions` | Optional Trini reactions when `tt-mode` is on |
| Storage `post-media` | Public images/video for posts |
| Storage `chat-blob` / `status-blob` | Private encrypted blobs (E2EE later) |

RLS highlights (full inventory: [docs/RLS_POLICIES.md](docs/RLS_POLICIES.md)):

- Policies are versioned in `supabase/migrations/` (`create policy` — lowercase SQL).
- Everyone authenticated can read all channels and profiles.
- Only admins (or the channel's own creator) can rename/archive a channel; only admins can post in
  an `announcements`-kind channel or create a new one of that kind.
- DM threads and DM messages are only visible to their two participants.
- Notifications are only ever visible to / updatable by the owning user. DM and `@mention` rows are
  inserted by `security definer` triggers (no client insert policy). Mention notifications on DMs
  only fire for thread participants (no body-snippet leak to outsiders).
- Vitest RLS suite + CI: `apps/web/tests/rls/security.test.ts`, `.github/workflows/ci.yml`.

## Setup (fresh clone)

1. Clone and install:

```bash
git clone https://github.com/joes9987/comms-joes9987.git
cd comms-joes9987
pnpm install
```

2. Create a Supabase project (or use an existing one) and run
   [`supabase/migrations/`](supabase/migrations/) (`001` through `009`) in the SQL editor (or via
   `supabase db push`). `001` creates channels/DMs/messages and seeds `general`, `random`, `help`,
   and `announcements`. `007` adds the social-graph / feed tables. `008` adds `profiles.locale`.
   `009` adds Signal pre-key bundles, message envelopes, push tokens, and Trini post reactions.

3. Copy the committed env template:

```bash
cp .env.example apps/web/.env.local
```

4. Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # local/CI RLS tests only — never commit or put in NEXT_PUBLIC_*
```

5. In Supabase Auth → URL configuration, allow redirect URLs:
   - `https://comms-joes9987.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`
   (same shared project as EudaPM / EudaMarket — also allow their `/auth/confirm` and `/auth/callback` hosts).
   Disable email confirmation for quick local testing (optional).
   To enable **Continue with Google**, turn on the Google provider in that same Auth dashboard
   (client id/secret from Google Cloud). The button is in the product either way; it surfaces
   Supabase’s error if the provider is still off.

6. Run locally:

```bash
pnpm dev
```

7. Sign up, land in `#general`. The first staff account (`singhjoe57@gmail.com`) is bootstrapped
   by migration `002_staff_management.sql`. Other staff can be granted in-app at **Manage staff**
   (`/app/staff`) by an existing admin.

8. Build for production: `pnpm build`

9. Optional — RLS security suite (creates ephemeral users, cleans them up):

```bash
pnpm test
```

Requires `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.local`. Without it, live cases skip. GitHub Actions runs the same suite when repo secrets are set (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

**Peer reviewers:** See [docs/REVIEWER.md](docs/REVIEWER.md) for the shared demo account (`eudachat-reviewer@example.com`) and smoke checklist. Refresh seed data with `pnpm seed:reviewer` (service role required).

## Features

- [x] Email/password auth; `profiles` row auto-created on signup via trigger
- [x] Google OAuth (`Continue with Google` → `/auth/callback` → `/onboarding`); same shared Supabase project
- [x] Optional Trinidadian Creole locale (`tcr`) on signup, onboarding, and profile — default English
- [x] Shared reviewer demo (`eudachat-reviewer@example.com`) with seeded `#reviewer-demo` + DM — see [docs/REVIEWER.md](docs/REVIEWER.md)
- [x] Password reset (`/forgot-password` → email link → `/auth/callback` → `/auth/update-password`); shared suite account with EudaPM / EudaMarket
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
- [x] Vitest RLS suite + GitHub Actions CI (DM isolation, mention privacy, staff escalation, channel update)
- [x] Social feed (`/app/feed`) — compose, like, comment, repost, follow, For You / Following, hashtags
- [x] Discover + profile timelines (`/app/discover`, `/app/u/[handle]`, `/app/tag/[tag]`)
- [x] 24h statuses (`/app/status/new`) with public and close-friends visibility
- [x] T&T theme (`tt-mode`) + Trini reactions when Creole locale is on
- [x] Moderation: report / mute / block + staff reports queue
- [x] Signal crypto package (`@euda/crypto`) + `pre_key_bundles` / `message_envelopes` over Realtime
- [x] Push token table + web service worker (VAPID optional); Expo fanout Edge Function stub
- [x] LiveKit token route (`/api/calls/token`) — stub until cloud keys are set
- [x] Expo mobile stub in `apps/mobile` (same Supabase project)

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
