'use client'

import { useState } from 'react'
import { followUser, unfollowUser } from '@/lib/social'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

export function FollowButton ({
  followerId,
  followeeId,
  initiallyFollowing
}: {
  followerId: string
  followeeId: string
  initiallyFollowing: boolean
}) {
  const [following, setFollowing] = useState(initiallyFollowing)
  const [error, setError] = useState<string | null>(null)

  if (followerId === followeeId) return null

  async function toggle () {
    const supabase = createClient()
    const result = following
      ? await unfollowUser(supabase, followerId, followeeId)
      : await followUser(supabase, followerId, followeeId)
    if (result.error) {
      setError(result.error)
      return
    }
    setFollowing(!following)
    setError(null)
  }

  return (
    <div>
      <button type="button" className={following ? ui.btnGhost : ui.btnPrimary} onClick={() => void toggle()}>
        {following ? 'Unfollow' : 'Follow'}
      </button>
      {error && <p className={`mt-2 ${ui.alertError}`}>{error}</p>}
    </div>
  )
}
