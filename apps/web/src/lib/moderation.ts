const TOXIC = /\b(kill yourself|kys|i will kill you)\b/i

export function classifyText (text: string): { action: 'ok' | 'flag'; reason?: string } {
  const trimmed = text.trim()
  if (!trimmed) return { action: 'ok' }
  if (TOXIC.test(trimmed)) return { action: 'flag', reason: 'threat_or_self_harm' }
  return { action: 'ok' }
}

export const REPORT_REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'violence', label: 'Violence or threats' },
  { id: 'nsfw', label: 'Adult or sexual content' },
  { id: 'gossip', label: 'Mauvay langue (gossip / slander)' },
  { id: 'other', label: 'Other' }
] as const
