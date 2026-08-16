'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

export function GoogleAuthButton ({ next = '/onboarding' }: { next?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle () {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void signInWithGoogle()}
        className={`flex w-full items-center justify-center gap-2 ${ui.btnSecondary}`}
      >
        <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-strong)] text-xs font-bold">
          G
        </span>
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>
      {error && (
        <p role="alert" className={ui.alertError}>
          {error}
        </p>
      )}
    </div>
  )
}
