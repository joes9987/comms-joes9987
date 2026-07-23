'use client'

import { useRef, useState } from 'react'
import { useAppData } from '@/lib/app-context'
import { activeMentionQuery } from '@/lib/mentions'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

type MessageComposerProps = {
  placeholder: string
  onSend: (body: string) => Promise<{ error: string | null }>
}

export function MessageComposer ({ placeholder, onSend }: MessageComposerProps) {
  const { profiles } = useAppData()
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mentionMenu, setMentionMenu] = useState<{ start: number; query: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const mentionMatches = mentionMenu
    ? profiles.filter((p) => p.handle.toLowerCase().startsWith(mentionMenu.query.toLowerCase())).slice(0, 6)
    : []

  function handleChange (next: string, caret: number) {
    setValue(next)
    setMentionMenu(activeMentionQuery(next, caret))
  }

  function insertMention (handle: string) {
    if (!mentionMenu) return
    const before = value.slice(0, mentionMenu.start)
    const after = value.slice(mentionMenu.start + 1 + mentionMenu.query.length)
    const next = `${before}@${handle} ${after}`
    setValue(next)
    setMentionMenu(null)
    textareaRef.current?.focus()
  }

  async function submit () {
    const body = value.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    const result = await onSend(body)
    setSending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setValue('')
    setMentionMenu(null)
  }

  return (
    <div className="relative border-t border-[var(--border)] bg-[var(--card-solid)] p-4">
      {mentionMenu && mentionMatches.length > 0 && (
        <div className="surface-elevated absolute bottom-full left-4 z-20 mb-2 w-56 overflow-hidden rounded-xl">
          {mentionMatches.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => insertMention(profile.handle)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--nav-active)]"
            >
              <span className="font-medium text-[var(--foreground)]">{profile.display_name}</span>
              <span className="font-mono text-xs text-[var(--muted)]">@{profile.handle}</span>
            </button>
          ))}
        </div>
      )}
      {error && <p className={`${ui.alertError} mb-2`}>{error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          placeholder={placeholder}
          className={`${ui.field} max-h-32 resize-none`}
          onChange={(e) => handleChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !mentionMenu) {
              e.preventDefault()
              void submit()
            }
          }}
        />
        <button
          type="button"
          disabled={sending || !value.trim()}
          onClick={() => void submit()}
          className={ui.btnPrimary}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-[var(--muted)]">Enter to send · Shift+Enter for a new line · @handle to mention</p>
    </div>
  )
}

export function useMessageSender () {
  return {
    async sendChannelMessage (channelId: string, authorId: string, body: string) {
      const supabase = createClient()
      const { error } = await supabase.from('messages').insert({ channel_id: channelId, author_id: authorId, body })
      return { error: error?.message ?? null }
    },
    async sendDmMessage (dmThreadId: string, authorId: string, body: string) {
      const supabase = createClient()
      const { error } = await supabase.from('messages').insert({ dm_thread_id: dmThreadId, author_id: authorId, body })
      return { error: error?.message ?? null }
    }
  }
}
