import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm'
import { EudaChatLogo } from '@/components/brand/EudaChatLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ui } from '@/lib/ui'

export default function ForgotPasswordPage () {
  return (
    <main className={`${ui.meshBg} relative flex min-h-screen flex-col justify-center px-4 py-16`}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className={`${ui.cardElevated} animate-fade-up`}>
          <div className="flex items-start justify-between gap-4">
            <Link href="/login" className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--primary)]">
              ← Back to sign in
            </Link>
            <EudaChatLogo />
          </div>
          <p className={`${ui.eyebrow} mt-6`}>Account recovery</p>
          <h1 className={`${ui.pageTitle} mt-2`}>Reset password</h1>
          <p className={`${ui.pageSubtitle} mt-2`}>
            Same account as EudaPM / EudaMarket. We email a reset link for this host.
          </p>
          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </main>
  )
}
