import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { requireSupabase } from '../../src/lib/supabase'

type Post = {
  id: string
  body: string
  like_count: number
  created_at: string
}

export default function FeedScreen () {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const { data, error: queryError } = await requireSupabase()
      .from('posts')
      .select('id, body, like_count, created_at')
      .eq('visibility', 'public')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(40)

    if (queryError) setError(queryError.message)
    else setPosts(data ?? [])
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function onRefresh () {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0891b2" />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={posts}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        error ? <Text style={styles.error}>{error}</Text> : null
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No public posts yet. Pull to refresh.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.body}>{item.body || '(empty post)'}</Text>
          <Text style={styles.meta}>{item.like_count} likes</Text>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#eef2f7'
  },
  content: {
    padding: 16,
    gap: 12
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2f7'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 8
  },
  body: {
    color: '#0f172a',
    fontSize: 16,
    lineHeight: 22
  },
  meta: {
    color: '#64748b',
    fontSize: 13
  },
  empty: {
    color: '#475569',
    textAlign: 'center',
    marginTop: 32
  },
  error: {
    color: '#b91c1c',
    marginBottom: 8
  }
})
