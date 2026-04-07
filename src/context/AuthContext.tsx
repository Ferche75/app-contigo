import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/data/supabase/client'
import { clearAllData } from '@/data/local/db'
import { syncEngine } from '@/data/sync/syncEngine'
import { profilesRepo } from '@/data/repos/profilesRepo'
import type { UserProfile } from '@/types'

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isCaregiver: boolean
  signUp: (email: string, password: string, name: string, role?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ROLE_KEY = 'contigo_user_role'
const ADMIN_KEY = 'contigo_user_admin'
const USER_KEY = 'contigo_user_cache'

const saveRoleLocally = (role: string, isAdmin: boolean) => {
  try {
    localStorage.setItem(ROLE_KEY, role)
    localStorage.setItem(ADMIN_KEY, String(isAdmin))
  } catch {}
}

const getLocalRole = () => {
  try {
    return {
      role: localStorage.getItem(ROLE_KEY) ?? 'patient',
      isAdmin: localStorage.getItem(ADMIN_KEY) === 'true'
    }
  } catch {
    return { role: 'patient', isAdmin: false }
  }
}

const saveUserCache = (user: UserProfile) => {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)) } catch {}
}

const getUserCache = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const clearLocalRole = () => {
  try {
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(ADMIN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cachedUser = getUserCache()
  const cachedRole = getLocalRole()

  const [user, setUser] = useState<UserProfile | null>(cachedUser)
  const [isLoading, setIsLoading] = useState(!cachedUser)
  const [isAdmin, setIsAdmin] = useState(cachedRole.isAdmin)
  const [isCaregiver, setIsCaregiver] = useState(cachedRole.role === 'caregiver')
  const initialized = useRef(false)

  const refreshFromServer = useCallback((userId: string) => {
    void supabase
      .from('profiles')
      .select('*, role, is_admin')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return

        const profile: UserProfile = {
          id: data.id,
          email: data.email,
          name: data.name,
          age: data.age,
          diabetesType: data.diabetes_type,
          doctorName: data.doctor_name,
          doctorPhone: data.doctor_phone,
          allergies: data.allergies,
          baseMedication: data.base_medication,
          emergencyContacts: data.emergency_contacts || [],
          lowVisionMode: data.low_vision_mode ?? false,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }

        setUser(profile)
        setIsAdmin(data.is_admin === true)
        
        // FIX: Solo actualizar rol si viene de la BD, sino mantener el local
        const serverRole = data.role
        const localRole = getLocalRole()
        const finalRole = serverRole || localRole.role || 'patient'
        
        setIsCaregiver(finalRole === 'caregiver')
        saveRoleLocally(finalRole, data.is_admin === true)
        saveUserCache(profile)

        if (finalRole !== 'caregiver') {
          void syncEngine.syncFromServer(userId)
        }
      })
  }, [])

  const loadUser = useCallback(async (userId: string) => {
    const cached = getUserCache()
    if (cached && cached.id === userId) {
      setUser(cached)
      const role = getLocalRole()
      setIsCaregiver(role.role === 'caregiver')
      setIsAdmin(role.isAdmin)
    } else {
      try {
        const local = await Promise.race<UserProfile | null>([
          profilesRepo.get(userId),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 1000))
        ])
        if (local) {
          setUser(local)
          saveUserCache(local)
          const role = getLocalRole()
          setIsCaregiver(role.role === 'caregiver')
          setIsAdmin(role.isAdmin)
        }
      } catch {}
    }
    refreshFromServer(userId)
  }, [refreshFromServer])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const initAuth = async () => {
      if (!cachedUser) setIsLoading(true)

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          await loadUser(session.user.id)
        } else if (!cachedUser) {
          clearLocalRole()
        }
      } catch (error) {
        console.error('Error in initAuth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUser(session.user.id)
          setIsLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsAdmin(false)
          setIsCaregiver(false)
          clearLocalRole()
          await clearAllData()
        }
      }
    )

    return () => { subscription.unsubscribe() }
  }, [loadUser, cachedUser])

  const signUp = async (email: string, password: string, name: string, role: string = 'patient') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } }
      })
      if (error) return { error }
      if (data.user) {
        saveRoleLocally(role, false)
        await loadUser(data.user.id)
      }
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error }
      if (data.user) await loadUser(data.user.id)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setIsCaregiver(false)
    clearLocalRole()
    await clearAllData()
  }

  const refreshUser = async () => {
    if (user) await loadUser(user.id)
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return
    const updated = { ...user, ...updates, updatedAt: new Date().toISOString() }
    setUser(updated)
    saveUserCache(updated)
    await profilesRepo.save(updated)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin,
      isCaregiver,
      signUp,
      signIn,
      signOut,
      refreshUser,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
