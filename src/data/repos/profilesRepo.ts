import { supabase } from '@/data/supabase/client'
import { profileOps } from '@/data/local/db'
import { syncEngine } from '@/data/sync/syncEngine'
import type { UserProfile, EmergencyContact } from '@/types'

export const profilesRepo = {
  // Get profile (local first, then server en background)
  async get(userId: string): Promise<UserProfile | null> {
    console.log('=== profilesRepo.get START ===', userId)
    
    // Try local first - INMEDIATAMENTE
    console.log('Trying local...')
    let local
    try {
      local = await profileOps.get(userId)
      console.log('Local result:', local)
      if (local && local.id) {
        console.log('=== profilesRepo.get END (local) ===')
        
        // Sync from server en background sin await
        this.syncFromServer(userId).catch(console.error)
        
        return local
      }
    } catch (e) {
      console.error('Error getting local profile:', e)
    }

    // Si no hay local, fetchear de Supabase con timeout corto
    console.log('Fetching from Supabase...')
    
    try {
      const supabasePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      // Timeout de 3 segundos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
      })

      const { data, error } = await Promise.race([
        supabasePromise,
        timeoutPromise
      ]) as any

      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Supabase error:', error.message)
        return null
      }

      if (!data) {
        console.log('No data from Supabase')
        return null
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
        lowVisionMode: data.low_vision_mode,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      console.log('Caching locally...')
      try {
        await profileOps.put(profile)
      } catch (e) {
        console.error('Error caching locally:', e)
      }
      
      console.log('=== profilesRepo.get END (success) ===')
      return profile
    } catch (err: any) {
      console.error('=== ERROR in profilesRepo.get ===', err?.message || err)
      return null
    }
  },

  // Sync desde server en background
  async syncFromServer(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

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
        lowVisionMode: data.low_vision_mode,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      await profileOps.put(profile)
    } catch (e) {
      console.error('Background sync error:', e)
    }
  },

  // Resto igual...
  async save(profile: Partial<UserProfile> & { id: string; email: string; name: string }): Promise<void> {
    const now = new Date().toISOString()
    
    const dbProfile: Record<string, any> = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      age: profile.age,
      diabetes_type: profile.diabetesType,
      doctor_name: profile.doctorName,
      doctor_phone: profile.doctorPhone,
      allergies: profile.allergies,
      base_medication: profile.baseMedication,
      emergency_contacts: profile.emergencyContacts || [],
      low_vision_mode: profile.lowVisionMode ?? false,
      updated_at: now
    }

    const localProfile: UserProfile = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      age: profile.age,
      diabetesType: profile.diabetesType,
      doctorName: profile.doctorName,
      doctorPhone: profile.doctorPhone,
      allergies: profile.allergies,
      baseMedication: profile.baseMedication,
      emergencyContacts: profile.emergencyContacts || [],
      lowVisionMode: profile.lowVisionMode ?? false,
      createdAt: profile.createdAt || now,
      updatedAt: now
    }
    
    await profileOps.put(localProfile)
    await syncEngine.queueOperation('profiles', profile.createdAt ? 'update' : 'insert', dbProfile)
  },

  async updateEmergencyContacts(userId: string, contacts: EmergencyContact[]): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        emergency_contacts: contacts as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) throw error

    const local = await profileOps.get(userId)
    if (local) {
      local.emergencyContacts = contacts
      local.updatedAt = new Date().toISOString()
      await profileOps.put(local)
    }
  },

  async toggleLowVisionMode(userId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        low_vision_mode: enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) throw error

    const local = await profileOps.get(userId)
    if (local) {
      local.lowVisionMode = enabled
      local.updatedAt = new Date().toISOString()
      await profileOps.put(local)
    }
  },

  async isAdmin(userId: string): Promise<boolean> {
    console.log('=== isAdmin START ===', userId)
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('isAdmin timeout')), 2000)
      })
      
      const supabasePromise = supabase.rpc('is_admin', { user_id: userId })
      
      const { data, error } = await Promise.race([
        supabasePromise,
        timeoutPromise
      ]) as any

      if (error) {
        console.error('Error checking admin status:', error)
        return false
      }

      return data || false
    } catch (e: any) {
      console.error('Exception in isAdmin:', e?.message || e)
      return false
    }
  }
}