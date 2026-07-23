'use client'

import { createContext, useContext, useMemo } from 'react'
import type { Profile } from '@/lib/types'

type CurrentUser = {
  id: string
  email: string
  displayName: string
  handle: string
  isAdmin: boolean
  avatarUrl: string | null
  bio: string | null
}

type AppData = {
  currentUser: CurrentUser
  profiles: Profile[]
  profileMap: Record<string, Profile>
}

const AppDataContext = createContext<AppData | null>(null)

export function AppDataProvider ({
  currentUser,
  profiles,
  children
}: {
  currentUser: CurrentUser
  profiles: Profile[]
  children: React.ReactNode
}) {
  const value = useMemo<AppData>(() => {
    const profileMap: Record<string, Profile> = {}
    for (const profile of profiles) profileMap[profile.id] = profile
    return { currentUser, profiles, profileMap }
  }, [currentUser, profiles])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData (): AppData {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
