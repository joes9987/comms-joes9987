import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UpdatePasswordForm } from '@/components/UpdatePasswordForm'
import { EudaChatLogo } from '@/components/brand/EudaChatLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { ui } from '@/lib/ui'

export default async function UpdatePasswordPage () {
  if (!isSupabaseConfigured()) redirect('/forgot-password')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/forgot-password')

  return (
    <main className={`${ui.meshBg} relative flex min-h-screen flex-col justify-center px-4 py-16`}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className={`${ui.cardElevated} animate-fade-up`}>
          <div className="flex items-start justify-between gap-4">
            <Link href="/login" className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--primary)]">
              ← Sign in
            </Link>
            <EudaChatLogo />
          </div>
          <p className={`${ui.eyebrow} mt-6`}>Account recovery</p>
          <h1 className={`${ui.pageTitle} mt-2`}>Set a new password</h1>
          <p className={`${ui.pageSubtitle} mt-2`}>
            Signed in as {user.email}. This updates the shared suite password.
          </p>
          <div className="mt-6">
            <UpdatePasswordForm />
          </div>
        </div>
      </div>
    </main>
  )
}
