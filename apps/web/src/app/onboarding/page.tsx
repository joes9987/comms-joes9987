import Link from 'next/link'
import { redirect } from 'next/navigation'
import { EudaChatLogo } from '@/components/brand/EudaChatLogo'
import { OnboardingForm } from '@/components/OnboardingForm'
import { ThemeToggle } from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase/server'
import { ui } from '@/lib/ui'
import type { Profile } from '@/lib/types'

export default async function OnboardingPage () {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!data) redirect('/app')

  return (
    <main id="main-content" tabIndex={-1} className={`${ui.meshBg} relative flex min-h-screen flex-col justify-center px-4 py-16`}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className={`${ui.cardElevated} animate-fade-up`}>
          <div className="flex items-start justify-between gap-4">
            <Link href="/app" className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--primary)]">
              Skip to chat
            </Link>
            <EudaChatLogo />
          </div>
          <p className={`${ui.eyebrow} mt-6`}>Almost there</p>
          <h1 className={`${ui.pageTitle} mt-2`}>Finish your profile</h1>
          <p className={`${ui.pageSubtitle} mt-2`}>
            Confirm how you want to show up. Trinidadian Creole is optional and off by default.
          </p>
          <OnboardingForm profile={data as Profile} />
        </div>
      </div>
    </main>
  )
}
