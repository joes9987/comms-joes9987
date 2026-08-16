'use client'

import { useCallback, useEffect, useState } from 'react'
import { Composer } from '@/components/feed/Composer'
import { PostCard } from '@/components/feed/PostCard'
import { StatusRing } from '@/components/status/StatusRing'
import { useAppData } from '@/lib/app-context'
import { parseLocale } from '@/lib/locale'
import { fetchFollowingFeed, fetchForYouFeed, fetchLiveStatuses, fetchPost } from '@/lib/social'
import type { SocialPost, SocialStatus } from '@/lib/social-types'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

export function FeedHome ({
  initialTab,
  initialPosts,
  initialStatuses
}: {
  initialTab: 'for_you' | 'following'
  initialPosts: SocialPost[]
  initialStatuses: SocialStatus[]
}) {
  const { currentUser, profileMap } = useAppData()
  const [tab, setTab] = useState(initialTab)
  const [posts, setPosts] = useState(initialPosts)
  const [originals, setOriginals] = useState<Record<string, SocialPost>>({})
  const [statuses, setStatuses] = useState(initialStatuses)
  const ttMode = parseLocale(profileMap[currentUser.id]?.locale) === 'tcr'

  const reload = useCallback(async (nextTab = tab) => {
    const supabase = createClient()
    const [nextPosts, nextStatuses] = await Promise.all([
      nextTab === 'following'
        ? fetchFollowingFeed(supabase, currentUser.id)
        : fetchForYouFeed(supabase, currentUser.id),
      fetchLiveStatuses(supabase)
    ])
    setPosts(nextPosts)
    setStatuses(nextStatuses)
  }, [currentUser.id, tab])

  useEffect(() => {
    const missing = posts
      .map((p) => p.reposted_from)
      .filter((id): id is string => typeof id === 'string' && !originals[id])
    if (missing.length === 0) return
    const supabase = createClient()
    void Promise.all(missing.map((id) => fetchPost(supabase, id, currentUser.id))).then((found) => {
      setOriginals((prev) => {
        const next = { ...prev }
        for (const post of found) {
          if (post) next[post.id] = post
        }
        return next
      })
    })
  }, [posts, originals, currentUser.id])

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <p className={ui.eyebrow}>Social</p>
      <h1 className={ui.pageTitle}>Feed</h1>
      <StatusRing statuses={statuses} />
      <Composer authorId={currentUser.id} onPosted={() => void reload(tab)} />
      <div className="flex gap-2">
        <button
          type="button"
          className={tab === 'for_you' ? ui.btnPrimary : ui.btnGhost}
          onClick={() => {
            setTab('for_you')
            void reload('for_you')
          }}
        >
          For you
        </button>
        <button
          type="button"
          className={tab === 'following' ? ui.btnPrimary : ui.btnGhost}
          onClick={() => {
            setTab('following')
            void reload('following')
          }}
        >
          Following
        </button>
      </div>
      {posts.length === 0 ? (
        <p className={ui.pageSubtitle}>Quiet so far. Post something, or follow a few people.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              original={post.reposted_from ? originals[post.reposted_from] : null}
              ttMode={ttMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
