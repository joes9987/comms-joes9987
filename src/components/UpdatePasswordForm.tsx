'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

export function UpdatePasswordForm () {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit (event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    router.push('/app')
    router.refresh()
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <label className={ui.label}>
        New password
        <input
          required
          type="password"
          minLength={6}
          className={ui.field}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <label className={ui.label}>
        Confirm password
        <input
          required
          type="password"
          minLength={6}
          className={ui.field}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <button type="submit" disabled={loading} className={`w-full ${ui.btnPrimary}`}>
        {loading ? 'Saving…' : 'Update password'}
      </button>
      {error && <p className={ui.alertError}>{error}</p>}
    </form>
  )
}
