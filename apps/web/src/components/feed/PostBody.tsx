import Link from 'next/link'

export function PostBody ({ body }: { body: string }) {
  if (!body) return null
  const parts = body.split(/([#@][a-zA-Z0-9_]{1,64})/g)
  return (
    <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
      {parts.map((part, index) => {
        if (part.startsWith('#')) {
          return (
            <Link key={`${part}-${index}`} href={`/app/tag/${encodeURIComponent(part.slice(1).toLowerCase())}`} className={undefined} style={{ color: 'var(--primary)', fontWeight: 600 }}>
              {part}
            </Link>
          )
        }
        if (part.startsWith('@')) {
          return (
            <Link key={`${part}-${index}`} href={`/app/u/${encodeURIComponent(part.slice(1).toLowerCase())}`} className="mention-chip">
              {part}
            </Link>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </p>
  )
}
