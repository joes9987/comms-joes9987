import { profileInitials, type Profile } from '@/lib/types'

type AvatarProps = {
  profile?: Profile | null
  name?: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-16 w-16 text-lg'
} as const

export function Avatar ({ profile, name, src, size = 'md', className = '' }: AvatarProps) {
  const image = src ?? profile?.avatar_url
  const initials = profile
    ? profileInitials(profile)
    : (name ?? '?').trim().slice(0, 2).toUpperCase() || '?'

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className={`${SIZE[size]} shrink-0 rounded-full object-cover ring-1 ring-[var(--border)] ${className}`}
      />
    )
  }

  return (
    <div
      className={`${SIZE[size]} flex shrink-0 items-center justify-center rounded-full font-bold ${className}`}
      style={{ background: 'var(--nav-active)', color: 'var(--nav-active-fg)' }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}
