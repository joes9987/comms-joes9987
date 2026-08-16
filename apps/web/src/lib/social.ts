import type { SupabaseClient } from '@supabase/supabase-js'
import { extractHashtags } from '@/lib/hashtags'
import { rankForYou } from '@/lib/ranker'
import type { PostVisibility, ReactionId, SocialComment, SocialMedia, SocialPost, SocialStatus, StatusVisibility } from '@/lib/social-types'

const POST_SELECT = 'id, author_id, body, visibility, reposted_from, created_at, deleted_at, like_count, comment_count, repost_count'

export function postMediaUrl (path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return path
  return `${base}/storage/v1/object/public/post-media/${path}`
}

async function attachViewerState (
  supabase: SupabaseClient,
  posts: SocialPost[],
  userId: string
): Promise<SocialPost[]> {
  if (posts.length === 0) return posts
  const ids = posts.map((p) => p.id)
  const originalIds = posts.map((p) => p.reposted_from).filter((id): id is string => Boolean(id))
  const likeIds = [...new Set([...ids, ...originalIds])]

  const [{ data: likes }, { data: myReposts }, { data: media }, { data: reactions }] = await Promise.all([
    supabase.from('likes').select('post_id').eq('user_id', userId).in('post_id', likeIds),
    supabase.from('posts').select('reposted_from').eq('author_id', userId).is('deleted_at', null).in('reposted_from', likeIds),
    supabase.from('media').select('id, post_id, status_id, kind, storage_path, mime').in('post_id', ids),
    supabase.from('post_reactions').select('post_id, reaction').eq('user_id', userId).in('post_id', ids)
  ])

  const liked = new Set((likes ?? []).map((row) => row.post_id as string))
  const reposted = new Set((myReposts ?? []).map((row) => row.reposted_from as string))
  const reactionMap = new Map((reactions ?? []).map((row) => [row.post_id as string, row.reaction as ReactionId]))
  const mediaByPost = new Map<string, SocialMedia[]>()
  for (const row of (media ?? []) as SocialMedia[]) {
    if (!row.post_id) continue
    const list = mediaByPost.get(row.post_id) ?? []
    list.push(row)
    mediaByPost.set(row.post_id, list)
  }

  return posts.map((post) => {
    const target = post.reposted_from ?? post.id
    return {
      ...post,
      media: mediaByPost.get(post.id) ?? [],
      liked_by_me: liked.has(target),
      reposted_by_me: reposted.has(target),
      my_reaction: reactionMap.get(post.id) ?? null
    }
  })
}

export async function fetchFollowingFeed (
  supabase: SupabaseClient,
  userId: string
): Promise<SocialPost[]> {
  const { data: follows } = await supabase.from('follows').select('followee_id').eq('follower_id', userId)
  const authorIds = [userId, ...((follows ?? []).map((row) => row.followee_id as string))]
  const { data } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .is('deleted_at', null)
    .in('author_id', authorIds)
    .in('visibility', ['public', 'followers'])
    .order('created_at', { ascending: false })
    .limit(40)
  return attachViewerState(supabase, (data ?? []) as SocialPost[], userId)
}

export async function fetchForYouFeed (
  supabase: SupabaseClient,
  userId: string
): Promise<SocialPost[]> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const [{ data }, { data: follows }] = await Promise.all([
    supabase
      .from('posts')
      .select(POST_SELECT)
      .is('deleted_at', null)
      .eq('visibility', 'public')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('follows').select('followee_id').eq('follower_id', userId)
  ])
  const followSet = new Set((follows ?? []).map((row) => row.followee_id as string))
  const now = Date.now()
  const ranked = rankForYou(
    ((data ?? []) as SocialPost[]).map((post) => ({
      ...post,
      age_minutes: Math.max(0, (now - new Date(post.created_at).getTime()) / 60000),
      locality_boost: 0,
      follow_boost: followSet.has(post.author_id) ? 1 : 0
    }))
  ).slice(0, 30)
  return attachViewerState(supabase, ranked, userId)
}

export async function fetchPost (
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<SocialPost | null> {
  const { data } = await supabase.from('posts').select(POST_SELECT).eq('id', id).maybeSingle()
  if (!data || data.deleted_at) return null
  const [hydrated] = await attachViewerState(supabase, [data as SocialPost], userId)
  return hydrated ?? null
}

export async function fetchComments (supabase: SupabaseClient, postId: string): Promise<SocialComment[]> {
  const { data } = await supabase
    .from('comments')
    .select('id, post_id, author_id, body, parent_id, created_at, deleted_at')
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(100)
  return (data ?? []) as SocialComment[]
}

export async function fetchPostsByTag (
  supabase: SupabaseClient,
  tag: string,
  userId: string
): Promise<SocialPost[]> {
  const { data: links } = await supabase.from('post_hashtags').select('post_id').eq('tag', tag.toLowerCase()).limit(40)
  const ids = (links ?? []).map((row) => row.post_id as string)
  if (ids.length === 0) return []
  const { data } = await supabase.from('posts').select(POST_SELECT).in('id', ids).is('deleted_at', null)
  return attachViewerState(supabase, (data ?? []) as SocialPost[], userId)
}

export async function searchSocial (
  supabase: SupabaseClient,
  query: string,
  userId: string
): Promise<{ posts: SocialPost[]; handles: string[] }> {
  const q = query.trim()
  if (!q) return { posts: [], handles: [] }
  if (q.startsWith('#')) {
    return { posts: await fetchPostsByTag(supabase, q.slice(1), userId), handles: [] }
  }
  const [{ data: posts }, { data: profiles }] = await Promise.all([
    supabase.from('posts').select(POST_SELECT).is('deleted_at', null).ilike('body', `%${q}%`).limit(30),
    supabase.from('profiles').select('handle').or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`).limit(12)
  ])
  return {
    posts: await attachViewerState(supabase, (posts ?? []) as SocialPost[], userId),
    handles: (profiles ?? []).map((row) => row.handle as string)
  }
}

export async function fetchTrendingTags (supabase: SupabaseClient): Promise<{ tag: string; count: number }[]> {
  const { data } = await supabase.from('post_hashtags').select('tag').limit(200)
  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const tag = row.tag as string
    counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

export async function createPost (
  supabase: SupabaseClient,
  input: { authorId: string; body: string; visibility: PostVisibility; files?: File[] }
): Promise<{ error?: string }> {
  const body = input.body.trim()
  if (!body && !input.files?.length) return { error: 'Write something or attach a photo.' }
  if (body.length > 2000) return { error: 'Keep posts under 2000 characters.' }

  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: input.authorId, body, visibility: input.visibility })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not post.' }

  const tags = extractHashtags(body)
  for (const tag of tags) {
    await supabase.from('hashtags').insert({ tag })
    await supabase.from('post_hashtags').insert({ post_id: data.id, tag })
  }

  for (const file of input.files ?? []) {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    const path = `${input.authorId}/${Date.now()}-${ext}`
    const uploaded = await supabase.storage.from('post-media').upload(path, file, { contentType: file.type, upsert: false })
    if (uploaded.error) return { error: uploaded.error.message }
    await supabase.from('media').insert({
      post_id: data.id,
      kind: file.type.startsWith('video') ? 'video' : 'image',
      storage_path: path,
      mime: file.type
    })
  }
  return {}
}

export async function toggleLike (supabase: SupabaseClient, postId: string, userId: string, liked: boolean) {
  if (liked) {
    await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
    return
  }
  await supabase.from('likes').insert({ post_id: postId, user_id: userId })
}

export async function addComment (supabase: SupabaseClient, postId: string, userId: string, body: string) {
  const text = body.trim()
  if (!text) return { error: 'Write a comment.' }
  if (text.length > 500) return { error: 'Keep comments under 500 characters.' }
  const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: userId, body: text })
  return { error: error?.message }
}

export async function repost (supabase: SupabaseClient, post: SocialPost, userId: string) {
  const target = post.reposted_from ?? post.id
  if (post.reposted_by_me) return { error: 'You already reposted this.' }
  const { error } = await supabase.from('posts').insert({
    author_id: userId,
    body: '',
    visibility: 'public',
    reposted_from: target
  })
  return { error: error?.message }
}

export async function setReaction (
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  reaction: ReactionId | null
) {
  if (!reaction) {
    await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', userId)
    return
  }
  await supabase.from('post_reactions').upsert({ post_id: postId, user_id: userId, reaction })
}

export async function followUser (supabase: SupabaseClient, followerId: string, followeeId: string) {
  if (followerId === followeeId) return { error: 'You cannot follow yourself.' }
  const { error } = await supabase.from('follows').insert({ follower_id: followerId, followee_id: followeeId })
  return { error: error?.message }
}

export async function unfollowUser (supabase: SupabaseClient, followerId: string, followeeId: string) {
  const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('followee_id', followeeId)
  return { error: error?.message }
}

export async function isFollowing (supabase: SupabaseClient, followerId: string, followeeId: string) {
  const { data } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId)
    .maybeSingle()
  return Boolean(data)
}

export async function fetchLiveStatuses (supabase: SupabaseClient): Promise<SocialStatus[]> {
  const { data } = await supabase
    .from('statuses')
    .select('id, author_id, caption, visibility, ciphertext, created_at, expires_at')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(40)
  const statuses = (data ?? []) as SocialStatus[]
  if (statuses.length === 0) return statuses
  const { data: media } = await supabase
    .from('media')
    .select('id, post_id, status_id, kind, storage_path, mime')
    .in('status_id', statuses.map((s) => s.id))
  const byStatus = new Map<string, SocialMedia[]>()
  for (const row of (media ?? []) as SocialMedia[]) {
    if (!row.status_id) continue
    const list = byStatus.get(row.status_id) ?? []
    list.push(row)
    byStatus.set(row.status_id, list)
  }
  return statuses.map((status) => ({ ...status, media: byStatus.get(status.id) ?? [] }))
}

export async function createStatus (
  supabase: SupabaseClient,
  input: { authorId: string; caption: string; visibility: StatusVisibility; file?: File | null }
) {
  const caption = input.caption.trim()
  if (!caption && !input.file) return { error: 'Add a caption or a photo.' }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('statuses')
    .insert({
      author_id: input.authorId,
      caption,
      visibility: input.visibility,
      expires_at: expiresAt
    })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not post status.' }

  if (input.file) {
    const ext = input.file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${input.authorId}/${Date.now()}-status.${ext}`
    const uploaded = await supabase.storage.from('post-media').upload(path, input.file, {
      contentType: input.file.type,
      upsert: false
    })
    if (uploaded.error) return { error: uploaded.error.message }
    await supabase.from('media').insert({
      status_id: data.id,
      kind: input.file.type.startsWith('video') ? 'video' : 'image',
      storage_path: path,
      mime: input.file.type
    })
  }
  return {}
}

export async function blockUser (supabase: SupabaseClient, blockerId: string, blockedId: string) {
  await supabase.from('follows').delete().eq('follower_id', blockerId).eq('followee_id', blockedId)
  await supabase.from('follows').delete().eq('follower_id', blockedId).eq('followee_id', blockerId)
  const { error } = await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId })
  return { error: error?.message }
}

export async function muteUser (supabase: SupabaseClient, muterId: string, mutedId: string) {
  const { error } = await supabase.from('mutes').insert({ muter_id: muterId, muted_id: mutedId })
  return { error: error?.message }
}

export async function reportTarget (
  supabase: SupabaseClient,
  input: {
    reporterId: string
    targetKind: 'post' | 'comment' | 'profile' | 'message' | 'status'
    targetId: string
    reason: string
    detail?: string
  }
) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    target_kind: input.targetKind,
    target_id: input.targetId,
    reason: input.reason,
    detail: input.detail ?? null
  })
  return { error: error?.message }
}
