import { redirect } from 'next/navigation'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export default async function AppIndexPage () {
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  if (!supabase) redirect('/login')

  const { data: general } = await supabase
    .from('channels')
    .select('slug')
    .eq('slug', 'general')
    .is('archived_at', null)
    .maybeSingle()

  if (general?.slug) redirect(`/app/c/${general.slug}`)

  const { data: firstChannel } = await supabase
    .from('channels')
    .select('slug')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  redirect(firstChannel ? `/app/c/${firstChannel.slug}` : '/app/search')
}
