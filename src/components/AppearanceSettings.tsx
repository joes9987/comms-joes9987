'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppData } from '@/lib/app-context'
import {
  readWallpaperPrefs,
  WALLPAPER_PRESETS,
  writeWallpaperPrefs,
  type WallpaperMode,
  type WallpaperPrefs
} from '@/lib/wallpaper'
import { ui } from '@/lib/ui'

const MAX_BYTES = 2 * 1024 * 1024

export function AppearanceSettings () {
  const { currentUser } = useAppData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [prefs, setPrefs] = useState<WallpaperPrefs>({ mode: 'mesh' })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPrefs(readWallpaperPrefs())
  }, [])

  function apply (next: WallpaperPrefs) {
    setPrefs(next)
    writeWallpaperPrefs(next)
  }

  function selectMode (mode: Exclude<WallpaperMode, 'custom'>) {
    apply({ mode, url: prefs.url })
  }

  async function uploadWallpaper (file: File) {
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
    const supabase = createClient()
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${currentUser.id}/wallpaper.${ext}`

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
    setUploading(false)
    apply({ mode: 'custom', url: publicUrl })
  }

  function clearCustom () {
    apply({ mode: 'mesh', url: null })
  }

  return (
    <section className={`${ui.card} mt-4`}>
      <p className={ui.sectionTitle}>App background</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Only you see this — it does not appear on your public profile card.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {WALLPAPER_PRESETS.map((preset) => {
          const active = prefs.mode === preset.mode
          return (
            <button
              key={preset.mode}
              type="button"
              onClick={() => selectMode(preset.mode)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? 'border-[var(--primary)] bg-[var(--nav-active)]'
                  : 'border-[var(--border-strong)] hover:border-[var(--primary)]'
              }`}
            >
              <span className="block text-sm font-semibold text-[var(--foreground)]">{preset.label}</span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">{preset.hint}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={ui.btnSecondary}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Uploading…' : prefs.mode === 'custom' ? 'Replace custom image' : 'Upload custom image'}
        </button>
        {(prefs.mode === 'custom' || prefs.url) && (
          <button type="button" className={ui.btnGhost} onClick={clearCustom}>
            Reset to default
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadWallpaper(file)
            e.target.value = ''
          }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Custom images stay on this device (local storage). JPEG, PNG, WebP, or GIF · max 2 MB
      </p>
      {error && <p className={`mt-3 ${ui.alertError}`} role="alert">{error}</p>}
    </section>
  )
}
