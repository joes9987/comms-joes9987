import type { Session } from '@supabase/supabase-js'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { isSupabaseConfigured, supabase } from '../src/lib/supabase'

export default function RootLayout () {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!isSupabaseConfigured())
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!supabase) {
      setReady(true)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!ready) return

    const inApp = segments[0] === '(app)'
    if (!session) {
      if (inApp || segments.length === 0) {
        router.replace('/login')
      }
      return
    }

    if (!inApp) {
      router.replace('/(app)/feed')
    }
  }, [ready, session, segments, router])

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2f7' }}>
        <ActivityIndicator color="#0891b2" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  )
}
