const HASHTAG_RE = /#([a-zA-Z0-9_]{1,64})/g

export function extractHashtags (body: string): string[] {
  const tags = new Set<string>()
  for (const match of body.matchAll(HASHTAG_RE)) {
    tags.add(match[1].toLowerCase())
  }
  return [...tags]
}

export function extractMentions (body: string): string[] {
  const handles = new Set<string>()
  for (const match of body.matchAll(/@([a-zA-Z0-9_]{2,32})/g)) {
    handles.add(match[1].toLowerCase())
  }
  return [...handles]
}
