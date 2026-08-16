import { createClient } from '@/lib/supabase/client'

/** Registers a web push token when NEXT_PUBLIC_VAPID_PUBLIC_KEY is set. */
export async function registerWebPush (userId: string) {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapid || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { skipped: true as const }
  }
  const registration = await navigator.serviceWorker.register('/sw.js')
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapid
  })
  const supabase = createClient()
  const { error } = await supabase.from('push_tokens').upsert({
    user_id: userId,
    token: JSON.stringify(subscription),
    platform: 'web'
  })
  return { skipped: false as const, error: error?.message }
}
