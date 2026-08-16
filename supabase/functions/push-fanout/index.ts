// Chat must not write EudaPM's public.notifications table.
// This function only fans out to public.push_tokens (Expo / optional web).

import { createClient } from 'jsr:@supabase/supabase-js@2'

type PushBody = {
  user_id?: string
  title?: string
  body?: string
}

type PushTokenRow = {
  token: string
  platform: 'ios' | 'android' | 'web'
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  return token === secret
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const secret = Deno.env.get('PUSH_FANOUT_SECRET')
  if (!bearerMatches(req.headers.get('Authorization'), secret)) {
    return json({ error: 'unauthorized' }, 401)
  }

  let payload: PushBody
  try {
    payload = (await req.json()) as PushBody
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const userId = payload.user_id
  const title = payload.title ?? ''
  const body = payload.body ?? ''
  if (!userId) return json({ error: 'user_id_required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('token, platform')
    .eq('user_id', userId)

  if (error) return json({ error: 'token_lookup_failed' }, 500)

  const rows = (tokens ?? []) as PushTokenRow[]
  let attempted = 0

  const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN')
  const mobile = rows.filter((r) => r.platform === 'ios' || r.platform === 'android')
  if (expoToken && mobile.length > 0) {
    const messages = mobile.map((r) => ({ to: r.token, title, body }))
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${expoToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    })
    attempted += mobile.length
  }

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const web = rows.filter((r) => r.platform === 'web')
  // If VAPID keys are missing, skip web. This stub does not send Web Push.
  if (vapidPublic && vapidPrivate) {
    attempted += web.length
  }

  return json({ ok: true, attempted })
})
