'use client'

import { useState } from 'react'
import { classifyText } from '@/lib/moderation'
import { createPost } from '@/lib/social'
import type { PostVisibility } from '@/lib/social-types'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

export function Composer ({ authorId, onPosted }: { authorId: string; onPosted: () => void }) {
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<PostVisibility>('public')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit (event: React.FormEvent) {
    event.preventDefault()
    const flagged = classifyText(body)
    if (flagged.action === 'flag') {
      setError('That copy looks unsafe. Please rewrite it.')
      return
    }
    setLoading(true)
    setError(null)
    const result = await createPost(createClient(), { authorId, body, visibility, files })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setBody('')
    setFiles([])
    onPosted()
  }

  return (
    <form onSubmit={(e) => void submit(e)} className={`${ui.card} space-y-3`}>
      <label className={ui.label}>
        Share with the cohort
        <textarea
          className={`${ui.field} min-h-[96px] resize-y`}
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What is happening in the cohort?"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className={ui.label}>
          Who can see this
          <select className={ui.select} value={visibility} onChange={(e) => setVisibility(e.target.value as PostVisibility)}>
            <option value="public">Public</option>
            <option value="followers">Followers</option>
            <option value="close_friends">Close friends</option>
          </select>
        </label>
        <label className={ui.label}>
          Photo or video
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
            multiple
            className="mt-1.5 block text-sm"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))}
          />
        </label>
      </div>
      {error && <p role="alert" className={ui.alertError}>{error}</p>}
      <button type="submit" disabled={loading} className={ui.btnPrimary}>
        {loading ? 'Posting…' : 'Post'}
      </button>
    </form>
  )
}
