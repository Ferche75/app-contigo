// User Profile Types
export interface UserProfile {
  id: string
  email: string
  name: string
  age?: number
  diabetesType?: 'type1' | 'type2' | 'gestational' | 'prediabetes' | 'other'
  doctorName?: string
  doctorPhone?: string
  allergies?: string
  baseMedication?: string
  emergencyContacts: EmergencyContact[]
  lowVisionMode: boolean
  createdAt: string
  updatedAt: string
}

export interface EmergencyContact {
  id: string
  name: string
  phone: string
  whatsapp?: string
  relationship?: string
  isPrimary: boolean
}

// Medication Types
export interface Medication {
  id: string
  userId: string
  name: string
  dosage: string
  schedule: MedicationSchedule[]
  toleranceWindow: number // minutes
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface MedicationSchedule {
  id: string
  time: string // HH:mm format
  days: number[] // 0-6 (Sunday-Saturday)
  label?: string // e.g., "AM", "PM", "Con comida"
}

export interface MedicationLog {
  id: string
  medicationId: string
  userId: string
  scheduledTime: string
  takenAt?: string
  status: 'taken' | 'missed' | 'postponed' | 'skipped'
  postponedTo?: string
  notes?: string
  createdAt: string
}

// Foot Care / Wound Types
export interface WoundReport {
  id: string
  userId: string
  location: string
  description: string
  severity: 'low' | 'medium' | 'high'
  size?: string
  color?: string
  hasPain: boolean
  hasTemperature: boolean
  hasSecretion: boolean
  photoUrl?: string
  checkedAt: string
  createdAt: string
}

export interface FootCheck {
  id: string
  userId: string
  checkedAt: string
  notes?: string
  checklistItems: FootChecklistItem[]
  woundFound: boolean
  woundReportId?: string
  createdAt: string
}

export interface FootChecklistItem {
  id: string
  item: string
  checked: boolean
}

// Journal / Notes
export interface JournalEntry {
  id: string
  userId: string
  date: string
  content: string
  mood?: 'good' | 'neutral' | 'bad'
  glucoseLevel?: number
  createdAt: string
  updatedAt: string
}

// Appointments
export interface Appointment {
  id: string
  userId: string
  doctorName: string
  specialty?: string
  date: string
  time: string
  location?: string
  notes?: string
  reminder24h: boolean
  reminder2h: boolean
  createdAt: string
  updatedAt: string
}

// Sync Queue
export interface SyncOperation {
  id: string
  table: string
  operation: 'insert' | 'update' | 'delete'
  data: Record<string, unknown>
  retryCount: number
  createdAt: string
}

// Admin Types
export interface AdminMetrics {
  totalUsers: number
  active7Days: number
  active30Days: number
  totalReminders: number
  totalLogs: number
  totalWounds: number
  averageAdherence: number
}

export interface AdminUser {
  id: string
  email: string
  name: string
  createdAt: string
  lastActive: string
  reminderCount: number
  logCount: number
}

// App State
export interface AppState {
  isOnline: boolean
  isSyncing: boolean
  pendingSyncCount: number
  installPrompt: Event | null
  isInstalled: boolean
}

// Notification Types
export interface NotificationPermission {
  granted: boolean
  permission: NotificationPermission
}

export interface ReminderAlert {
  id: string
  medicationId: string
  medicationName: string
  dosage: string
  scheduledTime: string
  snoozeCount: number
}

// ============================================
// NEW FEATURES - Added types
// ============================================

// Blood Pressure
export interface BloodPressureReading {
  id: string
  userId: string
  systolic: number    // mmHg
  diastolic: number   // mmHg
  pulse?: number      // bpm
  recordedAt: string
  notes?: string
  createdAt: string
}

// Glucose readings (extended - separate from journal)
export interface GlucoseReading {
  id: string
  userId: string
  value: number       // mg/dL
  type: 'fasting' | 'postmeal' | 'random' | 'bedtime'
  recordedAt: string
  notes?: string
  createdAt: string
}

// Weight tracking
export interface WeightReading {
  id: string
  userId: string
  weightKg: number
  recordedAt: string
  notes?: string
  createdAt: string
}

// Caregiver / son access
export interface CaregiverLink {
  id: string
  patientUserId: string
  caregiverEmail: string
  status: 'pending' | 'active' | 'revoked'
  createdAt: string
}

// Daily summary for caregiver view
export interface DailySummary {
  date: string
  medicationAdherence: number  // 0-100 %
  footCheckDone: boolean
  glucoseRecorded: boolean
  hasAlerts: boolean
}
