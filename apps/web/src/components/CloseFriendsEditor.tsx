'use client'

import { useEffect, useState } from 'react'
import { useAppData } from '@/lib/app-context'
import { createClient } from '@/lib/supabase/client'
import { profileLabel } from '@/lib/types'
import { ui } from '@/lib/ui'

export function CloseFriendsEditor () {
  const { currentUser, profiles } = useAppData()
  const [friendIds, setFriendIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void createClient()
      .from('close_friends')
      .select('friend_id')
      .eq('owner_id', currentUser.id)
      .then(({ data, error: loadError }) => {
        if (loadError) setError(loadError.message)
        else setFriendIds((data ?? []).map((row) => row.friend_id as string))
      })
  }, [currentUser.id])

  async function toggle (friendId: string) {
    const supabase = createClient()
    const isFriend = friendIds.includes(friendId)
    const result = isFriend
      ? await supabase.from('close_friends').delete().eq('owner_id', currentUser.id).eq('friend_id', friendId)
      : await supabase.from('close_friends').insert({ owner_id: currentUser.id, friend_id: friendId })
    if (result.error) {
      setError(result.error.message)
      return
    }
    setFriendIds((ids) => isFriend ? ids.filter((id) => id !== friendId) : [...ids, friendId])
  }

  return (
    <section className={`${ui.card} mt-4`}>
      <p className={ui.sectionTitle}>Close friends</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Close-friends posts and statuses are only visible to people on this list.
      </p>
      {error && <p className={`mt-2 ${ui.alertError}`}>{error}</p>}
      <ul className="mt-3 space-y-1">
        {profiles.filter((p) => p.id !== currentUser.id).map((profile) => (
          <li key={profile.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={friendIds.includes(profile.id)}
                onChange={() => void toggle(profile.id)}
              />
              {profileLabel(profile)} <span className="text-[var(--muted)]">@{profile.handle}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
