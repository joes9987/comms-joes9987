import { redirect } from 'next/navigation'
import { FeedHome } from '@/components/feed/FeedHome'
import { fetchForYouFeed, fetchLiveStatuses } from '@/lib/social'
import { createClient } from '@/lib/supabase/server'

export default async function FeedPage () {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const [posts, statuses] = await Promise.all([
    fetchForYouFeed(supabase, user.id),
    fetchLiveStatuses(supabase)
  ])
  return <FeedHome initialTab="for_you" initialPosts={posts} initialStatuses={statuses} />
}
