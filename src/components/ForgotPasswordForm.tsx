'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

export function ForgotPasswordForm () {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit (event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const origin = window.location.origin
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/callback?next=/auth/update-password`
    })

    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }

    setSuccess('If that email has an account, a reset link is on the way. Check your inbox.')
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <label className={ui.label}>
        Email
        <input
          required
          type="email"
          className={ui.field}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />
      </label>
      <button type="submit" disabled={loading} className={`w-full ${ui.btnPrimary}`}>
        {loading ? 'Sending…' : 'Send reset link'}
      </button>
      {success && <p className={ui.alertSuccess}>{success}</p>}
      {error && <p className={ui.alertError}>{error}</p>}
    </form>
  )
}
