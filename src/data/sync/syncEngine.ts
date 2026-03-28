import { supabase } from '@/data/supabase/client'
import { syncQueueOps } from '@/data/local/db'
import type { SyncOperation } from '@/types'

let isOnline = navigator.onLine

export const getNetworkStatus = () => isOnline
export const setNetworkStatus = (status: boolean) => { isOnline = status }

export const syncEngine = {
  async processQueue(): Promise<{ success: number; failed: number }> {
    if (!isOnline) return { success: 0, failed: 0 }
    const operations = await syncQueueOps.getAll()
    if (operations.length === 0) return { success: 0, failed: 0 }

    let success = 0, failed = 0
    for (const op of operations) {
      try {
        await this.executeOperation(op)
        await syncQueueOps.remove(op.id)
        success++
      } catch (error) {
        await syncQueueOps.incrementRetry(op.id)
        failed++
        if (op.retryCount >= 5) await syncQueueOps.remove(op.id)
      }
    }
    return { success, failed }
  },

  async executeOperation(op: SyncOperation): Promise<void> {
    const { table, operation, data } = op
    switch (operation) {
      case 'insert': {
        const { error } = await supabase.from(table).insert(data as any)
        if (error) throw error
        break
      }
      case 'update': {
        const { error } = await supabase.from(table).update(data as any).eq('id', data.id as string)
        if (error) throw error
        break
      }
      case 'delete': {
        const { error } = await supabase.from(table).delete().eq('id', data.id as string)
        if (error) throw error
        break
      }
      default: throw new Error(`Unknown operation: ${operation}`)
    }
  },

  async queueOperation(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>
  ): Promise<void> {
    await syncQueueOps.add({ table, operation, data })
    if (isOnline) await this.processQueue()
  },

  async syncFromServer(userId: string): Promise<void> {
    if (!isOnline) return
    const { localDb } = await import('@/data/local/db')

    // Medications
    const { data: meds } = await supabase.from('medications').select('*').eq('user_id', userId)
    if (meds) for (const m of meds as any[]) {
      await localDb.medications.put({
        id: m.id, userId: m.user_id, name: m.name, dosage: m.dosage,
        schedule: m.schedule, toleranceWindow: m.tolerance_window,
        notes: m.notes, active: m.active, createdAt: m.created_at, updatedAt: m.updated_at
      })
    }

    // Medication logs
    const { data: logs } = await supabase.from('medication_logs').select('*')
      .eq('user_id', userId).order('scheduled_time', { ascending: false }).limit(100)
    if (logs) for (const l of logs as any[]) {
      await localDb.medicationLogs.put({
        id: l.id, medicationId: l.medication_id, userId: l.user_id,
        scheduledTime: l.scheduled_time, takenAt: l.taken_at,
        status: l.status, postponedTo: l.postponed_to, notes: l.notes, createdAt: l.created_at
      })
    }

    // Appointments
    const { data: appts } = await supabase.from('appointments').select('*').eq('user_id', userId)
    if (appts) for (const a of appts as any[]) {
      await localDb.appointments.put({
        id: a.id, userId: a.user_id, doctorName: a.doctor_name, specialty: a.specialty,
        date: a.date, time: a.time, location: a.location, notes: a.notes,
        reminder24h: a.reminder_24h, reminder2h: a.reminder_2h,
        createdAt: a.created_at, updatedAt: a.updated_at
      })
    }

    // Wound reports
    const { data: wounds } = await supabase.from('wound_reports').select('*').eq('user_id', userId)
    if (wounds) for (const w of wounds as any[]) {
      await localDb.woundReports.put({
        id: w.id, userId: w.user_id, location: w.location, description: w.description,
        severity: w.severity, size: w.size, color: w.color, hasPain: w.has_pain,
        hasTemperature: w.has_temperature, hasSecretion: w.has_secretion,
        photoUrl: w.photo_url, checkedAt: w.checked_at, createdAt: w.created_at
      })
    }

    // Foot checks
    const { data: footChecks } = await supabase.from('foot_checks').select('*').eq('user_id', userId)
    if (footChecks) for (const c of footChecks as any[]) {
      await localDb.footChecks.put({
        id: c.id, userId: c.user_id, checkedAt: c.checked_at, notes: c.notes,
        checklistItems: c.checklist_items, woundFound: c.wound_found,
        woundReportId: c.wound_report_id, createdAt: c.created_at
      })
    }

    // Journal entries
    const { data: entries } = await supabase.from('journal_entries').select('*').eq('user_id', userId)
    if (entries) for (const e of entries as any[]) {
      await localDb.journalEntries.put({
        id: e.id, userId: e.user_id, date: e.date, content: e.content,
        mood: e.mood, glucoseLevel: e.glucose_level,
        createdAt: e.created_at, updatedAt: e.updated_at
      })
    }

    // NEW: Blood pressure
    const { data: bp } = await supabase.from('blood_pressure').select('*')
      .eq('user_id', userId).order('recorded_at', { ascending: false }).limit(60)
    if (bp) for (const r of bp as any[]) {
      await localDb.bloodPressure.put({
        id: r.id, userId: r.user_id, systolic: r.systolic, diastolic: r.diastolic,
        pulse: r.pulse, recordedAt: r.recorded_at, notes: r.notes, createdAt: r.created_at
      })
    }

    // NEW: Glucose readings
    const { data: glucose } = await supabase.from('glucose_readings').select('*')
      .eq('user_id', userId).order('recorded_at', { ascending: false }).limit(60)
    if (glucose) for (const g of glucose as any[]) {
      await localDb.glucoseReadings.put({
        id: g.id, userId: g.user_id, value: g.value, type: g.type,
        recordedAt: g.recorded_at, notes: g.notes, createdAt: g.created_at
      })
    }

    // NEW: Weight readings
    const { data: weight } = await supabase.from('weight_readings').select('*')
      .eq('user_id', userId).order('recorded_at', { ascending: false }).limit(60)
    if (weight) for (const w of weight as any[]) {
      await localDb.weightReadings.put({
        id: w.id, userId: w.user_id, weightKg: w.weight_kg,
        recordedAt: w.recorded_at, notes: w.notes, createdAt: w.created_at
      })
    }
  }
}

export const setupNetworkListeners = (onChange?: (online: boolean) => void) => {
  const handleOnline = () => {
    isOnline = true
    onChange?.(true)
    syncEngine.processQueue()
  }
  const handleOffline = () => {
    isOnline = false
    onChange?.(false)
  }
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
