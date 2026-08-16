'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TRINI_REACTIONS } from '@/lib/reactions'
import { Avatar } from '@/components/Avatar'
import { PostBody } from '@/components/feed/PostBody'
import { PostMedia } from '@/components/feed/PostMedia'
import { ReportMenu } from '@/components/moderation/ReportMenu'
import { useAppData } from '@/lib/app-context'
import { profileLabel } from '@/lib/types'
import { repost, setReaction, toggleLike } from '@/lib/social'
import type { ReactionId, SocialPost } from '@/lib/social-types'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

function timeAgo (iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function PostCard ({
  post,
  original,
  ttMode
}: {
  post: SocialPost
  original?: SocialPost | null
  ttMode?: boolean
}) {
  const { currentUser, profileMap } = useAppData()
  const [liked, setLiked] = useState(Boolean(post.liked_by_me))
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [repostCount, setRepostCount] = useState(post.repost_count)
  const [reposted, setReposted] = useState(Boolean(post.reposted_by_me))
  const [reaction, setLocalReaction] = useState<ReactionId | null>(post.my_reaction ?? null)
  const author = profileMap[post.author_id]
  const shown = original ?? post
  const shownAuthor = profileMap[shown.author_id]
  const targetId = post.reposted_from ?? post.id

  async function onLike () {
    const next = !liked
    setLiked(next)
    setLikeCount((n) => n + (next ? 1 : -1))
    await toggleLike(createClient(), targetId, currentUser.id, liked)
  }

  async function onRepost () {
    const result = await repost(createClient(), post, currentUser.id)
    if (!result.error) {
      setReposted(true)
      setRepostCount((n) => n + 1)
    }
  }

  async function onReact (id: ReactionId) {
    const next = reaction === id ? null : id
    setLocalReaction(next)
    await setReaction(createClient(), post.id, currentUser.id, next)
  }

  return (
    <article className={`${ui.cardSm} space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/app/u/${shownAuthor?.handle ?? shown.author_id}`} className="flex min-w-0 items-center gap-2">
          <Avatar profile={shownAuthor} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profileLabel(shownAuthor)}</p>
            <p className="text-xs text-[var(--muted)]">
              @{shownAuthor?.handle ?? 'member'} · {timeAgo(shown.created_at)}
            </p>
          </div>
        </Link>
        <ReportMenu
          actorId={currentUser.id}
          targetKind="post"
          targetId={post.id}
          subjectUserId={shown.author_id}
        />
      </div>
      {post.reposted_from && (
        <p className="text-xs text-[var(--muted)]">
          Reposted by {profileLabel(author)}
        </p>
      )}
      <PostBody body={shown.body} />
      <PostMedia media={shown.media ?? []} />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" className={ui.btnGhostSm} onClick={() => void onLike()}>
          {liked ? 'Liked' : 'Like'} · {Math.max(likeCount, 0)}
        </button>
        <Link href={`/app/p/${shown.id}`} className={ui.btnGhostSm}>
          Comment · {shown.comment_count}
        </Link>
        <button type="button" className={ui.btnGhostSm} disabled={reposted} onClick={() => void onRepost()}>
          {reposted ? 'Reposted' : 'Repost'} · {repostCount}
        </button>
      </div>
      {ttMode && (
        <div className="flex flex-wrap gap-1">
          {TRINI_REACTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${ui.btnGhostSm} ${reaction === item.id ? 'bg-[var(--nav-active)] text-[var(--nav-active-fg)]' : ''}`}
              onClick={() => void onReact(item.id)}
            >
              {item.emoji} {item.label}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}
