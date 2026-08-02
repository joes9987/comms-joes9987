/**
 * Seed or refresh the shared reviewer demo accounts for EudaChat.
 * Requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage: npm run seed:reviewer
 *
 * Seeds Chat-owned rows only (channels / dm_threads / messages). Does not touch
 * EudaPM projects/tasks or grant is_admin. Does not post into #general.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const REVIEWER_EMAIL = 'eudachat-reviewer@example.com'
const REVIEWER_PASSWORD = 'EudaChat-Review-2026'
const REVIEWER_NAME = 'EudaChat Reviewer'

const PEER_EMAIL = 'eudachat-peer@example.com'
const PEER_PASSWORD = 'EudaChat-Peer-Internal-2026'
const PEER_NAME = 'EudaChat Demo Peer'

const CHANNEL_SLUG = 'reviewer-demo'
const CHANNEL_NAME = 'Reviewer demo'

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function ensureUser (email, password, displayName) {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  })
  if (listError) throw listError

  const existing = list?.users?.find((user) => user.email === email)
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName }
    })
    if (error) throw error
    return existing.id
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName }
  })
  if (error) throw error
  return data.user.id
}

async function waitForProfile (userId) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, handle, display_name')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    if (data) return data
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Profile not created for ${userId} — is on_auth_user_created / handle_new_user installed?`)
}

async function ensureChannel (createdBy) {
  const { data: existing, error: selectError } = await admin
    .from('channels')
    .select('id, slug')
    .eq('slug', CHANNEL_SLUG)
    .maybeSingle()
  if (selectError) throw selectError
  if (existing) return existing.id

  const { data, error } = await admin
    .from('channels')
    .insert({
      name: CHANNEL_NAME,
      slug: CHANNEL_SLUG,
      kind: 'public',
      created_by: createdBy
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function seedChannelMessages (channelId, reviewerId, peerHandle) {
  const { count, error: countError } = await admin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channelId)
    .eq('author_id', reviewerId)
  if (countError) throw countError
  if ((count ?? 0) > 0) {
    console.log(`Channel #${CHANNEL_SLUG} already has reviewer messages — skip`)
    return
  }

  const bodies = [
    'Welcome to the reviewer demo channel. Prefer this room over #general so the real cohort stays quiet.',
    'Try keyword search for “reviewer-demo-keyword” — it should find this message.',
    `Hi @${peerHandle} — mention autocomplete and notifications should light up for demo peers.`
  ]

  const { error } = await admin.from('messages').insert(
    bodies.map((body) => ({
      channel_id: channelId,
      author_id: reviewerId,
      body
    }))
  )
  if (error) throw error
  console.log(`Seeded ${bodies.length} messages in #${CHANNEL_SLUG}`)
}

async function ensureDmThread (userA, userB) {
  const [low, high] = userA < userB ? [userA, userB] : [userB, userA]
  const { data: existing, error: selectError } = await admin
    .from('dm_threads')
    .select('id')
    .eq('user_a', low)
    .eq('user_b', high)
    .maybeSingle()
  if (selectError) throw selectError
  if (existing) return existing.id

  const { data, error } = await admin
    .from('dm_threads')
    .insert({ user_a: low, user_b: high })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function seedDmMessages (threadId, reviewerId, peerId) {
  const { count, error: countError } = await admin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('dm_thread_id', threadId)
  if (countError) throw countError
  if ((count ?? 0) > 0) {
    console.log('DM thread already has messages — skip')
    return
  }

  const { error } = await admin.from('messages').insert([
    {
      dm_thread_id: threadId,
      author_id: peerId,
      body: 'Hey — this is a seeded DM so reviewers can see the thread list and notifications.'
    },
    {
      dm_thread_id: threadId,
      author_id: reviewerId,
      body: 'Reply here, then open Search and the notification bell to finish the smoke checklist.'
    }
  ])
  if (error) throw error
  console.log('Seeded DM exchange between reviewer and peer')
}

const reviewerId = await ensureUser(REVIEWER_EMAIL, REVIEWER_PASSWORD, REVIEWER_NAME)
const peerId = await ensureUser(PEER_EMAIL, PEER_PASSWORD, PEER_NAME)
const reviewerProfile = await waitForProfile(reviewerId)
const peerProfile = await waitForProfile(peerId)

const channelId = await ensureChannel(reviewerId)
await seedChannelMessages(channelId, reviewerId, peerProfile.handle)
const threadId = await ensureDmThread(reviewerId, peerId)
await seedDmMessages(threadId, reviewerId, peerId)

console.log(`Reviewer demo ready: ${REVIEWER_EMAIL} / ${REVIEWER_PASSWORD}`)
console.log(`Profile handle: @${reviewerProfile.handle} · peer @${peerProfile.handle}`)
console.log(`Open #${CHANNEL_SLUG} after sign-in at /app/c/${CHANNEL_SLUG}`)
