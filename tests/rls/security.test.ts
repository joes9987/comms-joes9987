import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  orderedPair,
  rlsEnvReady,
  type TestUser
} from './helpers'

const describeRls = rlsEnvReady() ? describe : describe.skip

describeRls('EudaChat RLS (shared Supabase)', () => {
  let alice: TestUser
  let bob: TestUser
  let charlie: TestUser
  let dmThreadId: string
  let generalChannelId: string | null = null

  beforeAll(async () => {
    alice = await createTestUser('alice')
    bob = await createTestUser('bob')
    charlie = await createTestUser('charlie')

    const [userA, userB] = orderedPair(alice.id, bob.id)
    const { data: thread, error: threadError } = await alice.client
      .from('dm_threads')
      .insert({ user_a: userA, user_b: userB })
      .select('id')
      .single()
    if (threadError || !thread) {
      throw new Error(`dm_threads insert failed: ${threadError?.message ?? 'no row'}`)
    }
    dmThreadId = thread.id

    const { data: general } = await adminClient()
      .from('channels')
      .select('id')
      .eq('slug', 'general')
      .maybeSingle()
    generalChannelId = general?.id ?? null
  }, 90_000)

  afterAll(async () => {
    const ids = [alice?.id, bob?.id, charlie?.id].filter(Boolean) as string[]
    for (const id of ids) {
      try {
        await deleteTestUser(id)
      } catch {
        // best-effort cleanup
      }
    }
  }, 90_000)

  it('keeps DM messages private to participants', async () => {
    const secret = `rls-dm-secret-${Date.now()}`
    const { data: message, error: sendError } = await alice.client
      .from('messages')
      .insert({
        dm_thread_id: dmThreadId,
        author_id: alice.id,
        body: secret
      })
      .select('id')
      .single()
    expect(sendError).toBeNull()
    expect(message?.id).toBeTruthy()

    const { data: bobSees } = await bob.client
      .from('messages')
      .select('id, body')
      .eq('id', message!.id)
      .maybeSingle()
    expect(bobSees?.body).toBe(secret)

    const { data: charlieSees } = await charlie.client
      .from('messages')
      .select('id, body')
      .eq('id', message!.id)
      .maybeSingle()
    expect(charlieSees).toBeNull()

    const { data: charlieThread } = await charlie.client
      .from('dm_threads')
      .select('id')
      .eq('id', dmThreadId)
      .maybeSingle()
    expect(charlieThread).toBeNull()
  })

  it('does not notify non-participants for @mentions inside a DM', async () => {
    const marker = `rls-mention-leak-${Date.now()}`
    const { data: message, error: sendError } = await alice.client
      .from('messages')
      .insert({
        dm_thread_id: dmThreadId,
        author_id: alice.id,
        body: `@${charlie.handle} ${marker}`
      })
      .select('id')
      .single()
    expect(sendError).toBeNull()

    // Allow trigger to run
    await new Promise((r) => setTimeout(r, 800))

    const { data: charlieNotes } = await charlie.client
      .from('chat_notifications')
      .select('id, type, body, message_id')
      .eq('message_id', message!.id)
    expect(charlieNotes ?? []).toHaveLength(0)

    // Control: mention a participant — they should get a notification
    const { data: mentionBob, error: mentionError } = await alice.client
      .from('messages')
      .insert({
        dm_thread_id: dmThreadId,
        author_id: alice.id,
        body: `@${bob.handle} participant ping ${Date.now()}`
      })
      .select('id')
      .single()
    expect(mentionError).toBeNull()
    await new Promise((r) => setTimeout(r, 800))

    const { data: bobNotes } = await bob.client
      .from('chat_notifications')
      .select('id, type')
      .eq('message_id', mentionBob!.id)
      .eq('type', 'mention')
    expect((bobNotes ?? []).length).toBeGreaterThan(0)
  })

  it('blocks non-admin self-promotion of is_admin', async () => {
    const { error } = await bob.client
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', bob.id)

    expect(error).toBeTruthy()
    expect(error!.message.toLowerCase()).toMatch(/staff|admin|policy|permission|row-level|security/)

    const { data: profile } = await adminClient()
      .from('profiles')
      .select('is_admin')
      .eq('id', bob.id)
      .single()
    expect(profile?.is_admin).toBe(false)
  })

  it('prevents non-creator non-admin from archiving a public channel', async () => {
    if (!generalChannelId) {
      // Seeded channel missing in this environment — skip rather than fail setup
      return
    }

    // PostgREST often returns success + 0 rows when RLS blocks an UPDATE (no error).
    const { data: updated, error } = await charlie.client
      .from('channels')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', generalChannelId)
      .select('id')

    expect(error).toBeNull()
    expect(updated ?? []).toHaveLength(0)

    const { data: channel } = await adminClient()
      .from('channels')
      .select('archived_at')
      .eq('id', generalChannelId)
      .single()
    expect(channel?.archived_at).toBeNull()
  })

  it('keeps chat_notifications readable only by the owning user', async () => {
    // Ensure bob has at least one notification from the DM path
    await new Promise((r) => setTimeout(r, 400))
    const { data: bobNotes } = await bob.client
      .from('chat_notifications')
      .select('id')
      .limit(5)
    expect((bobNotes ?? []).length).toBeGreaterThan(0)

    const noteId = bobNotes![0].id
    const { data: alicePeek } = await alice.client
      .from('chat_notifications')
      .select('id')
      .eq('id', noteId)
      .maybeSingle()
    expect(alicePeek).toBeNull()
  })
})

describe('RLS suite env gate', () => {
  it('documents required secrets when skipped', () => {
    if (!rlsEnvReady()) {
      console.warn(
        'Skipping live RLS tests — set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY'
      )
    }
    expect(true).toBe(true)
  })
})
