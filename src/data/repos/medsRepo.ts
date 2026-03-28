import { medicationOps, medLogOps } from '@/data/local/db'
import { syncEngine } from '@/data/sync/syncEngine'
import type { Medication, MedicationLog } from '@/types'

export const medsRepo = {
  // Get all active medications for user
  async getAll(userId: string): Promise<Medication[]> {
    return await medicationOps.getAll(userId)
  },

  // Get single medication
  async get(id: string): Promise<Medication | undefined> {
    return await medicationOps.get(id)
  },

  // Create medication
  async create(medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const newMed: Medication = {
      ...medication,
      id,
      createdAt: now,
      updatedAt: now
    }

    // Save locally first
    await medicationOps.put(newMed)

    // Queue for sync
    await syncEngine.queueOperation('medications', 'insert', {
      id,
      user_id: medication.userId,
      name: medication.name,
      dosage: medication.dosage,
      schedule: medication.schedule,
      tolerance_window: medication.toleranceWindow,
      notes: medication.notes,
      active: medication.active,
      created_at: now,
      updated_at: now
    })

    return newMed
  },

  // Update medication
  async update(id: string, updates: Partial<Medication>): Promise<void> {
    const existing = await medicationOps.get(id)
    if (!existing) throw new Error('Medication not found')

    const now = new Date().toISOString()
    const updated: Medication = {
      ...existing,
      ...updates,
      id,
      updatedAt: now
    }

    // Save locally
    await medicationOps.put(updated)

    // Queue for sync
    await syncEngine.queueOperation('medications', 'update', {
      id,
      name: updated.name,
      dosage: updated.dosage,
      schedule: updated.schedule,
      tolerance_window: updated.toleranceWindow,
      notes: updated.notes,
      active: updated.active,
      updated_at: now
    })
  },

  // Delete (soft delete - set active to false)
  async delete(id: string): Promise<void> {
    await this.update(id, { active: false })
  },

  // Generate logs for a medication schedule
  async generateLogs(medicationId: string, days: number = 7): Promise<void> {
    const medication = await this.get(medicationId)
    if (!medication) return

    const now = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      for (const schedule of medication.schedule) {
        // Check if this day is in the schedule
        const dayOfWeek = date.getDay()
        if (!schedule.days.includes(dayOfWeek)) continue

        const scheduledTime = `${dateStr}T${schedule.time}:00.000Z`
        
        // Check if log already exists
        const existing = await medLogOps.getAll(medication.userId)
        const exists = existing.some(l => 
          l.medicationId === medicationId && 
          l.scheduledTime === scheduledTime
        )

        if (!exists) {
          const log: MedicationLog = {
            id: crypto.randomUUID(),
            medicationId,
            userId: medication.userId,
            scheduledTime,
            status: 'missed',
            createdAt: now.toISOString()
          }
          
          await medLogOps.put(log)
          
          // Queue for sync
          await syncEngine.queueOperation('medication_logs', 'insert', {
            id: log.id,
            medication_id: medicationId,
            user_id: medication.userId,
            scheduled_time: scheduledTime,
            status: 'missed',
            created_at: now.toISOString()
          })
        }
      }
    }
  }
}

export const medLogsRepo = {
  // Get logs for a date range
  async getForDateRange(userId: string, startDate: string, endDate: string): Promise<MedicationLog[]> {
    return await medLogOps.getAll(userId, startDate, endDate)
  },

  // Get logs for today
  async getForToday(userId: string): Promise<MedicationLog[]> {
    const today = new Date().toISOString().split('T')[0]
    return await medLogOps.getForDate(userId, today)
  },

  // Get pending logs
  async getPending(userId: string): Promise<MedicationLog[]> {
    return await medLogOps.getPending(userId)
  },

  // Mark as taken
  async markTaken(logId: string): Promise<void> {
    const allLogs = await medLogOps.getAll('')
    const log = allLogs.find(l => l.id === logId)
    if (!log) throw new Error('Log not found')

    const now = new Date().toISOString()
    const updated: MedicationLog = {
      ...log,
      takenAt: now,
      status: 'taken'
    }

    await medLogOps.put(updated)

    await syncEngine.queueOperation('medication_logs', 'update', {
      id: logId,
      taken_at: now,
      status: 'taken'
    })
  },

  // Mark as skipped
  async markSkipped(logId: string, reason?: string): Promise<void> {
    const allLogs = await medLogOps.getAll('')
    const log = allLogs.find(l => l.id === logId)
    if (!log) throw new Error('Log not found')

    const updated: MedicationLog = {
      ...log,
      status: 'skipped',
      notes: reason
    }

    await medLogOps.put(updated)

    await syncEngine.queueOperation('medication_logs', 'update', {
      id: logId,
      status: 'skipped',
      notes: reason
    })
  },

  // Postpone
  async postpone(logId: string, postponeTo: string): Promise<void> {
    const allLogs = await medLogOps.getAll('')
    const log = allLogs.find(l => l.id === logId)
    if (!log) throw new Error('Log not found')

    const updated: MedicationLog = {
      ...log,
      status: 'postponed',
      postponedTo: postponeTo
    }

    await medLogOps.put(updated)

    await syncEngine.queueOperation('medication_logs', 'update', {
      id: logId,
      status: 'postponed',
      postponed_to: postponeTo
    })
  },

  // Calculate adherence for a period
  async calculateAdherence(userId: string, days: number = 7): Promise<number> {
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    
    const logs = await medLogOps.getAll(userId, startDate, endDate)
    
    if (logs.length === 0) return 100

    const taken = logs.filter(l => l.status === 'taken').length
    return Math.round((taken / logs.length) * 100)
  },

  // Get streak
  async getStreak(userId: string): Promise<number> {
    const logs = await medLogOps.getAll(userId)
    
    // Group by date
    const byDate = new Map<string, { total: number; taken: number }>()
    
    for (const log of logs) {
      const date = log.scheduledTime.split('T')[0]
      const current = byDate.get(date) || { total: 0, taken: 0 }
      current.total++
      if (log.status === 'taken') current.taken++
      byDate.set(date, current)
    }

    // Calculate streak from today backwards
    const dates = Array.from(byDate.keys()).sort().reverse()
    let streak = 0
    
    // Check if today has pending meds
    const today = new Date().toISOString().split('T')[0]
    const todayData = byDate.get(today)
    if (todayData && todayData.taken === todayData.total && todayData.total > 0) {
      streak++
    }

    // Check previous days
    for (const date of dates) {
      if (date === today) continue
      
      const data = byDate.get(date)
      if (data && data.taken === data.total && data.total > 0) {
        streak++
      } else {
        break
      }
    }

    return streak
  }
}
