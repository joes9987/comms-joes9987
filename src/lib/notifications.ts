import type { SupabaseClient } from '@supabase/supabase-js'
import type { Message, Notification, Profile } from '@/lib/types'

type CurrentUserLite = {
  id: string
  displayName: string
  handle: string
}

export async function createNotificationsForMessage (input: {
  supabase: SupabaseClient
  message: Message
  author: CurrentUserLite
  profiles: Profile[]
  mentionHandles: string[]
  isDm: boolean
}): Promise<void> {
  const { supabase, message, author, profiles, mentionHandles, isDm } = input
  const rows: Array<{
    user_id: string
    type: 'dm' | 'mention'
    message_id: string
    body: string
  }> = []

  if (isDm && message.dm_thread_id) {
    // Notify the peer (not the author) â€” resolved by caller via profiles if needed.
    // For DMs we notify whoever is not the author among thread members via a follow-up query.
    const { data: thread } = await supabase
      .from('dm_threads')
      .select('user_a, user_b')
      .eq('id', message.dm_thread_id)
      .maybeSingle()
    if (thread) {
      const peerId = thread.user_a === author.id ? thread.user_b : thread.user_a
      rows.push({
        user_id: peerId,
        type: 'dm',
        message_id: message.id,
        body: `${author.displayName} sent you a direct message`
      })
    }
  }

  for (const handle of mentionHandles) {
    const mentioned = profiles.find((p) => p.handle.toLowerCase() === handle)
    if (!mentioned || mentioned.id === author.id) continue
    if (rows.some((r) => r.user_id === mentioned.id && r.type === 'mention')) continue
    rows.push({
      user_id: mentioned.id,
      type: 'mention',
      message_id: message.id,
      body: `${author.displayName} mentioned @${mentioned.handle}`
    })
  }

  if (rows.length === 0) return
  await supabase.from('chat_notifications').insert(rows)
}

type NotificationRow = Notification & {
  message: {
    channel_id: string | null
    dm_thread_id: string | null
    channel: { slug: string } | null
  } | null
}

export type NotificationWithLink = Notification & { link: string | null }

function resolveLink (row: NotificationRow): string | null {
  const message = row.message
  if (!message) return null
  if (message.channel_id && message.channel) {
    return `/app/c/${message.channel.slug}`
  }
  if (message.dm_thread_id) {
    return `/app/dm/${message.dm_thread_id}`
  }
  return null
}

const NOTIFICATION_SELECT = '*, message:messages(channel_id, dm_thread_id, channel:channels(slug))'

export async function fetchUserNotifications (
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<NotificationWithLink[]> {
  const { data } = await supabase
    .from('chat_notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((data ?? []) as NotificationRow[]).map((row) => ({ ...row, link: resolveLink(row) }))
}

export async function fetchNotificationById (
  supabase: SupabaseClient,
  notificationId: string
): Promise<NotificationWithLink | null> {
  const { data } = await supabase
    .from('chat_notifications')
    .select(NOTIFICATION_SELECT)
    .eq('id', notificationId)
    .maybeSingle()

  if (!data) return null
  const row = data as NotificationRow
  return { ...row, link: resolveLink(row) }
}

export function formatRelativeTime (isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
