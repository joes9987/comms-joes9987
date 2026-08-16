'use client'

import { useState } from 'react'
import { REPORT_REASONS } from '@/lib/moderation'
import { blockUser, muteUser, reportTarget } from '@/lib/social'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

type TargetKind = 'post' | 'comment' | 'profile' | 'message' | 'status'

export function ReportMenu ({
  actorId,
  targetKind,
  targetId,
  subjectUserId
}: {
  actorId: string
  targetKind: TargetKind
  targetId: string
  subjectUserId?: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('spam')
  const [detail, setDetail] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  async function submit () {
    const supabase = createClient()
    const result = await reportTarget(supabase, {
      reporterId: actorId,
      targetKind,
      targetId,
      reason,
      detail: detail.trim() || undefined
    })
    setStatus(result.error ?? 'Thanks — staff will review this.')
    if (!result.error) setOpen(false)
  }

  async function block () {
    if (!subjectUserId) return
    const supabase = createClient()
    const result = await blockUser(supabase, actorId, subjectUserId)
    setStatus(result.error ?? 'Blocked. Their posts will no longer appear.')
  }

  async function mute () {
    if (!subjectUserId) return
    const supabase = createClient()
    const result = await muteUser(supabase, actorId, subjectUserId)
    setStatus(result.error ?? 'Muted.')
  }

  return (
    <div className="relative">
      <button type="button" className={ui.btnGhostSm} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        More
      </button>
      {open && (
        <div className={`${ui.cardSm} absolute right-0 z-20 mt-1 w-64 space-y-2`}>
          <label className={ui.label}>
            Report
            <select className={ui.select} value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORT_REASONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <textarea
            className={`${ui.field} min-h-[64px]`}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Optional detail"
          />
          <button type="button" className={ui.btnSecondary} onClick={() => void submit()}>Submit report</button>
          {subjectUserId && subjectUserId !== actorId && (
            <div className="flex gap-2">
              <button type="button" className={ui.btnGhostSm} onClick={() => void mute()}>Mute</button>
              <button type="button" className={ui.btnGhostSm} onClick={() => void block()}>Block</button>
            </div>
          )}
        </div>
      )}
      {status && <p className="mt-1 text-xs text-[var(--muted)]">{status}</p>}
    </div>
  )
}
