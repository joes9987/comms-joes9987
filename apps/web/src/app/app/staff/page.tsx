import { redirect } from 'next/navigation'
import { StaffManager } from '@/components/StaffManager'
import { getProfiles } from '@/lib/chat-server'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

export default async function StaffPage () {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!(me as Profile | null)?.is_admin) {
    redirect('/app')
  }

  const profiles = await getProfiles(supabase)
  return <StaffManager profiles={profiles} />
}
