import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PostCard } from '@/components/feed/PostCard'
import { fetchTrendingTags, searchSocial } from '@/lib/social'
import { createClient } from '@/lib/supabase/server'
import { ui } from '@/lib/ui'

export default async function DiscoverPage ({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const [trending, results] = await Promise.all([
    fetchTrendingTags(supabase),
    searchSocial(supabase, query, user.id)
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <p className={ui.eyebrow}>Explore</p>
      <h1 className={ui.pageTitle}>Discover</h1>
      <form method="get" className="flex gap-2" role="search">
        <input name="q" defaultValue={query} placeholder="Search posts, people, #tags" className={`${ui.field} mt-0`} />
        <button type="submit" className={ui.btnPrimary}>Search</button>
      </form>
      <div>
        <p className={ui.sectionTitle}>Trending tags</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {trending.map((item) => (
            <Link key={item.tag} href={`/app/tag/${item.tag}`} className={ui.btnGhostSm}>
              #{item.tag} · {item.count}
            </Link>
          ))}
          {trending.length === 0 && <p className={ui.pageSubtitle}>Tags appear once people post with #hashtags.</p>}
        </div>
      </div>
      {query && (
        <>
          {results.handles.length > 0 && (
            <div className="space-y-1">
              <p className={ui.sectionTitle}>People</p>
              {results.handles.map((handle) => (
                <Link key={handle} href={`/app/u/${handle}`} className={ui.navLink}>@{handle}</Link>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {results.posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </>
      )}
    </div>
  )
}
