import type { SupabaseClient } from '@supabase/supabase-js'
import type { Channel, DmThread, Message, Profile } from '@/lib/types'

export async function getProfiles (supabase: SupabaseClient): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('display_name')
  return (data ?? []) as Profile[]
}

export function toProfileMap (profiles: Profile[]): Record<string, Profile> {
  const map: Record<string, Profile> = {}
  for (const profile of profiles) map[profile.id] = profile
  return map
}

export async function getChannels (supabase: SupabaseClient): Promise<Channel[]> {
  const { data } = await supabase
    .from('channels')
    .select('*')
    .order('created_at', { ascending: true })
  return (data ?? []) as Channel[]
}

export async function getDmThreads (supabase: SupabaseClient, userId: string): Promise<DmThread[]> {
  const { data } = await supabase
    .from('dm_threads')
    .select('*')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('created_at', { ascending: false })
  return (data ?? []) as DmThread[]
}

export function peerIdOf (thread: DmThread, currentUserId: string): string {
  return thread.user_a === currentUserId ? thread.user_b : thread.user_a
}

export async function getChannelMessages (
  supabase: SupabaseClient,
  channelId: string,
  limit = 50
): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return ((data ?? []) as Message[]).reverse()
}

export async function getDmMessages (
  supabase: SupabaseClient,
  dmThreadId: string,
  limit = 50
): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('dm_thread_id', dmThreadId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return ((data ?? []) as Message[]).reverse()
}

export function slugify (value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function orderedPair (a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}
