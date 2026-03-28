import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, getSession } from '@/data/supabase/client'
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCaregiver, setIsCaregiver] = useState(false)
  const initialized = useRef(false)

  const loadUser = useCallback(async (userId: string) => {
    try {
      // Single query — profile + role + is_admin in one shot
      const { data, error } = await supabase
        .from('profiles')
        .select('*, role, is_admin')
        .eq('id', userId)
        .maybeSingle()

      if (error || !data) {
        const local = await profilesRepo.get(userId)
        if (local) setUser(local)
        else setUser(null)
        return
      }

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
      setIsCaregiver(data.role === 'caregiver')

      if (data.role !== 'caregiver') {
        syncEngine.syncFromServer(userId).catch(console.error)
      }

    } catch (error) {
      console.error('Error in loadUser:', error)
      try {
        const local = await profilesRepo.get(userId)
        if (local) setUser(local)
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const initAuth = async () => {
      setIsLoading(true)
      try {
        const session = await getSession()
        if (session?.user) {
          await loadUser(session.user.id)
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
          await clearAllData()
        }
      }
    )

    return () => { subscription.unsubscribe() }
  }, [loadUser])

  const signUp = async (email: string, password: string, name: string, role: string = 'patient') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } }
      })
      if (error) return { error }
      if (data.user) await loadUser(data.user.id)
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
    await clearAllData()
  }

  const refreshUser = async () => {
    if (user) await loadUser(user.id)
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return
    const updated = { ...user, ...updates, updatedAt: new Date().toISOString() }
    setUser(updated)
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