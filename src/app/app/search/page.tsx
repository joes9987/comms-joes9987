import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getChannels, getProfiles, toProfileMap } from '@/lib/chat-server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { profileLabel, type Channel, type Message } from '@/lib/types'
import { ui } from '@/lib/ui'

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>
}

function formatTimestamp (iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default async function SearchPage ({ searchParams }: SearchPageProps) {
  if (!isSupabaseConfigured()) return null
  const { q } = await searchParams
  const query = (q ?? '').trim()

  const supabase = await createClient()
  if (!supabase) redirect('/login')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let results: Message[] = []
  if (query.length > 0) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .ilike('body', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50)
    results = (data ?? []) as Message[]
  }

  const [profiles, channels] = await Promise.all([getProfiles(supabase), getChannels(supabase)])
  const profileMap = toProfileMap(profiles)
  const channelMap: Record<string, Channel> = {}
  for (const channel of channels) channelMap[channel.id] = channel

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className={ui.eyebrow}>Search</p>
      <h1 className={`${ui.pageTitle} mt-1`}>Find a message</h1>

      <form method="get" className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search keywords across channels and your DMs…"
          className={`${ui.field} mt-0`}
          autoFocus
        />
        <button type="submit" className={ui.btnPrimary}>Search</button>
      </form>

      <div className="mt-6 space-y-3">
        {query.length === 0 && (
          <p className={ui.pageSubtitle}>Type a keyword above to search messages you can see.</p>
        )}
        {query.length > 0 && results.length === 0 && (
          <p className={ui.pageSubtitle}>No messages match &ldquo;{query}&rdquo;.</p>
        )}
        {results.map((message) => {
          const author = profileMap[message.author_id]
          const channel = message.channel_id ? channelMap[message.channel_id] : null
          const href = channel ? `/app/c/${channel.slug}` : `/app/dm/${message.dm_thread_id}`
          const context = channel ? `#${channel.slug}` : 'Direct message'

          return (
            <Link key={message.id} href={href} className={`${ui.card} block transition hover:border-[var(--primary)]`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">{context}</span>
                <time className="font-mono text-xs text-[var(--muted)]">{formatTimestamp(message.created_at)}</time>
              </div>
              <p className="mt-1.5 text-sm font-medium text-[var(--foreground)]">{profileLabel(author)}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-[var(--muted-foreground)]">{message.body}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
