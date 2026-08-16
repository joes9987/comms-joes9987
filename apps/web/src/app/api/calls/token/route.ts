import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** LiveKit room token. Returns a stub when LIVEKIT_API_KEY / SECRET are unset. */
export async function POST (request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { roomName?: string }
  const roomName = (body.roomName ?? 'cohort').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'cohort'
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    return NextResponse.json({
      token: 'stub-livekit-token',
      roomName,
      configured: false
    })
  }

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    iss: apiKey,
    sub: user.id,
    nbf: now,
    exp: now + 3600,
    video: { room: roomName, roomJoin: true, canPublish: true, canSubscribe: true }
  })).toString('base64url')
  const { createHmac } = await import('node:crypto')
  const sig = createHmac('sha256', apiSecret).update(`${header}.${payload}`).digest('base64url')

  return NextResponse.json({
    token: `${header}.${payload}.${sig}`,
    roomName,
    configured: true
  })
}
