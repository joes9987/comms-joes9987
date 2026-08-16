import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PostMedia } from '@/components/feed/PostMedia'
import { fetchLiveStatuses } from '@/lib/social'
import { createClient } from '@/lib/supabase/server'
import { profileLabel } from '@/lib/types'
import { ui } from '@/lib/ui'

export default async function StatusViewerPage ({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const statuses = await fetchLiveStatuses(supabase)
  const status = statuses.find((item) => item.id === id)
  if (!status) {
    return (
      <div className="px-4 py-8">
        <p className={ui.pageSubtitle}>This status expired or is not visible.</p>
        <Link href="/app/feed" className={ui.linkAccent}>Back to feed</Link>
      </div>
    )
  }

  const { data: author } = await supabase
    .from('profiles')
    .select('display_name, handle, is_admin, id, email')
    .eq('id', status.author_id)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <Link href="/app/feed" className={ui.linkAccent}>Back to feed</Link>
      <p className={ui.eyebrow}>
        {status.visibility === 'close_friends' ? 'Close friends' : 'Public'} · expires {status.expires_at}
      </p>
      <h1 className={ui.pageTitle}>{author ? profileLabel(author) : 'Status'}</h1>
      {status.caption && <p className="text-lg">{status.caption}</p>}
      <PostMedia media={status.media ?? []} />
    </div>
  )
}
