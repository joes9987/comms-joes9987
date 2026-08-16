import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PostCard } from '@/components/feed/PostCard'
import { fetchPostsByTag } from '@/lib/social'
import { createClient } from '@/lib/supabase/server'
import { ui } from '@/lib/ui'

export default async function TagPage ({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const posts = await fetchPostsByTag(supabase, decodeURIComponent(tag), user.id)

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Link href="/app/discover" className={ui.linkAccent}>Discover</Link>
      <h1 className={ui.pageTitle}>#{decodeURIComponent(tag)}</h1>
      {posts.length === 0 ? (
        <p className={ui.pageSubtitle}>No posts with this tag yet.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  )
}
