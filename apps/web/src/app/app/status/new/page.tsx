'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAppData } from '@/lib/app-context'
import { createStatus } from '@/lib/social'
import type { StatusVisibility } from '@/lib/social-types'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

export default function NewStatusPage () {
  const router = useRouter()
  const { currentUser } = useAppData()
  const [caption, setCaption] = useState('')
  const [visibility, setVisibility] = useState<StatusVisibility>('public')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit (event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    const result = await createStatus(createClient(), {
      authorId: currentUser.id,
      caption,
      visibility,
      file
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push('/app/feed')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <p className={ui.eyebrow}>24 hours</p>
      <h1 className={ui.pageTitle}>New status</h1>
      <p className={`${ui.pageSubtitle} mt-2`}>
        Public statuses are visible to the cohort. Close-friends statuses stay inside your close-friends list (RLS).
        Signal wrapping for close-friends ciphertext is available in `@euda/crypto` when a session exists.
      </p>
      <form onSubmit={(e) => void submit(e)} className={`${ui.card} mt-4 space-y-3`}>
        <label className={ui.label}>
          Caption
          <textarea className={`${ui.field} min-h-[96px]`} value={caption} maxLength={280} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <label className={ui.label}>
          Visibility
          <select className={ui.select} value={visibility} onChange={(e) => setVisibility(e.target.value as StatusVisibility)}>
            <option value="public">Public</option>
            <option value="close_friends">Close friends</option>
          </select>
        </label>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {error && <p className={ui.alertError}>{error}</p>}
        <button type="submit" disabled={loading} className={ui.btnPrimary}>{loading ? 'Sharing…' : 'Share status'}</button>
      </form>
    </div>
  )
}
