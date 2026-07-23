'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageComposer, useMessageSender } from '@/components/MessageComposer'
import { useAppData } from '@/lib/app-context'
import { splitMentions } from '@/lib/mentions'
import { createClient } from '@/lib/supabase/client'
import { profileLabel, type Message } from '@/lib/types'
import { ui } from '@/lib/ui'

type ChannelTarget = { type: 'channel'; id: string; name: string; slug: string; announcements: boolean; archived: boolean }
type DmTarget = { type: 'dm'; id: string; peerName: string }

type MessageThreadProps = {
  target: ChannelTarget | DmTarget
  initialMessages: Message[]
}

function formatTimestamp (iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function MessageThread ({ target, initialMessages }: MessageThreadProps) {
  const { currentUser, profileMap } = useAppData()
  const [messages, setMessages] = useState(initialMessages)
  const sender = useMessageSender()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const filter = target.type === 'channel' ? `channel_id=eq.${target.id}` : `dm_thread_id=eq.${target.id}`
    const channel = supabase
      .channel(`messages-${target.type}-${target.id}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        (payload) => {
          const row = payload.new as Message
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [target.type, target.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const canPost = target.type === 'dm' || (!target.archived && (!target.announcements || currentUser.isAdmin))
  const readOnlyReason = target.type === 'channel'
    ? target.archived
      ? 'This channel is archived. New messages are disabled.'
      : target.announcements && !currentUser.isAdmin
        ? 'Only staff can post in Announcements.'
        : null
    : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-[var(--muted)]">
            No messages yet. Say hello{target.type === 'dm' ? ` to ${target.peerName}` : ''}.
          </p>
        )}
        <ul className="space-y-4">
          {messages.map((message) => {
            const author = profileMap[message.author_id]
            const isSelf = message.author_id === currentUser.id
            return (
              <li key={message.id} className="flex gap-3">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--nav-active)', color: 'var(--nav-active-fg)' }}
                  aria-hidden="true"
                >
                  {profileLabel(author, '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {isSelf ? 'You' : profileLabel(author)}
                    </span>
                    <time className="font-mono text-xs text-[var(--muted)]">{formatTimestamp(message.created_at)}</time>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-[var(--card-foreground)]">
                    {splitMentions(message.body).map((segment, i) =>
                      segment.mention ? (
                        <span key={i} className="mention-chip">{segment.text}</span>
                      ) : (
                        <span key={i}>{segment.text}</span>
                      )
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
        <div ref={bottomRef} />
      </div>

      {canPost ? (
        <MessageComposer
          placeholder={target.type === 'dm' ? `Message ${target.peerName}` : `Message #${target.slug}`}
          onSend={(body) =>
            target.type === 'channel'
              ? sender.sendChannelMessage(target.id, currentUser.id, body)
              : sender.sendDmMessage(target.id, currentUser.id, body)
          }
        />
      ) : (
        <div className={`${ui.alertWarning} m-4`}>{readOnlyReason}</div>
      )}
    </div>
  )
}
