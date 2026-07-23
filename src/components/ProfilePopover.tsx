'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ProfileCard } from '@/components/ProfileCard'
import { useAppData } from '@/lib/app-context'
import { orderedPair } from '@/lib/chat-server'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { ui } from '@/lib/ui'

const CARD_WIDTH = 320
const CARD_EST_HEIGHT = 360

type AnchorRect = { top: number; left: number; bottom: number; right: number }

function positionFor (rect: AnchorRect) {
  let left = rect.left
  let top = rect.bottom + 8
  if (left + CARD_WIDTH > window.innerWidth - 8) left = window.innerWidth - CARD_WIDTH - 8
  if (left < 8) left = 8
  if (top + CARD_EST_HEIGHT > window.innerHeight - 8) top = rect.top - CARD_EST_HEIGHT - 8
  if (top < 8) top = 8
  return { top, left }
}

function ProfilePopoverPanel ({
  profile,
  anchor,
  onClose
}: {
  profile: Profile
  anchor: AnchorRect
  onClose: () => void
}) {
  const { currentUser } = useAppData()
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(() => positionFor(anchor))
  const [busy, setBusy] = useState(false)
  const isSelf = profile.id === currentUser.id
  const labelId = useId()

  useLayoutEffect(() => {
    setPos(positionFor(anchor))
  }, [anchor])

  useEffect(() => {
    function onKey (e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onPointer (e: MouseEvent) {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    // Defer so the opening click does not immediately close the panel
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', onPointer)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [onClose])

  async function messageUser () {
    if (isSelf || busy) return
    setBusy(true)
    const supabase = createClient()
    const [userA, userB] = orderedPair(currentUser.id, profile.id)
    const { data: existing } = await supabase
      .from('dm_threads')
      .select('id')
      .eq('user_a', userA)
      .eq('user_b', userB)
      .maybeSingle()

    let threadId = existing?.id as string | undefined
    if (!threadId) {
      const { data: created, error } = await supabase
        .from('dm_threads')
        .insert({ user_a: userA, user_b: userB })
        .select('id')
        .single()
      if (error) {
        setBusy(false)
        return
      }
      threadId = created.id
    }
    setBusy(false)
    onClose()
    router.push(`/app/dm/${threadId}`)
    router.refresh()
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={labelId}
      className="surface-elevated fixed z-50 w-80 overflow-hidden rounded-2xl animate-fade-up"
      style={{ top: pos.top, left: pos.left }}
    >
      <span id={labelId} className="sr-only">
        Profile for {profile.display_name}
      </span>
      <ProfileCard
        profile={profile}
        footer={
          <>
            {isSelf ? (
              <Link href="/app/profile" className={ui.btnPrimary} onClick={onClose}>
                Edit profile
              </Link>
            ) : (
              <button
                type="button"
                className={ui.btnPrimary}
                disabled={busy}
                onClick={() => void messageUser()}
              >
                {busy ? 'Opening…' : 'Message'}
              </button>
            )}
            <button type="button" className={ui.btnGhost} onClick={onClose}>
              Close
            </button>
          </>
        }
      />
    </div>,
    document.body
  )
}

type ProfileTriggerProps = {
  profile?: Profile | null
  children: ReactNode
  className?: string
  /** When nested in a link, prevent the parent navigation. */
  stopNavigation?: boolean
}

export function ProfileTrigger ({ profile, children, className = '', stopNavigation = false }: ProfileTriggerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<AnchorRect | null>(null)
  const close = useCallback(() => setOpen(false), [])

  if (!profile) {
    return <span className={className}>{children}</span>
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`inline-flex max-w-full items-center rounded-sm text-left transition hover:opacity-90 ${className}`}
        onClick={(e) => {
          if (stopNavigation) {
            e.preventDefault()
            e.stopPropagation()
          }
          const rect = triggerRef.current?.getBoundingClientRect()
          if (!rect) return
          setAnchor({
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
          })
          setOpen((v) => !v)
        }}
      >
        {children}
      </button>
      {open && anchor && (
        <ProfilePopoverPanel profile={profile} anchor={anchor} onClose={close} />
      )}
    </>
  )
}

/** Resolve a @handle mention to a profile and open the popover. */
export function MentionChip ({ text }: { text: string }) {
  const { profiles } = useAppData()
  const handle = text.replace(/^@/, '').toLowerCase()
  const profile = profiles.find((p) => p.handle.toLowerCase() === handle)

  if (!profile) {
    return <span className="mention-chip">{text}</span>
  }

  return (
    <ProfileTrigger profile={profile} className="mention-chip px-0.5 font-semibold align-baseline">
      {text}
    </ProfileTrigger>
  )
}
