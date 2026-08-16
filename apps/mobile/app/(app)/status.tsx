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

type Status = {
  id: string
  caption: string | null
  created_at: string
  expires_at: string
}

export default function StatusScreen () {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const { data, error: queryError } = await requireSupabase()
      .from('statuses')
      .select('id, caption, created_at, expires_at')
      .eq('visibility', 'public')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (queryError) setError(queryError.message)
    else setStatuses(data ?? [])
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
      data={statuses}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        error ? <Text style={styles.error}>{error}</Text> : null
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No public statuses right now.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.body}>{item.caption || '(no caption)'}</Text>
          <Text style={styles.meta}>Expires {new Date(item.expires_at).toLocaleString()}</Text>
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
