'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { AppearanceSettings } from '@/components/AppearanceSettings'
import { Avatar } from '@/components/Avatar'
import { ProfileCard } from '@/components/ProfileCard'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'
import type { Profile } from '@/lib/types'

const MAX_BIO = 280
const MAX_BYTES = 2 * 1024 * 1024

type ProfileEditorProps = {
  profile: Profile
}

async function uploadImage (userId: string, file: File, basename: string) {
  if (!file.type.startsWith('image/')) {
    return { error: 'Please choose an image file (JPEG, PNG, WebP, or GIF).' }
  }
  if (file.size > MAX_BYTES) {
    return { error: 'Image must be 2 MB or smaller.' }
  }

  const supabase = createClient()
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/${basename}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })

  if (uploadError) return { error: uploadError.message }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return { url: `${data.publicUrl}?v=${Date.now()}` }
}

export function ProfileEditor ({ profile }: ProfileEditorProps) {
  const router = useRouter()
  const avatarRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [handle, setHandle] = useState(profile.handle)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [dob, setDob] = useState(profile.date_of_birth ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? null)
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url ?? null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const previewProfile: Profile = {
    ...profile,
    display_name: displayName,
    handle,
    bio: bio.trim() || null,
    avatar_url: avatarUrl,
    banner_url: bannerUrl
  }

  async function uploadAvatar (file: File) {
    setUploading(true)
    setError(null)
    setSuccess(null)
    const result = await uploadImage(profile.id, file, 'avatar')
    if (result.error || !result.url) {
      setUploading(false)
      setError(result.error ?? 'Upload failed.')
      return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: result.url })
      .eq('id', profile.id)

    setUploading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setAvatarUrl(result.url)
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

  async function uploadBanner (file: File) {
    setUploading(true)
    setError(null)
    setSuccess(null)
    const result = await uploadImage(profile.id, file, 'banner')
    if (result.error || !result.url) {
      setUploading(false)
      setError(result.error ?? 'Upload failed.')
      return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ banner_url: result.url })
      .eq('id', profile.id)

    setUploading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setBannerUrl(result.url)
    setSuccess('Banner updated.')
    router.refresh()
  }

  async function removeBanner () {
    if (!bannerUrl || uploading) return
    setUploading(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ banner_url: null })
      .eq('id', profile.id)
    setUploading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setBannerUrl(null)
    setSuccess('Banner removed.')
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
          Picture, banner, and display name show on your profile card in chat. Bio is optional.
          Date of birth is optional and only visible to you.
        </p>
      </header>

      <section className={`${ui.card} mb-4 overflow-hidden p-0`}>
        <div className="border-b border-[var(--border)] px-6 py-4">
          <p className={ui.sectionTitle}>Card preview</p>
          <p className="mt-1 text-xs text-[var(--muted)]">What others see when they click your name</p>
        </div>
        <div className="bg-[var(--background)]/40 p-4">
          <div className="surface-elevated mx-auto max-w-xs overflow-hidden rounded-2xl">
            <ProfileCard profile={previewProfile} />
          </div>
        </div>
      </section>

      <section className={`${ui.card} mb-4`}>
        <p className={ui.sectionTitle}>Banner</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Wide image (~3:1). Shown at the top of your profile card.</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
          <div
            className="h-20 w-full bg-[linear-gradient(135deg,var(--primary),var(--accent))]"
            style={
              bannerUrl
                ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : undefined
            }
            aria-hidden="true"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={ui.btnSecondary}
            disabled={uploading}
            onClick={() => bannerRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload banner'}
          </button>
          {bannerUrl && (
            <button
              type="button"
              className={ui.btnGhost}
              disabled={uploading}
              onClick={() => void removeBanner()}
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={bannerRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadBanner(file)
            e.target.value = ''
          }}
        />
      </section>

      <section className={`${ui.card} mb-4`}>
        <p className={ui.sectionTitle}>Profile picture</p>
        <div className="mt-4 flex items-center gap-4">
          <Avatar profile={previewProfile} size="lg" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={ui.btnSecondary}
              disabled={uploading}
              onClick={() => avatarRef.current?.click()}
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
            ref={avatarRef}
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

      <AppearanceSettings />

      {success && <p className={`mt-4 ${ui.alertSuccess}`} role="status">{success}</p>}
      {error && <p className={`mt-4 ${ui.alertError}`} role="alert">{error}</p>}
    </div>
  )
}
