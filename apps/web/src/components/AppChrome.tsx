'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { Avatar } from '@/components/Avatar'
import { NotificationBell } from '@/components/NotificationBell'
import { ProfileTrigger } from '@/components/ProfilePopover'
import { ThemeToggle } from '@/components/ThemeToggle'
import { EudaChatLogo } from '@/components/brand/EudaChatLogo'
import { useAppData } from '@/lib/app-context'
import { orderedPair, slugify } from '@/lib/chat-server'
import type { NotificationWithLink } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/client'
import { profileLabel, type Channel, type DmThread } from '@/lib/types'
import { ui } from '@/lib/ui'
import { readWallpaperPrefs, type WallpaperPrefs } from '@/lib/wallpaper'

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

function ChannelRow ({ channel, onNavigate }: { channel: Channel; onNavigate?: () => void }) {
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
        <label className="min-w-0 flex-1">
          <span className="sr-only">Rename channel</span>
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
        </label>
        <button type="button" onClick={() => void rename()} className={ui.btnGhostSm} disabled={busy}>Save</button>
      </li>
    )
  }

  return (
    <li className="group flex items-center justify-between gap-1">
      <Link
        href={`/app/c/${channel.slug}`}
        onClick={onNavigate}
        className={`${ui.navLink} min-w-0 flex-1 truncate ${active ? ui.navLinkActive : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        <span className="truncate">
          <span aria-hidden="true">{channel.kind === 'announcements' ? '📣 ' : '# '}</span>
          {channel.name}
        </span>
        {channel.archived_at && <span className="ml-1 shrink-0 text-xs text-[var(--muted)]">(archived)</span>}
      </Link>
      {canManage && (
        <span className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={ui.btnGhostSm}
            aria-label={`Rename ${channel.name}`}
          >
            <span aria-hidden="true">✎</span>
          </button>
          <button
            type="button"
            onClick={() => void toggleArchive()}
            className={ui.btnGhostSm}
            aria-label={channel.archived_at ? `Unarchive ${channel.name}` : `Archive ${channel.name}`}
          >
            <span aria-hidden="true">{channel.archived_at ? '↺' : '🗄'}</span>
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
      <label className="block">
        <span className="sr-only">New channel name</span>
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
      </label>
      {error && (
        <p role="alert" className={`${ui.alertError} mt-1`}>
          {error}
        </p>
      )}
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

function DmRow ({ thread, onNavigate }: { thread: DmThread; onNavigate?: () => void }) {
  const { currentUser, profileMap } = useAppData()
  const pathname = usePathname()
  const peerId = thread.user_a === currentUser.id ? thread.user_b : thread.user_a
  const peer = profileMap[peerId]
  const active = pathname === `/app/dm/${thread.id}`

  return (
    <li className={`flex items-center gap-0.5 rounded-lg ${active ? ui.navLinkActive : ''}`}>
      <ProfileTrigger profile={peer} className="shrink-0 px-1 py-1.5">
        <Avatar profile={peer} size="sm" />
      </ProfileTrigger>
      <Link
        href={`/app/dm/${thread.id}`}
        onClick={onNavigate}
        className={`${ui.navLink} min-w-0 flex-1`}
        aria-current={active ? 'page' : undefined}
      >
        <span className="truncate">{profileLabel(peer)}</span>
      </Link>
    </li>
  )
}

function subscribeWallpaper (onStoreChange: () => void) {
  const onChange = () => onStoreChange()
  window.addEventListener('eudachat:wallpaper', onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener('eudachat:wallpaper', onChange)
    window.removeEventListener('storage', onChange)
  }
}

function useWallpaperPrefs (): WallpaperPrefs {
  const snapshot = useSyncExternalStore(
    subscribeWallpaper,
    () => JSON.stringify(readWallpaperPrefs()),
    () => JSON.stringify({ mode: 'mesh' } satisfies WallpaperPrefs)
  )
  return JSON.parse(snapshot) as WallpaperPrefs
}

function SidebarNav ({
  channels,
  dmThreads,
  showArchived,
  setShowArchived,
  onNavigate
}: {
  channels: Channel[]
  dmThreads: DmThread[]
  showArchived: boolean
  setShowArchived: (updater: (value: boolean) => boolean) => void
  onNavigate?: () => void
}) {
  const { currentUser } = useAppData()
  const pathname = usePathname()
  const visibleChannels = channels.filter((c) => showArchived || !c.archived_at)
  const announcementsChannels = visibleChannels.filter((c) => c.kind === 'announcements')
  const publicChannels = visibleChannels.filter((c) => c.kind !== 'announcements')

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto" aria-label="Channels and direct messages">
      <div>
        <p className={`${ui.metricLabel} px-2`}>Channels</p>
        <ul className="mt-1 space-y-0.5">
          {announcementsChannels.map((c) => (
            <ChannelRow key={c.id} channel={c} onNavigate={onNavigate} />
          ))}
          {publicChannels.map((c) => (
            <ChannelRow key={c.id} channel={c} onNavigate={onNavigate} />
          ))}
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
          {dmThreads.map((t) => (
            <DmRow key={t.id} thread={t} onNavigate={onNavigate} />
          ))}
        </ul>
        <div className="mt-1">
          <DmPicker />
        </div>
      </div>

      <div className="space-y-0.5">
        <Link
          href="/app/feed"
          onClick={onNavigate}
          className={ui.navLink}
          aria-current={pathname.startsWith('/app/feed') || pathname.startsWith('/app/p/') ? 'page' : undefined}
        >
          Feed
        </Link>
        <Link
          href="/app/discover"
          onClick={onNavigate}
          className={ui.navLink}
          aria-current={pathname.startsWith('/app/discover') || pathname.startsWith('/app/tag/') ? 'page' : undefined}
        >
          Discover
        </Link>
        <Link
          href="/app/search"
          onClick={onNavigate}
          className={ui.navLink}
          aria-current={pathname === '/app/search' ? 'page' : undefined}
        >
          Search
        </Link>
        <Link
          href="/app/profile"
          onClick={onNavigate}
          className={ui.navLink}
          aria-current={pathname === '/app/profile' ? 'page' : undefined}
        >
          Edit profile
        </Link>
        <Link
          href="/app/calls"
          onClick={onNavigate}
          className={ui.navLink}
          aria-current={pathname.startsWith('/app/calls') ? 'page' : undefined}
        >
          Calls
        </Link>
        {currentUser.isAdmin && (
          <Link
            href="/app/staff"
            onClick={onNavigate}
            className={ui.navLink}
            aria-current={pathname.startsWith('/app/staff') ? 'page' : undefined}
          >
            Manage staff
          </Link>
        )}
      </div>
    </nav>
  )
}

export function AppChrome ({ channels, dmThreads, initialNotifications, children }: AppChromeProps) {
  const { currentUser, profileMap } = useAppData()
  const [showArchived, setShowArchived] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const wallpaper = useWallpaperPrefs()
  const selfProfile = profileMap[currentUser.id] ?? {
    id: currentUser.id,
    email: currentUser.email,
    display_name: currentUser.displayName,
    handle: currentUser.handle,
    is_admin: currentUser.isAdmin,
    avatar_url: currentUser.avatarUrl,
    bio: currentUser.bio
  }

  useEffect(() => {
    if (!mobileNavOpen) return
    function onKeyDown (event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileNavOpen])

  const wallpaperStyle: CSSProperties | undefined =
    wallpaper.mode === 'custom' && wallpaper.url
      ? ({ ['--wallpaper-image']: `url(${wallpaper.url})` } as CSSProperties)
      : undefined

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <div
      className={ui.meshBg}
      data-wallpaper={wallpaper.mode}
      style={wallpaperStyle}
    >
      <div className="mx-auto flex h-screen max-w-6xl">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] px-3 py-4 sm:flex">
          <Link href="/app" className="mb-4 flex items-center gap-2 px-1">
            <EudaChatLogo />
            <span className="font-display text-base font-bold">
              <span className="text-gradient">EudaChat</span>
            </span>
          </Link>

          <div className="mb-3 flex items-center gap-2.5 rounded-xl px-1 py-1.5">
            <ProfileTrigger profile={selfProfile} className="shrink-0">
              <Avatar
                src={currentUser.avatarUrl}
                name={currentUser.displayName}
                size="md"
              />
            </ProfileTrigger>
            <Link href="/app/profile" className="min-w-0 flex-1 rounded-lg py-0.5 transition hover:bg-[var(--nav-active)]">
              <div className="min-w-0 text-xs text-[var(--muted)]">
                <p className="truncate font-medium text-[var(--foreground)]">
                  {currentUser.displayName}
                  {currentUser.isAdmin && (
                    <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-foreground)]">
                      staff
                    </span>
                  )}
                </p>
                <p className="truncate font-mono">@{currentUser.handle}</p>
                {currentUser.bio && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug">{currentUser.bio}</p>
                )}
              </div>
            </Link>
          </div>

          <SidebarNav
            channels={channels}
            dmThreads={dmThreads}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
          />

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
            <SignOutButton />
            <ThemeToggle />
          </div>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="app-header flex items-center justify-between gap-3 px-4 py-3 sm:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className={ui.btnGhost}
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-channel-nav"
                onClick={() => setMobileNavOpen((open) => !open)}
              >
                {mobileNavOpen ? 'Close' : 'Channels'}
              </button>
              <Link href="/app" className="flex min-w-0 items-center gap-2">
                <EudaChatLogo />
                <span className="font-display text-base font-bold"><span className="text-gradient">EudaChat</span></span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/app/feed" className={ui.btnGhost}>Feed</Link>
              <Link href="/app/search" className={ui.btnGhost}>Search</Link>
              <NotificationBell userId={currentUser.id} initialNotifications={initialNotifications} />
            </div>
          </header>

          {mobileNavOpen && (
            <div
              id="mobile-channel-nav"
              role="dialog"
              aria-label="Channels and direct messages"
              className="surface-elevated absolute inset-x-0 top-14 z-40 max-h-[min(70vh,32rem)] overflow-y-auto border-b border-[var(--border)] px-3 py-4 sm:hidden"
            >
              <SidebarNav
                channels={channels}
                dmThreads={dmThreads}
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                onNavigate={closeMobileNav}
              />
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <SignOutButton />
              </div>
            </div>
          )}

          <div className="hidden items-center justify-end gap-2 border-b border-[var(--border)] px-4 py-2 sm:flex">
            <ThemeToggle />
            <NotificationBell userId={currentUser.id} initialNotifications={initialNotifications} />
          </div>
          <main id="main-content" tabIndex={-1} className="min-h-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
