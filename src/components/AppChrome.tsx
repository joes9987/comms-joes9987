'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { NotificationBell } from '@/components/NotificationBell'
import { ThemeToggle } from '@/components/ThemeToggle'
import { EudaChatLogo } from '@/components/brand/EudaChatLogo'
import { useAppData } from '@/lib/app-context'
import { orderedPair, slugify } from '@/lib/chat-server'
import type { NotificationWithLink } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/client'
import { profileLabel, type Channel, type DmThread } from '@/lib/types'
import { ui } from '@/lib/ui'

type AppChromeProps = {
  channels: Channel[]
  dmThreads: DmThread[]
  initialNotifications: NotificationWithLink[]
  children: React.ReactNode
}

function SignOutButton () {
  const router = useRouter()

  async function signOut () {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button type="button" onClick={() => void signOut()} className={ui.btnGhost}>
      Sign out
    </button>
  )
}

function ChannelRow ({ channel }: { channel: Channel }) {
  const { currentUser } = useAppData()
  const router = useRouter()
  const pathname = usePathname()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(channel.name)
  const [busy, setBusy] = useState(false)

  const active = pathname === `/app/c/${channel.slug}`
  const canManage = currentUser.isAdmin || currentUser.id === channel.created_by

  async function rename () {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('channels').update({ name: trimmed }).eq('id', channel.id)
    setBusy(false)
    if (!error) {
      setEditing(false)
      router.refresh()
    }
  }

  async function toggleArchive () {
    if (busy) return
    setBusy(true)
    const supabase = createClient()
    const nextValue = channel.archived_at ? null : new Date().toISOString()
    const { error } = await supabase.from('channels').update({ archived_at: nextValue }).eq('id', channel.id)
    setBusy(false)
    if (!error) router.refresh()
  }

  if (editing) {
    return (
      <li className="flex items-center gap-1 px-1">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void rename()
            if (e.key === 'Escape') setEditing(false)
          }}
          className={`${ui.field} mt-0 py-1 text-sm`}
        />
        <button type="button" onClick={() => void rename()} className={ui.btnGhostSm} disabled={busy}>Save</button>
      </li>
    )
  }

  return (
    <li className="group flex items-center justify-between gap-1">
      <Link
        href={`/app/c/${channel.slug}`}
        className={`${ui.navLink} min-w-0 flex-1 truncate ${active ? ui.navLinkActive : ''}`}
      >
        <span className="truncate">
          {channel.kind === 'announcements' ? '📣 ' : '# '}{channel.name}
        </span>
        {channel.archived_at && <span className="ml-1 shrink-0 text-xs text-[var(--muted)]">(archived)</span>}
      </Link>
      {canManage && (
        <span className="hidden shrink-0 gap-1 group-hover:flex">
          <button type="button" onClick={() => setEditing(true)} className={ui.btnGhostSm} title="Rename">✎</button>
          <button type="button" onClick={() => void toggleArchive()} className={ui.btnGhostSm} title={channel.archived_at ? 'Unarchive' : 'Archive'}>
            {channel.archived_at ? '↺' : '🗄'}
          </button>
        </span>
      )}
    </li>
  )
}

function CreateChannelForm () {
  const { currentUser } = useAppData()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function create () {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { data, error: insertError } = await supabase
      .from('channels')
      .insert({ name: trimmed, slug: slugify(trimmed), kind: 'public', created_by: currentUser.id })
      .select('slug')
      .single()
    setBusy(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setName('')
    setOpen(false)
    router.refresh()
    if (data?.slug) router.push(`/app/c/${data.slug}`)
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${ui.navLink} w-full justify-start text-[var(--primary)]`}>
        + New channel
      </button>
    )
  }

  return (
    <div className="px-1 py-1">
      <input
        autoFocus
        value={name}
        placeholder="channel-name"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void create()
          if (e.key === 'Escape') setOpen(false)
        }}
        className={`${ui.field} mt-0 py-1 text-sm`}
      />
      {error && <p className={`${ui.alertError} mt-1`}>{error}</p>}
      <div className="mt-1.5 flex gap-2">
        <button type="button" onClick={() => void create()} disabled={busy} className={ui.btnGhostSm}>Create</button>
        <button type="button" onClick={() => setOpen(false)} className={ui.btnGhostSm}>Cancel</button>
      </div>
    </div>
  )
}

function DmPicker () {
  const { currentUser, profiles } = useAppData()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const peers = profiles.filter((p) => p.id !== currentUser.id)

  async function startDm (peerId: string) {
    if (busy) return
    setBusy(true)
    const supabase = createClient()
    const [userA, userB] = orderedPair(currentUser.id, peerId)

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
    setOpen(false)
    router.push(`/app/dm/${threadId}`)
    router.refresh()
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={`${ui.navLink} w-full justify-start text-[var(--primary)]`}>
        + New direct message
      </button>
      {open && (
        <div className="surface-elevated absolute left-0 top-full z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-xl">
          {peers.length === 0 && <p className="px-3 py-2 text-sm text-[var(--muted)]">No other cohort members yet.</p>}
          {peers.map((peer) => (
            <button
              key={peer.id}
              type="button"
              disabled={busy}
              onClick={() => void startDm(peer.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--nav-active)]"
            >
              <span>{profileLabel(peer)}</span>
              <span className="font-mono text-xs text-[var(--muted)]">@{peer.handle}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DmRow ({ thread }: { thread: DmThread }) {
  const { currentUser, profileMap } = useAppData()
  const pathname = usePathname()
  const peerId = thread.user_a === currentUser.id ? thread.user_b : thread.user_a
  const peer = profileMap[peerId]
  const active = pathname === `/app/dm/${thread.id}`

  return (
    <li>
      <Link href={`/app/dm/${thread.id}`} className={`${ui.navLink} ${active ? ui.navLinkActive : ''}`}>
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: 'var(--nav-active)', color: 'var(--nav-active-fg)' }}
        >
          {profileLabel(peer, '?').slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate">{profileLabel(peer)}</span>
      </Link>
    </li>
  )
}

export function AppChrome ({ channels, dmThreads, initialNotifications, children }: AppChromeProps) {
  const { currentUser } = useAppData()
  const [showArchived, setShowArchived] = useState(false)

  const visibleChannels = channels.filter((c) => showArchived || !c.archived_at)
  const announcementsChannels = visibleChannels.filter((c) => c.kind === 'announcements')
  const publicChannels = visibleChannels.filter((c) => c.kind !== 'announcements')

  return (
    <div className={ui.meshBg}>
      <div className="mx-auto flex h-screen max-w-6xl">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] px-3 py-4 sm:flex">
          <Link href="/app" className="mb-4 flex items-center gap-2 px-1">
            <EudaChatLogo />
            <span className="font-display text-base font-bold">
              <span className="text-gradient">EudaChat</span>
            </span>
          </Link>

          <div className="min-w-0 px-1 pb-3 text-xs text-[var(--muted)]">
            <p className="truncate font-medium text-[var(--foreground)]">{currentUser.displayName}</p>
            <p className="truncate font-mono">@{currentUser.handle}</p>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto">
            <div>
              <p className={`${ui.metricLabel} px-2`}>Channels</p>
              <ul className="mt-1 space-y-0.5">
                {announcementsChannels.map((c) => <ChannelRow key={c.id} channel={c} />)}
                {publicChannels.map((c) => <ChannelRow key={c.id} channel={c} />)}
              </ul>
              <div className="mt-1">
                <CreateChannelForm />
              </div>
              {channels.some((c) => c.archived_at) && (
                <button
                  type="button"
                  onClick={() => setShowArchived((v) => !v)}
                  className={`${ui.btnGhostSm} mt-1 ml-1`}
                >
                  {showArchived ? 'Hide archived' : 'Show archived'}
                </button>
              )}
            </div>

            <div>
              <p className={`${ui.metricLabel} px-2`}>Direct messages</p>
              <ul className="mt-1 space-y-0.5">
                {dmThreads.map((t) => <DmRow key={t.id} thread={t} />)}
              </ul>
              <div className="mt-1">
                <DmPicker />
              </div>
            </div>

            <div>
              <Link href="/app/search" className={ui.navLink}>🔍 Search</Link>
            </div>
          </nav>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
            <SignOutButton />
            <ThemeToggle />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="app-header flex items-center justify-between gap-3 px-4 py-3 sm:hidden">
            <Link href="/app" className="flex items-center gap-2">
              <EudaChatLogo />
              <span className="font-display text-base font-bold"><span className="text-gradient">EudaChat</span></span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/app/search" className={ui.btnGhost}>Search</Link>
              <NotificationBell userId={currentUser.id} initialNotifications={initialNotifications} />
            </div>
          </header>
          <div className="hidden items-center justify-end gap-2 border-b border-[var(--border)] px-4 py-2 sm:flex">
            <ThemeToggle />
            <NotificationBell userId={currentUser.id} initialNotifications={initialNotifications} />
          </div>
          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
