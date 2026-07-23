import Link from 'next/link'
import { AuthForm } from '@/components/AuthForm'
import { EudaChatLogo } from '@/components/brand/EudaChatLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ui } from '@/lib/ui'

export default function LoginPage () {
  return (
    <main className={`${ui.meshBg} relative flex min-h-screen flex-col justify-center px-4 py-16`}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className={`${ui.cardElevated} animate-fade-up`}>
          <div className="flex items-start justify-between gap-4">
            <Link href="/" className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--primary)]">
              ← Back to home
            </Link>
            <EudaChatLogo />
          </div>
          <p className={`${ui.eyebrow} mt-6`}>Welcome back</p>
          <h1 className={`${ui.pageTitle} mt-2`}>Sign in</h1>
          <p className={`${ui.pageSubtitle} mt-2`}>Rejoin the cohort conversation.</p>
          <div className="mt-6">
            <AuthForm mode="login" />
          </div>
        </div>
      </div>
    </main>
  )
}
