import { notFound, redirect } from 'next/navigation'
import { MessageThread } from '@/components/MessageThread'
import { getDmMessages } from '@/lib/chat-server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { profileLabel, type DmThread } from '@/lib/types'

type DmPageProps = {
  params: Promise<{ threadId: string }>
}

export default async function DmPage ({ params }: DmPageProps) {
  if (!isSupabaseConfigured()) return null
  const { threadId } = await params

  const supabase = await createClient()
  if (!supabase) redirect('/login')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: thread } = await supabase
    .from('dm_threads')
    .select('*')
    .eq('id', threadId)
    .maybeSingle()

  if (!thread) notFound()

  const dmThread = thread as DmThread
  const peerId = dmThread.user_a === user.id ? dmThread.user_b : dmThread.user_a

  const { data: peer } = await supabase.from('profiles').select('*').eq('id', peerId).maybeSingle()
  const messages = await getDmMessages(supabase, dmThread.id)

  return (
    <MessageThread
      key={dmThread.id}
      target={{ type: 'dm', id: dmThread.id, peerName: profileLabel(peer) }}
      initialMessages={messages}
    />
  )
}
