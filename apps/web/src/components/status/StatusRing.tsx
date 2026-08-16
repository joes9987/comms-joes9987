'use client'

import Link from 'next/link'
import { Avatar } from '@/components/Avatar'
import { useAppData } from '@/lib/app-context'
import type { SocialStatus } from '@/lib/social-types'
import { profileLabel } from '@/lib/types'

export function StatusRing ({ statuses }: { statuses: SocialStatus[] }) {
  const { currentUser, profileMap } = useAppData()
  const byAuthor = new Map<string, SocialStatus[]>()
  for (const status of statuses) {
    const list = byAuthor.get(status.author_id) ?? []
    list.push(status)
    byAuthor.set(status.author_id, list)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      <Link
        href="/app/status/new"
        className="flex w-16 shrink-0 flex-col items-center gap-1 text-center text-xs text-[var(--muted)]"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-[var(--border-strong)] text-lg">
          +
        </span>
        Your status
      </Link>
      {[...byAuthor.entries()].map(([authorId, items]) => {
        const profile = profileMap[authorId]
        const latest = items[0]
        const close = items.some((item) => item.visibility === 'close_friends')
        return (
          <Link
            key={authorId}
            href={`/app/status/${latest.id}`}
            className="flex w-16 shrink-0 flex-col items-center gap-1 text-center text-xs text-[var(--muted)]"
          >
            <span
              className={`rounded-full p-0.5 ${close ? 'bg-[var(--highlight)]' : 'bg-[var(--primary)]'}`}
            >
              <Avatar profile={profile} size="md" />
            </span>
            <span className="w-full truncate">
              {authorId === currentUser.id ? 'You' : profileLabel(profile)}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
