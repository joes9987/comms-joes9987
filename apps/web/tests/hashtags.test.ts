import { describe, expect, it } from 'vitest'
import { extractHashtags, extractMentions } from '../src/lib/hashtags'
import { scoreForYou } from '../src/lib/ranker'
import { classifyText } from '../src/lib/moderation'

describe('extractHashtags', () => {
  it('lowercases and dedupes tags', () => {
    expect(extractHashtags('Hello #Cohort #cohort and #help_desk')).toEqual(['cohort', 'help_desk'])
  })
})

describe('extractMentions', () => {
  it('collects handles', () => {
    expect(extractMentions('hi @joes9987 and @JOES9987')).toEqual(['joes9987'])
  })
})

describe('scoreForYou', () => {
  it('prefers recent engaged posts', () => {
    const quiet = scoreForYou({
      like_count: 0, comment_count: 0, repost_count: 0,
      age_minutes: 600, locality_boost: 0, follow_boost: 0
    })
    const hot = scoreForYou({
      like_count: 4, comment_count: 2, repost_count: 1,
      age_minutes: 20, locality_boost: 0, follow_boost: 1
    })
    expect(hot).toBeGreaterThan(quiet)
  })
})

describe('classifyText', () => {
  it('flags explicit threats and leaves ordinary copy alone', () => {
    expect(classifyText('Quiet for so. Come join the lime.')).toEqual({ action: 'ok' })
    expect(classifyText('kys')).toMatchObject({ action: 'flag' })
  })
})
