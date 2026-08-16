import { Tabs } from 'expo-router'
import { Pressable, Text } from 'react-native'
import { supabase } from '../../src/lib/supabase'

export default function AppLayout () {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#eef2f7' },
        headerTintColor: '#0f172a',
        tabBarActiveTintColor: '#0e7490',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { backgroundColor: '#ffffff' },
        headerRight: () => (
          <Pressable
            onPress={() => {
              void supabase?.auth.signOut()
            }}
            style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <Text style={{ color: '#0891b2', fontWeight: '600' }}>Sign out</Text>
          </Pressable>
        )
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="status" options={{ title: 'Status' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
    </Tabs>
  )
}
