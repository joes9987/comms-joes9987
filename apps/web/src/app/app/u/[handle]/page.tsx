import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FollowButton } from '@/components/feed/FollowButton'
import { PostCard } from '@/components/feed/PostCard'
import { ProfileCard } from '@/components/ProfileCard'
import { isFollowing } from '@/lib/social'
import { createClient } from '@/lib/supabase/server'
import type { SocialPost } from '@/lib/social-types'
import { ui } from '@/lib/ui'

export default async function ProfileTimelinePage ({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', decodeURIComponent(handle).toLowerCase())
    .maybeSingle()
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className={ui.pageTitle}>Profile not found</p>
        <Link href="/app/feed" className={ui.linkAccent}>Back to feed</Link>
      </div>
    )
  }

  const [{ data: posts }, following] = await Promise.all([
    supabase
      .from('posts')
      .select('id, author_id, body, visibility, reposted_from, created_at, deleted_at, like_count, comment_count, repost_count')
      .eq('author_id', profile.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(40),
    isFollowing(supabase, user.id, profile.id)
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <ProfileCard
        profile={profile}
        footer={
          user.id === profile.id
            ? <Link href="/app/profile" className={ui.linkAccent}>Edit profile</Link>
            : <FollowButton followerId={user.id} followeeId={profile.id} initiallyFollowing={following} />
        }
      />
      <div className="space-y-3">
        {((posts ?? []) as SocialPost[]).map((post) => <PostCard key={post.id} post={post} />)}
        {(posts ?? []).length === 0 && <p className={ui.pageSubtitle}>No posts yet.</p>}
      </div>
    </div>
  )
}
