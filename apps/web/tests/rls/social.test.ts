import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, rlsEnvReady, type TestUser } from './helpers'

const describeRls = rlsEnvReady() ? describe : describe.skip

describeRls('EudaChat social-graph RLS', () => {
  let alice: TestUser
  let bob: TestUser
  let charlie: TestUser

  beforeAll(async () => {
    alice = await createTestUser('salice')
    bob = await createTestUser('sbob')
    charlie = await createTestUser('scharlie')
  }, 90_000)

  afterAll(async () => {
    for (const id of [alice?.id, bob?.id, charlie?.id].filter(Boolean) as string[]) {
      try {
        await deleteTestUser(id)
      } catch {
        // best-effort cleanup
      }
    }
  }, 90_000)

  it('lets peers read a public post and hides a followers-only post until they follow', async () => {
    const { data: pub, error: pubError } = await alice.client
      .from('posts')
      .insert({ author_id: alice.id, body: `public-${Date.now()}`, visibility: 'public' })
      .select('id, body')
      .single()
    expect(pubError).toBeNull()

    const { data: bobSeesPublic } = await bob.client
      .from('posts')
      .select('id, body')
      .eq('id', pub!.id)
      .maybeSingle()
    expect(bobSeesPublic?.id).toBe(pub!.id)

    const { data: hidden, error: hiddenError } = await alice.client
      .from('posts')
      .insert({ author_id: alice.id, body: `followers-${Date.now()}`, visibility: 'followers' })
      .select('id')
      .single()
    expect(hiddenError).toBeNull()

    const { data: bobBefore } = await bob.client
      .from('posts')
      .select('id')
      .eq('id', hidden!.id)
      .maybeSingle()
    expect(bobBefore).toBeNull()

    const { error: followError } = await bob.client
      .from('follows')
      .insert({ follower_id: bob.id, followee_id: alice.id })
    expect(followError).toBeNull()

    const { data: bobAfter } = await bob.client
      .from('posts')
      .select('id')
      .eq('id', hidden!.id)
      .maybeSingle()
    expect(bobAfter?.id).toBe(hidden!.id)
  })

  it('hides close-friends posts and statuses from anyone not on the list', async () => {
    const { error: cfError } = await alice.client
      .from('close_friends')
      .insert({ owner_id: alice.id, friend_id: bob.id })
    expect(cfError).toBeNull()

    const { data: post, error: postError } = await alice.client
      .from('posts')
      .insert({ author_id: alice.id, body: `cf-${Date.now()}`, visibility: 'close_friends' })
      .select('id')
      .single()
    expect(postError).toBeNull()

    const { data: bobSees } = await bob.client.from('posts').select('id').eq('id', post!.id).maybeSingle()
    expect(bobSees?.id).toBe(post!.id)

    const { data: charlieSees } = await charlie.client
      .from('posts')
      .select('id')
      .eq('id', post!.id)
      .maybeSingle()
    expect(charlieSees).toBeNull()

    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const { data: status, error: statusError } = await alice.client
      .from('statuses')
      .insert({
        author_id: alice.id,
        caption: `cf-status-${Date.now()}`,
        visibility: 'close_friends',
        expires_at: expires
      })
      .select('id')
      .single()
    expect(statusError).toBeNull()

    const { data: bobStatus } = await bob.client
      .from('statuses')
      .select('id')
      .eq('id', status!.id)
      .maybeSingle()
    expect(bobStatus?.id).toBe(status!.id)

    const { data: charlieStatus } = await charlie.client
      .from('statuses')
      .select('id')
      .eq('id', status!.id)
      .maybeSingle()
    expect(charlieStatus).toBeNull()
  })

  it('hides posts both ways after a block and rejects likes on hidden posts', async () => {
    const { data: post, error: postError } = await alice.client
      .from('posts')
      .insert({ author_id: alice.id, body: `block-${Date.now()}`, visibility: 'public' })
      .select('id')
      .single()
    expect(postError).toBeNull()

    const { error: blockError } = await alice.client
      .from('blocks')
      .insert({ blocker_id: alice.id, blocked_id: charlie.id })
    expect(blockError).toBeNull()

    const { data: charlieSees } = await charlie.client
      .from('posts')
      .select('id')
      .eq('id', post!.id)
      .maybeSingle()
    expect(charlieSees).toBeNull()

    const { error: likeError } = await charlie.client
      .from('likes')
      .insert({ post_id: post!.id, user_id: charlie.id })
    expect(likeError).toBeTruthy()

    const { data: charlieBlock } = await charlie.client
      .from('blocks')
      .select('blocker_id')
      .eq('blocker_id', alice.id)
      .eq('blocked_id', charlie.id)
      .maybeSingle()
    expect(charlieBlock).toBeNull()
  })

  it('lets a reporter read their own report and hides it from peers', async () => {
    const { data: post, error: postError } = await bob.client
      .from('posts')
      .insert({ author_id: bob.id, body: `report-${Date.now()}`, visibility: 'public' })
      .select('id')
      .single()
    expect(postError).toBeNull()

    const { data: report, error: reportError } = await alice.client
      .from('reports')
      .insert({
        reporter_id: alice.id,
        target_kind: 'post',
        target_id: post!.id,
        reason: 'spam'
      })
      .select('id, status')
      .single()
    expect(reportError).toBeNull()

    const { data: aliceSees } = await alice.client
      .from('reports')
      .select('id')
      .eq('id', report!.id)
      .maybeSingle()
    expect(aliceSees?.id).toBe(report!.id)

    const { data: bobSees } = await bob.client
      .from('reports')
      .select('id')
      .eq('id', report!.id)
      .maybeSingle()
    expect(bobSees).toBeNull()

    const { data: updated, error: updateError } = await alice.client
      .from('reports')
      .update({ status: 'closed' })
      .eq('id', report!.id)
      .select('id')
    expect(updateError).toBeNull()
    expect(updated ?? []).toHaveLength(0)
  })
})
