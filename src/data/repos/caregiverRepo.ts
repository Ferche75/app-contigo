// src/data/repos/caregiverRepo.ts
import { supabase } from '@/data/supabase/client'

export interface PatientSummary {
  patientUserId: string
  patientName: string
  patientPhone: string | null
  medsTotal: number
  medsTaken: number
  footCheckDone: boolean
  footWoundFound: boolean
  lastGlucose: number | null
  lastGlucoseType: string | null
  lastGlucoseAt: string | null
  lastBpSystolic: number | null
  lastBpDiastolic: number | null
  lastBpAt: string | null
}

export const caregiverRepo = {

  async generateCode(patientUserId: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('generate_caregiver_code', { p_patient_user_id: patientUserId })
    if (error) throw error
    return data as string
  },

  async getPendingCode(patientUserId: string): Promise<string | null> {
    const { data } = await supabase
      .from('caregiver_links')
      .select('code')
      .eq('patient_user_id', patientUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data?.code ?? null
  },

  async getActiveLink(patientUserId: string) {
    const { data } = await supabase
      .from('caregiver_links')
      .select('*, profiles!caregiver_user_id(name, email)')
      .eq('patient_user_id', patientUserId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    return data
  },

  async revokeLink(patientUserId: string): Promise<void> {
    const { error } = await supabase
      .from('caregiver_links')
      .update({ status: 'revoked' })
      .eq('patient_user_id', patientUserId)
      .eq('status', 'active')
    if (error) throw error
  },

  async activateCode(code: string, caregiverUserId: string): Promise<'ok' | 'not_found' | 'already_used'> {
    const { data: link } = await supabase
      .from('caregiver_links')
      .select('id, status, patient_user_id')
      .eq('code', code)
      .maybeSingle()

    if (!link) return 'not_found'
    if (link.status !== 'pending') return 'already_used'
    if (link.patient_user_id === caregiverUserId) return 'not_found'

    const { error } = await supabase
      .from('caregiver_links')
      .update({
        caregiver_user_id: caregiverUserId,
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('id', link.id)
    if (error) throw error
    return 'ok'
  },

  async getPatientSummary(caregiverUserId: string): Promise<PatientSummary | null> {
    const { data, error } = await supabase
      .rpc('get_caregiver_summary', { p_caregiver_id: caregiverUserId })

    if (error || !data || data.length === 0) return null

    const row = data[0]
    return {
      patientUserId: row.patient_user_id,
      patientName: row.patient_name,
      patientPhone: row.patient_phone ?? null,
      medsTotal: Number(row.meds_total) || 0,
      medsTaken: Number(row.meds_taken) || 0,
      footCheckDone: Boolean(row.foot_check_done),
      footWoundFound: Boolean(row.foot_wound_found),
      lastGlucose: row.last_glucose ?? null,
      lastGlucoseType: row.last_glucose_type ?? null,
      lastGlucoseAt: row.last_glucose_at ?? null,
      lastBpSystolic: row.last_bp_systolic ?? null,
      lastBpDiastolic: row.last_bp_diastolic ?? null,
      lastBpAt: row.last_bp_at ?? null,
    }
  },

  async removeAsCaregiver(caregiverUserId: string): Promise<void> {
    await supabase
      .from('caregiver_links')
      .update({ status: 'revoked' })
      .eq('caregiver_user_id', caregiverUserId)
      .eq('status', 'active')
  }
}