'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { parseLocale, type Locale } from '@/lib/locale'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'
import type { Profile } from '@/lib/types'

export function OnboardingForm ({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [useCreole, setUseCreole] = useState(parseLocale(profile.locale) === 'tcr')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function save (locale: Locale) {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || profile.display_name,
        locale
      })
      .eq('id', profile.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/app')
    router.refresh()
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void save(useCreole ? 'tcr' : 'en')
      }}
    >
      <label className={ui.label}>
        Display name
        <input
          required
          className={ui.field}
          value={displayName}
          maxLength={80}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="nickname"
        />
      </label>
      <label className="flex items-start gap-3 text-sm text-[var(--muted-foreground)]">
        <input
          type="checkbox"
          className="mt-1"
          checked={useCreole}
          onChange={(e) => setUseCreole(e.target.checked)}
        />
        <span>
          Use Trinidadian Creole in the product when it is available.
          English stays the default if you leave this off. You can change it later in profile.
        </span>
      </label>
      {error && (
        <p role="alert" className={ui.alertError}>
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className={`w-full ${ui.btnPrimary}`}>
        {loading ? 'Saving…' : 'Continue'}
      </button>
      <button
        type="button"
        disabled={loading}
        className={`w-full ${ui.btnSecondary}`}
        onClick={() => void save('en')}
      >
        Skip for now
      </button>
    </form>
  )
}
