# Reviewer guide — EudaChat

Production: https://comms-joes9987.vercel.app

## Fastest path (recommended)

Signup is open — no invite code. Prefer the shared demo if you do not want to create an account.

## Shared demo login

| Field | Value |
|-------|-------|
| Email | `eudachat-reviewer@example.com` |
| Password | `EudaChat-Review-2026` |

After sign-in you land in `#general` (real cohort room). Open **`#reviewer-demo`** for seeded sample messages, and the DM list for a seeded thread with the demo peer.

Prefer posting in `#reviewer-demo` rather than `#general` so the live cohort stays quiet. The demo account is a normal member (not staff) — same auth as EudaPM / EudaMarket on the shared project.

Refresh the seed after schema changes (service role required):

```bash
npm run seed:reviewer
```

## Smoke checklist

| Area | Where |
|------|-------|
| Marketing home + demo creds | `/` |
| Login / signup / password reset | `/login`, `/signup`, `/forgot-password` |
| Demo channel | `/app/c/reviewer-demo` |
| Cohort channels | `#general`, `#random`, `#help`, Announcements (read-only unless staff) |
| Direct messages | Sidebar DM with demo peer |
| Search | `/app/search` — try `reviewer-demo-keyword` |
| Notifications | Bell after DM / `@mention` |
| Theme / appearance | Header toggle + profile settings |
| Staff gate | `/app/staff` should deny non-admins |

## RLS / security notes

Policy inventory: [RLS_POLICIES.md](RLS_POLICIES.md). Automated suite: `npm test` (`tests/rls/security.test.ts`).
