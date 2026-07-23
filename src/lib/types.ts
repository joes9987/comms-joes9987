export type Profile = {
  id: string
  email: string
  display_name: string
  handle: string
  is_admin: boolean
  created_at?: string
}

export type ChannelKind = 'public' | 'announcements'

export type Channel = {
  id: string
  name: string
  slug: string
  kind: ChannelKind
  archived_at: string | null
  created_by: string | null
  created_at: string
}

export type DmThread = {
  id: string
  user_a: string
  user_b: string
  created_at: string
}

export type Message = {
  id: string
  channel_id: string | null
  dm_thread_id: string | null
  author_id: string
  body: string
  created_at: string
}

export type NotificationType = 'dm' | 'mention'

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  message_id: string | null
  body: string
  read_at: string | null
  created_at: string
}

export function profileLabel (profile: Profile | undefined | null, fallback = 'Unknown'): string {
  if (!profile) return fallback
  return profile.display_name || profile.handle || fallback
}
