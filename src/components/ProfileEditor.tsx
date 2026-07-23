'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'
import type { Profile } from '@/lib/types'

const MAX_BIO = 280
const MAX_BYTES = 2 * 1024 * 1024

type ProfileEditorProps = {
  profile: Profile
}

export function ProfileEditor ({ profile }: ProfileEditorProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [handle, setHandle] = useState(profile.handle)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [dob, setDob] = useState(profile.date_of_birth ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function uploadAvatar (file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPEG, PNG, WebP, or GIF).')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 2 MB or smaller.')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${profile.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })

    if (uploadError) {
      setUploading(false)
      setError(uploadError.message)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.id)

    setUploading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }

    setAvatarUrl(publicUrl)
    setSuccess('Profile picture updated.')
    router.refresh()
  }

  async function removeAvatar () {
    if (!avatarUrl || uploading) return
    setUploading(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', profile.id)
    setUploading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setAvatarUrl(null)
    setSuccess('Profile picture removed.')
    router.refresh()
  }

  async function onSubmit (event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const nextHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!nextHandle || nextHandle.length < 2) {
      setLoading(false)
      setError('Handle must be at least 2 characters (letters, numbers, underscore).')
      return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || profile.display_name,
        handle: nextHandle,
        bio: bio.trim() || null
      })
      .eq('id', profile.id)

    if (updateError) {
      setLoading(false)
      setError(updateError.message.includes('profiles_handle_key')
        ? 'That handle is already taken.'
        : updateError.message)
      return
    }

    const { error: privateError } = await supabase
      .from('profile_private')
      .upsert({
        user_id: profile.id,
        date_of_birth: dob || null,
        updated_at: new Date().toISOString()
      })

    setLoading(false)
    if (privateError) {
      setError(privateError.message)
      return
    }

    setHandle(nextHandle)
    setSuccess('Profile saved.')
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-6">
      <header className="mb-6">
        <p className={ui.eyebrow}>Profile</p>
        <h1 className="font-display mt-1 text-2xl font-semibold">Customize your profile</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Picture and display name show in chat. Bio is optional. Date of birth is optional and only visible to you.
        </p>
      </header>

      <section className={`${ui.card} mb-4`}>
        <p className={ui.sectionTitle}>Profile picture</p>
        <div className="mt-4 flex items-center gap-4">
          <Avatar
            profile={{ ...profile, avatar_url: avatarUrl, display_name: displayName }}
            size="lg"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={ui.btnSecondary}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Uploading…' : 'Upload photo'}
            </button>
            {avatarUrl && (
              <button
                type="button"
                className={ui.btnGhost}
                disabled={uploading}
                onClick={() => void removeAvatar()}
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadAvatar(file)
              e.target.value = ''
            }}
          />
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">JPEG, PNG, WebP, or GIF · max 2 MB</p>
      </section>

      <form onSubmit={(e) => void onSubmit(e)} className={`${ui.card} space-y-4`}>
        <label className={ui.label}>
          Email
          <input className={ui.field} value={profile.email} disabled readOnly />
        </label>
        <label className={ui.label}>
          Display name
          <input
            required
            className={ui.field}
            value={displayName}
            maxLength={80}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="nickname"
          />
        </label>
        <label className={ui.label}>
          Handle
          <input
            required
            className={ui.field}
            value={handle}
            maxLength={32}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            autoComplete="username"
          />
          <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
            Used for @mentions · letters, numbers, underscore
          </span>
        </label>
        <label className={ui.label}>
          Bio <span className="font-normal text-[var(--muted)]">(optional)</span>
          <textarea
            className={`${ui.field} min-h-[96px] resize-y`}
            value={bio}
            maxLength={MAX_BIO}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short line about you"
          />
          <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
            {bio.length}/{MAX_BIO}
          </span>
        </label>
        <label className={ui.label}>
          Date of birth <span className="font-normal text-[var(--muted)]">(optional, private)</span>
          <input
            type="date"
            className={ui.field}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </label>
        <button type="submit" disabled={loading} className={ui.btnPrimary}>
          {loading ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      {success && <p className={`mt-4 ${ui.alertSuccess}`} role="status">{success}</p>}
      {error && <p className={`mt-4 ${ui.alertError}`} role="alert">{error}</p>}
    </div>
  )
}
