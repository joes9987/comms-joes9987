# EudaChat — RLS policy inventory (versioned)

All authorization for Chat tables is in `supabase/migrations/*.sql` (PostgreSQL accepts
`create policy` lowercase — a case-sensitive search for `CREATE POLICY` will miss them).

A fresh `supabase db reset` / SQL editor apply of `001`→`006` recreates these policies.

| Migration | Policies / guards |
|-----------|-------------------|
| [`001_init.sql`](../supabase/migrations/001_init.sql) | `channels_select_all`, `channels_insert`, `channels_update` (later replaced), `dm_threads_select_own`, `dm_threads_insert_own`, `messages_select`, `messages_insert`, `chat_notifications_select_own`, `chat_notifications_update_own`, `chat_notifications_insert_own` (later dropped) + mention/DM notification triggers |
| [`002_staff_management.sql`](../supabase/migrations/002_staff_management.sql) | `Admins can manage profiles` + admin bootstrap |
| [`003_profile_customization.sql`](../supabase/migrations/003_profile_customization.sql) | Storage `avatars` public read + owner upload/update/delete |
| [`004_private_dob.sql`](../supabase/migrations/004_private_dob.sql) | `Users manage own private profile` on `profile_private` |
| [`006_rls_hardening.sql`](../supabase/migrations/006_rls_hardening.sql) | Recreates `channels_update` as creator-or-admin; DM mention participant check; drops client insert on `chat_notifications` |

`profiles` base RLS is shared with EudaPM on the same Supabase project (cohort identity). Chat
migrations add handle/admin columns and admin manage policy; they do not redefine PM’s core
profile select/update policies.

Automated coverage: [`tests/rls/security.test.ts`](../tests/rls/security.test.ts) (CI).
