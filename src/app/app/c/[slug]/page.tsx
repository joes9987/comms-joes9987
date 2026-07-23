import { notFound, redirect } from 'next/navigation'
import { MessageThread } from '@/components/MessageThread'
import { getChannelMessages } from '@/lib/chat-server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import type { Channel } from '@/lib/types'

type ChannelPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ChannelPage ({ params }: ChannelPageProps) {
  if (!isSupabaseConfigured()) return null
  const { slug } = await params

  const supabase = await createClient()
  if (!supabase) redirect('/login')

  const { data: channel } = await supabase
    .from('channels')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!channel) notFound()

  const messages = await getChannelMessages(supabase, (channel as Channel).id)

  return (
    <MessageThread
      key={channel.id}
      target={{
        type: 'channel',
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        announcements: channel.kind === 'announcements',
        archived: Boolean(channel.archived_at)
      }}
      initialMessages={messages}
    />
  )
}
