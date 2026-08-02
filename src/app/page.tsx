import Link from 'next/link'
import { redirect } from 'next/navigation'
import { EudaChatLogo } from '@/components/brand/EudaChatLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { ui } from '@/lib/ui'

export default async function HomePage () {
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) redirect('/app')
    }
  }

  return (
    <main className={`${ui.meshBg} relative flex min-h-screen flex-col`}>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-3">
          <EudaChatLogo />
          <span className="font-display text-lg font-bold tracking-tight">
            <span className="text-gradient">EudaChat</span>
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className={ui.btnGhost}>Sign in</Link>
          <Link href="/signup" className={ui.btnPrimary}>Sign up</Link>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className={`${ui.eyebrow} animate-fade-up`}>Hult Cohort — internal comms</p>
        <h1 className="font-display animate-fade-up mt-4 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          One place for the cohort to talk.
        </h1>
        <p className="animate-fade-up mt-5 max-w-xl text-base text-[var(--muted-foreground)]">
          Channels for the whole cohort, direct messages for the quiet conversations,
          announcements from staff, and search across everything you&rsquo;re part of.
        </p>
        <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className={ui.btnPrimaryLg}>Create your account</Link>
          <Link href="/login" className={ui.btnSecondary}>I already have one</Link>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          <div className={`${ui.cardSm} animate-fade-up text-left`}>
            <p className={ui.metricLabel}>Channels</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              #general, #random, #help — plus Announcements from staff.
            </p>
          </div>
          <div className={`${ui.cardSm} animate-fade-up text-left`}>
            <p className={ui.metricLabel}>Direct messages</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              1:1 threads with any cohort member, notified in real time.
            </p>
          </div>
          <div className={`${ui.cardSm} animate-fade-up text-left`}>
            <p className={ui.metricLabel}>Search &amp; mentions</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Find any message by keyword, get notified when @mentioned.
            </p>
          </div>
        </div>

        <p className="animate-fade-up mt-12 max-w-lg text-sm text-[var(--muted-foreground)]">
          Same cohort identity as{' '}
          <a className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline" href="https://pm-joes9987.vercel.app" target="_blank" rel="noreferrer">EudaPM</a>
          {' '}and{' '}
          <a className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline" href="https://showcase-joes9987.vercel.app" target="_blank" rel="noreferrer">EudaMarket</a>
          . Work tracking for the cohort lives on{' '}
          <a className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline" href="https://forth-bice.vercel.app" target="_blank" rel="noreferrer">Forth</a>
          {' '}(winner PM) — Chat is where the conversation happens.
        </p>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-[var(--muted)]">
        <p>Built for the Hult Cohort Program · Euda suite + Forth</p>
        <p className="flex flex-wrap justify-center gap-3">
          <a className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline" href="https://pm-joes9987.vercel.app" target="_blank" rel="noreferrer">
            EudaPM
          </a>
          <a className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline" href="https://showcase-joes9987.vercel.app" target="_blank" rel="noreferrer">
            EudaMarket
          </a>
          <a className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline" href="https://forth-bice.vercel.app" target="_blank" rel="noreferrer">
            Forth
          </a>
        </p>
      </footer>
    </main>
  )
}
