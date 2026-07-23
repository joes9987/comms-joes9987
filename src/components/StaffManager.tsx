'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAppData } from '@/lib/app-context'
import { createClient } from '@/lib/supabase/client'
import { profileLabel, type Profile } from '@/lib/types'
import { ui } from '@/lib/ui'

export function StaffManager ({ profiles }: { profiles: Profile[] }) {
  const { currentUser } = useAppData()
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!currentUser.isAdmin) {
    return (
      <div className="p-6">
        <p className={ui.alertWarning}>Only staff can manage staff roles.</p>
      </div>
    )
  }

  const sorted = [...profiles].sort((a, b) => {
    if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1
    return profileLabel(a).localeCompare(profileLabel(b))
  })

  async function setStaff (profile: Profile, nextAdmin: boolean) {
    if (busyId) return
    setError(null)
    setBusyId(profile.id)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: nextAdmin })
      .eq('id', profile.id)
    setBusyId(null)
    if (updateError) {
      setError(updateError.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col px-5 py-6 md:min-h-screen">
      <header className="mb-6">
        <p className={ui.eyebrow}>Staff</p>
        <h1 className="font-display mt-1 text-2xl font-semibold">Manage staff</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted-foreground)]">
          Staff can post in <span className="font-medium text-[var(--foreground)]">#announcements</span>.
          Grant or revoke access for any cohort member. At least one staff account must remain.
        </p>
      </header>

      {error && <p className={`mb-4 ${ui.alertError}`}>{error}</p>}

      <ul className="divide-y divide-[var(--border)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card-solid)]">
        {sorted.map((profile) => {
          const isYou = profile.id === currentUser.id
          const busy = busyId === profile.id
          return (
            <li key={profile.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--foreground)]">
                  {profileLabel(profile)}
                  {isYou && <span className="ml-2 text-xs text-[var(--muted)]">(you)</span>}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  @{profile.handle} · {profile.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {profile.is_admin ? (
                  <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-foreground)]">
                    Staff
                  </span>
                ) : (
                  <span className="rounded-full bg-[var(--nav-active)] px-2.5 py-1 text-xs font-medium text-[var(--nav-active-fg)]">
                    Member
                  </span>
                )}
                {profile.is_admin ? (
                  <button
                    type="button"
                    disabled={busy}
                    className={ui.btnGhost}
                    onClick={() => void setStaff(profile, false)}
                  >
                    {busy ? '…' : 'Remove staff'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    className={ui.btnPrimary}
                    onClick={() => void setStaff(profile, true)}
                  >
                    {busy ? '…' : 'Make staff'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
