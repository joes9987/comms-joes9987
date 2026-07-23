const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g

export function extractMentionHandles (body: string): string[] {
  const handles = new Set<string>()
  for (const match of body.matchAll(MENTION_PATTERN)) {
    if (match[1]) handles.add(match[1].toLowerCase())
  }
  return [...handles]
}

/** Splits a message body into plain-text and mention segments for rendering. */
export function splitMentions (body: string): Array<{ text: string; mention: boolean }> {
  const segments: Array<{ text: string; mention: boolean }> = []
  let lastIndex = 0
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const start = match.index ?? 0
    if (start > lastIndex) {
      segments.push({ text: body.slice(lastIndex, start), mention: false })
    }
    segments.push({ text: match[0], mention: true })
    lastIndex = start + match[0].length
  }
  if (lastIndex < body.length) {
    segments.push({ text: body.slice(lastIndex), mention: false })
  }
  return segments
}

/** Finds the @-mention query currently being typed at the caret, if any. */
export function activeMentionQuery (value: string, caret: number): { start: number; query: string } | null {
  const uptoCaret = value.slice(0, caret)
  const atIndex = uptoCaret.lastIndexOf('@')
  if (atIndex === -1) return null
  const between = uptoCaret.slice(atIndex + 1)
  if (/\s/.test(between)) return null
  return { start: atIndex, query: between }
}
