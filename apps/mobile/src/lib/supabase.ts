import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const CHUNK = 1800

/**
 * SecureStore adapter for Supabase Auth.
 * iOS keychain entries cap around 2KB, so session JSON is chunked.
 */
const ExpoSecureStoreAdapter = {
  async getItem (key: string) {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return null
      return localStorage.getItem(key)
    }

    const head = await SecureStore.getItemAsync(key)
    if (head == null) return null

    try {
      const parsed = JSON.parse(head) as { chunks?: number }
      if (typeof parsed?.chunks === 'number') {
        const parts: string[] = []
        for (let i = 0; i < parsed.chunks; i += 1) {
          const part = await SecureStore.getItemAsync(`${key}.${i}`)
          if (part == null) return null
          parts.push(part)
        }
        return parts.join('')
      }
    } catch {
      // value is a plain (un-chunked) string
    }

    return head
  },

  async setItem (key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value)
      return
    }

    if (value.length <= CHUNK) {
      await SecureStore.setItemAsync(key, value)
      return
    }

    const chunks = Math.ceil(value.length / CHUNK)
    await SecureStore.setItemAsync(key, JSON.stringify({ chunks }))
    for (let i = 0; i < chunks; i += 1) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK, (i + 1) * CHUNK)
      )
    }
  },

  async removeItem (key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key)
      return
    }

    const head = await SecureStore.getItemAsync(key)
    if (head) {
      try {
        const parsed = JSON.parse(head) as { chunks?: number }
        if (typeof parsed?.chunks === 'number') {
          for (let i = 0; i < parsed.chunks; i += 1) {
            await SecureStore.deleteItemAsync(`${key}.${i}`)
          }
        }
      } catch {
        // ignore parse errors on delete
      }
    }
    await SecureStore.deleteItemAsync(key)
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export function isSupabaseConfigured (): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  })
  : null

export function requireSupabase (): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (same project as apps/web).'
    )
  }
  return supabase
}
