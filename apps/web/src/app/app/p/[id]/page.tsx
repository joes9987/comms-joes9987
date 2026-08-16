import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PostCard } from '@/components/feed/PostCard'
import { CommentForm } from '@/components/feed/CommentForm'
import { fetchComments, fetchPost } from '@/lib/social'
import { createClient } from '@/lib/supabase/server'
import { profileLabel } from '@/lib/types'
import { ui } from '@/lib/ui'

export default async function PostDetailPage ({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const post = await fetchPost(supabase, id, user.id)
  if (!post) {
    return (
      <div className="px-4 py-8">
        <p className={ui.pageSubtitle}>Post not found or not visible.</p>
        <Link href="/app/feed" className={ui.linkAccent}>Back to feed</Link>
      </div>
    )
  }

  const original = post.reposted_from ? await fetchPost(supabase, post.reposted_from, user.id) : null
  const comments = await fetchComments(supabase, post.reposted_from ?? id)
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, handle')
  const names = new Map((profiles ?? []).map((row) => [row.id as string, profileLabel(row as never)]))

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Link href="/app/feed" className={ui.linkAccent}>Back to feed</Link>
      <PostCard post={post} original={original} />
      <CommentForm postId={post.reposted_from ?? id} />
      <div className="space-y-2">
        {comments.map((comment) => (
          <div key={comment.id} className={ui.cardSm}>
            <p className="text-xs text-[var(--muted)]">{names.get(comment.author_id) ?? 'Member'}</p>
            <p className="mt-1 text-sm">{comment.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
