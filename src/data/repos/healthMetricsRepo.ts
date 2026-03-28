import { bpOps, glucoseOps, weightOps } from '@/data/local/db'
import { syncEngine } from '@/data/sync/syncEngine'
import type { BloodPressureReading, GlucoseReading, WeightReading } from '@/types'

// ---- Blood Pressure ----
export const bpRepo = {
  async getAll(userId: string) {
    return await bpOps.getAll(userId)
  },
  async getLast(userId: string, n = 14) {
    return await bpOps.getLast(userId, n)
  },
  async getToday(userId: string) {
    return await bpOps.getToday(userId)
  },
  async create(reading: Omit<BloodPressureReading, 'id' | 'createdAt'>): Promise<BloodPressureReading> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const newReading: BloodPressureReading = { ...reading, id, createdAt: now }
    await bpOps.put(newReading)
    await syncEngine.queueOperation('blood_pressure', 'insert', {
      id, user_id: reading.userId,
      systolic: reading.systolic, diastolic: reading.diastolic,
      pulse: reading.pulse, recorded_at: reading.recordedAt,
      notes: reading.notes, created_at: now
    })
    return newReading
  },
  async delete(id: string) {
    await bpOps.delete(id)
    await syncEngine.queueOperation('blood_pressure', 'delete', { id })
  },
  getStatus(systolic: number, diastolic: number): 'normal' | 'elevated' | 'high' | 'crisis' {
    if (systolic >= 180 || diastolic >= 120) return 'crisis'
    if (systolic >= 140 || diastolic >= 90) return 'high'
    if (systolic >= 130 || diastolic >= 80) return 'elevated'
    return 'normal'
  },
  getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      normal: 'Normal', elevated: 'Elevada', high: 'Alta', crisis: '¡Crisis!'
    }
    return labels[status] || status
  }
}

// ---- Glucose Readings ----
export const glucoseRepo = {
  async getAll(userId: string) {
    return await glucoseOps.getAll(userId)
  },
  async getLast(userId: string, n = 14) {
    return await glucoseOps.getLast(userId, n)
  },
  async getToday(userId: string) {
    return await glucoseOps.getToday(userId)
  },
  async create(reading: Omit<GlucoseReading, 'id' | 'createdAt'>): Promise<GlucoseReading> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const newReading: GlucoseReading = { ...reading, id, createdAt: now }
    await glucoseOps.put(newReading)
    await syncEngine.queueOperation('glucose_readings', 'insert', {
      id, user_id: reading.userId, value: reading.value,
      type: reading.type, recorded_at: reading.recordedAt,
      notes: reading.notes, created_at: now
    })
    return newReading
  },
  async delete(id: string) {
    await glucoseOps.delete(id)
    await syncEngine.queueOperation('glucose_readings', 'delete', { id })
  },
  getStatus(value: number, type: GlucoseReading['type']): 'low' | 'normal' | 'elevated' | 'high' {
    if (value < 70) return 'low'
    if (type === 'fasting') {
      if (value <= 100) return 'normal'
      if (value <= 125) return 'elevated'
      return 'high'
    }
    // postmeal / 2h
    if (value <= 140) return 'normal'
    if (value <= 199) return 'elevated'
    return 'high'
  },
  getTypeLabel(type: GlucoseReading['type']) {
    const labels: Record<string, string> = {
      fasting: 'Ayunas', postmeal: 'Post-comida', random: 'Aleatoria', bedtime: 'Antes de dormir'
    }
    return labels[type] || type
  }
}

// ---- Weight ----
export const weightRepo = {
  async getAll(userId: string) {
    return await weightOps.getAll(userId)
  },
  async getLast(userId: string, n = 30) {
    return await weightOps.getLast(userId, n)
  },
  async create(reading: Omit<WeightReading, 'id' | 'createdAt'>): Promise<WeightReading> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const newReading: WeightReading = { ...reading, id, createdAt: now }
    await weightOps.put(newReading)
    await syncEngine.queueOperation('weight_readings', 'insert', {
      id, user_id: reading.userId,
      weight_kg: reading.weightKg, recorded_at: reading.recordedAt,
      notes: reading.notes, created_at: now
    })
    return newReading
  },
  async delete(id: string) {
    await weightOps.delete(id)
    await syncEngine.queueOperation('weight_readings', 'delete', { id })
  },
  getBMI(weightKg: number, heightCm: number): number {
    const h = heightCm / 100
    return Math.round((weightKg / (h * h)) * 10) / 10
  }
}
