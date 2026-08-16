'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAppData } from '@/lib/app-context'
import { addComment } from '@/lib/social'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

export function CommentForm ({ postId }: { postId: string }) {
  const router = useRouter()
  const { currentUser } = useAppData()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit (event: React.FormEvent) {
    event.preventDefault()
    const result = await addComment(createClient(), postId, currentUser.id, body)
    if (result.error) {
      setError(result.error)
      return
    }
    setBody('')
    setError(null)
    router.refresh()
  }

  return (
    <form onSubmit={(e) => void submit(e)} className={`${ui.card} space-y-3`}>
      <label className={ui.label}>
        Comment
        <textarea className={`${ui.field} min-h-[72px]`} value={body} maxLength={500} onChange={(e) => setBody(e.target.value)} />
      </label>
      {error && <p className={ui.alertError}>{error}</p>}
      <button type="submit" className={ui.btnPrimary}>Reply</button>
    </form>
  )
}
