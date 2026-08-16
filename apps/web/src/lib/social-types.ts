export type PostVisibility = 'public' | 'followers' | 'close_friends'
export type StatusVisibility = 'public' | 'close_friends'
export type MediaKind = 'image' | 'video'
export type ReactionId = 'yeah' | 'sweet' | 'doh' | 'mas' | 'love' | 'wine'

export type SocialMedia = {
  id: string
  post_id?: string | null
  status_id?: string | null
  kind: MediaKind | string
  storage_path: string
  mime: string
}

export type SocialPost = {
  id: string
  author_id: string
  body: string
  visibility: PostVisibility
  reposted_from: string | null
  created_at: string
  deleted_at: string | null
  like_count: number
  comment_count: number
  repost_count: number
  media?: SocialMedia[]
  liked_by_me?: boolean
  reposted_by_me?: boolean
  my_reaction?: ReactionId | null
}

export type SocialComment = {
  id: string
  post_id: string
  author_id: string
  body: string
  parent_id: string | null
  created_at: string
  deleted_at: string | null
}

export type SocialStatus = {
  id: string
  author_id: string
  caption: string | null
  visibility: StatusVisibility
  ciphertext: string | null
  created_at: string
  expires_at: string
  media?: SocialMedia[]
}
