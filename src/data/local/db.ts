import Dexie, { type Table } from 'dexie'
import type { 
  UserProfile, 
  Medication, 
  MedicationLog, 
  WoundReport, 
  FootCheck, 
  JournalEntry, 
  Appointment,
  SyncOperation,
  BloodPressureReading,
  GlucoseReading,
  WeightReading
} from '@/types'

export class ContigoDatabase extends Dexie {
  profiles!: Table<UserProfile>
  medications!: Table<Medication>
  medicationLogs!: Table<MedicationLog>
  woundReports!: Table<WoundReport>
  footChecks!: Table<FootCheck>
  journalEntries!: Table<JournalEntry>
  appointments!: Table<Appointment>
  syncQueue!: Table<SyncOperation>
  bloodPressure!: Table<BloodPressureReading>
  glucoseReadings!: Table<GlucoseReading>
  weightReadings!: Table<WeightReading>

  constructor() {
    super('ContigoDB')
    
    this.version(1).stores({
      profiles: 'id, email, updatedAt',
      medications: 'id, userId, active, updatedAt',
      medicationLogs: 'id, medicationId, userId, scheduledTime, status, createdAt',
      woundReports: 'id, userId, severity, checkedAt, createdAt',
      footChecks: 'id, userId, checkedAt, woundFound, createdAt',
      journalEntries: 'id, userId, date, createdAt',
      appointments: 'id, userId, date, time, createdAt',
      syncQueue: 'id, table, operation, createdAt'
    })

    // Version 2 - adds health metrics tables
    this.version(2).stores({
      profiles: 'id, email, updatedAt',
      medications: 'id, userId, active, updatedAt',
      medicationLogs: 'id, medicationId, userId, scheduledTime, status, createdAt',
      woundReports: 'id, userId, severity, checkedAt, createdAt',
      footChecks: 'id, userId, checkedAt, woundFound, createdAt',
      journalEntries: 'id, userId, date, createdAt',
      appointments: 'id, userId, date, time, createdAt',
      syncQueue: 'id, table, operation, createdAt',
      bloodPressure: 'id, userId, recordedAt, createdAt',
      glucoseReadings: 'id, userId, type, recordedAt, createdAt',
      weightReadings: 'id, userId, recordedAt, createdAt'
    })
  }
}

export const localDb = new ContigoDatabase()

export const profileOps = {
  async get(id: string): Promise<UserProfile | undefined> {
    return await localDb.profiles.get(id)
  },
  async put(profile: UserProfile): Promise<void> {
    await localDb.profiles.put(profile)
  },
  async delete(id: string): Promise<void> {
    await localDb.profiles.delete(id)
  }
}

export const medicationOps = {
  async getAll(userId: string): Promise<Medication[]> {
    return await localDb.medications
      .where('userId').equals(userId)
      .and(m => m.active)
      .toArray()
  },
  async get(id: string): Promise<Medication | undefined> {
    return await localDb.medications.get(id)
  },
  async put(medication: Medication): Promise<void> {
    await localDb.medications.put(medication)
  },
  async delete(id: string): Promise<void> {
    await localDb.medications.delete(id)
  }
}

export const medLogOps = {
  async getAll(userId: string, startDate?: string, endDate?: string): Promise<MedicationLog[]> {
    let collection = localDb.medicationLogs.where('userId').equals(userId)
    if (startDate && endDate) {
      collection = collection.filter(log => 
        log.scheduledTime >= startDate && log.scheduledTime <= endDate
      )
    }
    return await collection.toArray()
  },
  async getForDate(userId: string, date: string): Promise<MedicationLog[]> {
    const startOfDay = `${date}T00:00:00.000Z`
    const endOfDay = `${date}T23:59:59.999Z`
    return await localDb.medicationLogs
      .where('userId').equals(userId)
      .and(log => log.scheduledTime >= startOfDay && log.scheduledTime <= endOfDay)
      .toArray()
  },
  async getPending(userId: string): Promise<MedicationLog[]> {
    const now = new Date().toISOString()
    return await localDb.medicationLogs
      .where('userId').equals(userId)
      .and(log => log.status !== 'taken' && log.scheduledTime <= now)
      .toArray()
  },
  async put(log: MedicationLog): Promise<void> {
    await localDb.medicationLogs.put(log)
  },
  async delete(id: string): Promise<void> {
    await localDb.medicationLogs.delete(id)
  }
}

export const woundOps = {
  async getAll(userId: string): Promise<WoundReport[]> {
    return await localDb.woundReports
      .where('userId').equals(userId)
      .reverse().sortBy('createdAt')
  },
  async get(id: string): Promise<WoundReport | undefined> {
    return await localDb.woundReports.get(id)
  },
  async put(wound: WoundReport): Promise<void> {
    await localDb.woundReports.put(wound)
  },
  async delete(id: string): Promise<void> {
    await localDb.woundReports.delete(id)
  }
}

export const footCheckOps = {
  async getAll(userId: string): Promise<FootCheck[]> {
    return await localDb.footChecks
      .where('userId').equals(userId)
      .reverse().sortBy('checkedAt')
  },
  async getToday(userId: string): Promise<FootCheck | undefined> {
    const today = new Date().toISOString().split('T')[0]
    const checks = await localDb.footChecks
      .where('userId').equals(userId)
      .and(check => check.checkedAt.startsWith(today))
      .toArray()
    return checks[0]
  },
  async put(check: FootCheck): Promise<void> {
    await localDb.footChecks.put(check)
  },
  async delete(id: string): Promise<void> {
    await localDb.footChecks.delete(id)
  }
}

export const journalOps = {
  async getAll(userId: string): Promise<JournalEntry[]> {
    return await localDb.journalEntries
      .where('userId').equals(userId)
      .reverse().sortBy('date')
  },
  async getForDate(userId: string, date: string): Promise<JournalEntry | undefined> {
    const entries = await localDb.journalEntries
      .where('userId').equals(userId)
      .and(entry => entry.date === date)
      .toArray()
    return entries[0]
  },
  async put(entry: JournalEntry): Promise<void> {
    await localDb.journalEntries.put(entry)
  },
  async delete(id: string): Promise<void> {
    await localDb.journalEntries.delete(id)
  }
}

export const appointmentOps = {
  async getAll(userId: string): Promise<Appointment[]> {
    return await localDb.appointments.where('userId').equals(userId).toArray()
  },
  async getUpcoming(userId: string, limit: number = 5): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0]
    return await localDb.appointments
      .where('userId').equals(userId)
      .and(appt => appt.date >= today)
      .limit(limit).sortBy('date')
  },
  async get(id: string): Promise<Appointment | undefined> {
    return await localDb.appointments.get(id)
  },
  async put(appointment: Appointment): Promise<void> {
    await localDb.appointments.put(appointment)
  },
  async delete(id: string): Promise<void> {
    await localDb.appointments.delete(id)
  }
}

// Blood Pressure ops
export const bpOps = {
  async getAll(userId: string): Promise<BloodPressureReading[]> {
    return await localDb.bloodPressure
      .where('userId').equals(userId)
      .reverse().sortBy('recordedAt')
  },
  async getLast(userId: string, n: number = 14): Promise<BloodPressureReading[]> {
    const all = await localDb.bloodPressure
      .where('userId').equals(userId)
      .reverse().sortBy('recordedAt')
    return all.slice(0, n)
  },
  async getToday(userId: string): Promise<BloodPressureReading | undefined> {
    const today = new Date().toISOString().split('T')[0]
    const recs = await localDb.bloodPressure
      .where('userId').equals(userId)
      .and(r => r.recordedAt.startsWith(today))
      .toArray()
    return recs[0]
  },
  async put(reading: BloodPressureReading): Promise<void> {
    await localDb.bloodPressure.put(reading)
  },
  async delete(id: string): Promise<void> {
    await localDb.bloodPressure.delete(id)
  }
}

// Glucose readings ops
export const glucoseOps = {
  async getAll(userId: string): Promise<GlucoseReading[]> {
    return await localDb.glucoseReadings
      .where('userId').equals(userId)
      .reverse().sortBy('recordedAt')
  },
  async getLast(userId: string, n: number = 14): Promise<GlucoseReading[]> {
    const all = await localDb.glucoseReadings
      .where('userId').equals(userId)
      .reverse().sortBy('recordedAt')
    return all.slice(0, n)
  },
  async getToday(userId: string): Promise<GlucoseReading[]> {
    const today = new Date().toISOString().split('T')[0]
    return await localDb.glucoseReadings
      .where('userId').equals(userId)
      .and(r => r.recordedAt.startsWith(today))
      .toArray()
  },
  async put(reading: GlucoseReading): Promise<void> {
    await localDb.glucoseReadings.put(reading)
  },
  async delete(id: string): Promise<void> {
    await localDb.glucoseReadings.delete(id)
  }
}

// Weight ops
export const weightOps = {
  async getAll(userId: string): Promise<WeightReading[]> {
    return await localDb.weightReadings
      .where('userId').equals(userId)
      .reverse().sortBy('recordedAt')
  },
  async getLast(userId: string, n: number = 30): Promise<WeightReading[]> {
    const all = await localDb.weightReadings
      .where('userId').equals(userId)
      .reverse().sortBy('recordedAt')
    return all.slice(0, n)
  },
  async put(reading: WeightReading): Promise<void> {
    await localDb.weightReadings.put(reading)
  },
  async delete(id: string): Promise<void> {
    await localDb.weightReadings.delete(id)
  }
}

export const syncQueueOps = {
  async getAll(): Promise<SyncOperation[]> {
    return await localDb.syncQueue.toArray()
  },
  async add(operation: Omit<SyncOperation, 'id' | 'retryCount' | 'createdAt'>): Promise<void> {
    await localDb.syncQueue.add({
      ...operation,
      id: crypto.randomUUID(),
      retryCount: 0,
      createdAt: new Date().toISOString()
    })
  },
  async remove(id: string): Promise<void> {
    await localDb.syncQueue.delete(id)
  },
  async incrementRetry(id: string): Promise<void> {
    const op = await localDb.syncQueue.get(id)
    if (op) {
      await localDb.syncQueue.update(id, { retryCount: op.retryCount + 1 })
    }
  },
  async clear(): Promise<void> {
    await localDb.syncQueue.clear()
  },
  async count(): Promise<number> {
    return await localDb.syncQueue.count()
  }
}

export const clearAllData = async (): Promise<void> => {
  await localDb.profiles.clear()
  await localDb.medications.clear()
  await localDb.medicationLogs.clear()
  await localDb.woundReports.clear()
  await localDb.footChecks.clear()
  await localDb.journalEntries.clear()
  await localDb.appointments.clear()
  await localDb.syncQueue.clear()
  await localDb.bloodPressure.clear()
  await localDb.glucoseReadings.clear()
  await localDb.weightReadings.clear()
}
