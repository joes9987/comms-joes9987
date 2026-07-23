import { redirect } from 'next/navigation'
import { ProfileEditor } from '@/components/ProfileEditor'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

export default async function ProfilePage () {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data }, { data: privateRow }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('profile_private').select('date_of_birth').eq('user_id', user.id).maybeSingle()
  ])

  if (!data) redirect('/app')

  const profile = {
    ...(data as Profile),
    date_of_birth: privateRow?.date_of_birth ?? null
  }

  return <ProfileEditor profile={profile} />
}
