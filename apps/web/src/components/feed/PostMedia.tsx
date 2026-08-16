import { postMediaUrl } from '@/lib/social'
import type { SocialMedia } from '@/lib/social-types'

export function PostMedia ({ media }: { media: SocialMedia[] }) {
  if (!media.length) return null
  return (
    <div className={`mt-3 grid gap-2 ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {media.map((item) => {
        const src = postMediaUrl(item.storage_path)
        if (String(item.kind).startsWith('video') || item.mime.startsWith('video/')) {
          return (
            <video key={item.id} src={src} controls className="max-h-80 w-full rounded-xl bg-black object-contain" />
          )
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.id} src={src} alt="" className="max-h-80 w-full rounded-xl object-cover" />
        )
      })}
    </div>
  )
}
