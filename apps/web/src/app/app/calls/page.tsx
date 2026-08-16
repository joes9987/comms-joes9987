'use client'

import { useState } from 'react'
import { ui } from '@/lib/ui'

export default function CallsPage () {
  const [result, setResult] = useState<string | null>(null)

  async function mint () {
    const response = await fetch('/api/calls/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: 'cohort' })
    })
    const data = await response.json() as { configured?: boolean; error?: string; roomName?: string }
    if (data.error) {
      setResult(data.error)
      return
    }
    setResult(
      data.configured
        ? `LiveKit token minted for room ${data.roomName}.`
        : 'LiveKit is not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET on Vercel to enable rooms.'
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <p className={ui.eyebrow}>Calls</p>
      <h1 className={ui.pageTitle}>Audio rooms</h1>
      <p className={ui.pageSubtitle}>
        Token minting is ready. The LiveKit client UI waits on cloud credentials — no invented keys.
      </p>
      <button type="button" className={ui.btnPrimary} onClick={() => void mint()}>
        Request room token
      </button>
      {result && <p className={ui.pageSubtitle}>{result}</p>}
    </div>
  )
}
