import { redirect } from 'next/navigation'
import { AppChrome } from '@/components/AppChrome'
import { AppDataProvider } from '@/lib/app-context'
import { getChannels, getDmThreads, getProfiles } from '@/lib/chat-server'
import { fetchUserNotifications } from '@/lib/notifications'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { ui } from '@/lib/ui'
import type { Profile } from '@/lib/types'

export default async function AppLayout ({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <main className={`${ui.meshBg} mx-auto max-w-3xl px-4 py-16`}>
        <h1 className={ui.pageTitle}>EudaChat is not configured</h1>
        <p className={`mt-2 ${ui.pageSubtitle}`}>
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth and chat.
        </p>
      </main>
    )
  }

  const supabase = await createClient()
  if (!supabase) redirect('/login')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profiles, channels, dmThreads, notifications] = await Promise.all([
    getProfiles(supabase),
    getChannels(supabase),
    getDmThreads(supabase, user.id),
    fetchUserNotifications(supabase, user.id)
  ])

  let profile = profiles.find((p) => p.id === user.id) as Profile | undefined
  if (!profile) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    profile = (data ?? undefined) as Profile | undefined
  }

  const currentUser = {
    id: user.id,
    email: user.email ?? '',
    displayName: profile?.display_name ?? user.email?.split('@')[0] ?? 'You',
    handle: profile?.handle ?? 'you',
    isAdmin: profile?.is_admin ?? false
  }

  return (
    <AppDataProvider currentUser={currentUser} profiles={profiles}>
      <AppChrome channels={channels} dmThreads={dmThreads} initialNotifications={notifications}>
        {children}
      </AppChrome>
    </AppDataProvider>
  )
}
