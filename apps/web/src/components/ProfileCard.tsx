import type { ReactNode } from 'react'
import { Avatar } from '@/components/Avatar'
import { profileLabel, type Profile } from '@/lib/types'

type ProfileCardProps = {
  profile: Profile
  footer?: ReactNode
  className?: string
}

export function ProfileCard ({ profile, footer, className = '' }: ProfileCardProps) {
  const banner = profile.banner_url

  return (
    <div className={`overflow-hidden rounded-2xl ${className}`}>
      <div
        className="h-24 w-full bg-[linear-gradient(135deg,var(--primary),var(--accent))]"
        style={
          banner
            ? {
                backgroundImage: `url(${banner})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }
            : undefined
        }
        aria-hidden="true"
      />
      <div className="relative px-4 pb-4 pt-0">
        <div className="-mt-10 mb-3">
          <Avatar profile={profile} size="xl" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[var(--foreground)]">
            {profileLabel(profile)}
            {profile.is_admin && (
              <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-foreground)]">
                staff
              </span>
            )}
          </p>
          <p className="truncate font-mono text-sm text-[var(--muted)]">@{profile.handle}</p>
          {profile.bio ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--card-foreground)]">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-[var(--muted)]">No bio yet.</p>
          )}
        </div>
        {footer && <div className="mt-4 flex flex-wrap gap-2">{footer}</div>}
      </div>
    </div>
  )
}
