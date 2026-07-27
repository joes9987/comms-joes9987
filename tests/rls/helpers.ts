import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type TestUser = {
  id: string
  email: string
  password: string
  handle: string
  client: SupabaseClient
}

function requireEnv (name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export function rlsEnvReady (): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
}

export function adminClient (): SupabaseClient {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function anonClient (): SupabaseClient {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function orderedPair (a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

/** Create an ephemeral auth user + wait for profiles trigger, then sign in as them. */
export async function createTestUser (prefix: string): Promise<TestUser> {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const email = `${prefix}.${stamp}@eudachat-rls.test`
  const password = `RlsTest_${stamp}!aA1`
  const handle = `${prefix}${stamp.replace(/[^a-z0-9]/gi, '').slice(0, 18)}`.toLowerCase()

  const admin = adminClient()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: prefix }
  })
  if (createError || !created.user) {
    throw new Error(`createUser failed: ${createError?.message ?? 'no user'}`)
  }

  // profiles row is created by handle_new_user trigger; normalize handle for mentions
  const { error: profileError } = await admin
    .from('profiles')
    .update({ handle, display_name: prefix, is_admin: false })
    .eq('id', created.user.id)
  if (profileError) {
    throw new Error(`profile update failed: ${profileError.message}`)
  }

  const client = anonClient()
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) {
    throw new Error(`signIn failed: ${signInError.message}`)
  }

  return { id: created.user.id, email, password, handle, client }
}

export async function deleteTestUser (userId: string) {
  const admin = adminClient()
  await admin.from('chat_notifications').delete().eq('user_id', userId)
  await admin.from('messages').delete().eq('author_id', userId)
  await admin.from('dm_threads').delete().or(`user_a.eq.${userId},user_b.eq.${userId}`)
  await admin.from('profile_private').delete().eq('user_id', userId)
  await admin.from('profiles').delete().eq('id', userId)
  await admin.auth.admin.deleteUser(userId)
}
