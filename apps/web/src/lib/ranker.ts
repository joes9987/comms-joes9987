export type RankableSignals = {
  like_count: number
  comment_count: number
  repost_count: number
  age_minutes: number
  locality_boost: number
  follow_boost: number
}

/** Lime For-You score — transparent engagement × recency. */
export function scoreForYou (s: RankableSignals): number {
  const engagement = s.like_count + 2 * s.comment_count + 1.5 * s.repost_count
  const recencyDecay = Math.exp(-s.age_minutes / 360)
  const local = 1 + 0.6 * s.locality_boost
  const followFriendly = 1 + 0.3 * s.follow_boost
  return (1 + engagement) * recencyDecay * local * followFriendly
}

export function rankForYou<T extends RankableSignals> (items: T[]): T[] {
  return [...items].sort((a, b) => scoreForYou(b) - scoreForYou(a))
}
