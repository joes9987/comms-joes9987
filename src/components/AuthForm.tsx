'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

export function AuthForm ({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit (event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split('@')[0] }
        }
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
    }

    router.push('/app')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'signup' && (
        <label className={ui.label}>
          Display name
          <input
            className={ui.field}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Joseph Singh"
          />
        </label>
      )}
      <label className={ui.label}>
        Email
        <input
          required
          type="email"
          className={ui.field}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <label className={ui.label}>
        Password
        <input
          required
          type="password"
          minLength={6}
          className={ui.field}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {mode === 'login' && (
        <p className="text-sm">
          <Link href="/forgot-password" className={ui.linkAccent}>
            Forgot password?
          </Link>
        </p>
      )}
      {error && <p className={ui.alertError}>{error}</p>}
      <button type="submit" disabled={loading} className={`w-full ${ui.btnPrimary}`}>
        {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>
      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {mode === 'signup' ? (
          <>Already have an account? <Link href="/login" className={ui.linkAccent}>Sign in</Link></>
        ) : (
          <>
            Need an account? <Link href="/signup" className={ui.linkAccent}>Sign up</Link>
            {' · '}
            Same account as EudaPM / EudaMarket.
          </>
        )}
      </p>
    </form>
  )
}
