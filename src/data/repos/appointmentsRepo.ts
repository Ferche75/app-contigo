import { appointmentOps } from '@/data/local/db'
import { syncEngine } from '@/data/sync/syncEngine'
import type { Appointment } from '@/types'

export const appointmentsRepo = {
  // Get all appointments for user
  async getAll(userId: string): Promise<Appointment[]> {
    return await appointmentOps.getAll(userId)
  },

  // Get upcoming appointments
  async getUpcoming(userId: string, limit: number = 5): Promise<Appointment[]> {
    return await appointmentOps.getUpcoming(userId, limit)
  },

  // Get single appointment
  async get(id: string): Promise<Appointment | undefined> {
    return await appointmentOps.get(id)
  },

  // Create appointment
  async create(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const newAppt: Appointment = {
      ...appointment,
      id,
      createdAt: now,
      updatedAt: now
    }

    // Save locally first
    await appointmentOps.put(newAppt)

    // Queue for sync
    await syncEngine.queueOperation('appointments', 'insert', {
      id,
      user_id: appointment.userId,
      doctor_name: appointment.doctorName,
      specialty: appointment.specialty,
      date: appointment.date,
      time: appointment.time,
      location: appointment.location,
      notes: appointment.notes,
      reminder_24h: appointment.reminder24h,
      reminder_2h: appointment.reminder2h,
      created_at: now,
      updated_at: now
    })

    return newAppt
  },

  // Update appointment
  async update(id: string, updates: Partial<Appointment>): Promise<void> {
    const existing = await appointmentOps.get(id)
    if (!existing) throw new Error('Appointment not found')

    const now = new Date().toISOString()
    const updated: Appointment = {
      ...existing,
      ...updates,
      id,
      updatedAt: now
    }

    // Save locally
    await appointmentOps.put(updated)

    // Queue for sync
    await syncEngine.queueOperation('appointments', 'update', {
      id,
      doctor_name: updated.doctorName,
      specialty: updated.specialty,
      date: updated.date,
      time: updated.time,
      location: updated.location,
      notes: updated.notes,
      reminder_24h: updated.reminder24h,
      reminder_2h: updated.reminder2h,
      updated_at: now
    })
  },

  // Delete appointment
  async delete(id: string): Promise<void> {
    await appointmentOps.delete(id)
    await syncEngine.queueOperation('appointments', 'delete', { id })
  },

  // Get next appointment
  async getNext(userId: string): Promise<Appointment | null> {
    const upcoming = await appointmentOps.getUpcoming(userId, 1)
    return upcoming[0] || null
  },

  // Check for reminders due
  async getDueReminders(userId: string): Promise<Appointment[]> {
    const all = await appointmentOps.getAll(userId)
    const now = new Date()
    const due: Appointment[] = []

    for (const appt of all) {
      const apptDateTime = new Date(`${appt.date}T${appt.time}`)
      
      // Check 24h reminder
      if (appt.reminder24h) {
        const reminder24hTime = new Date(apptDateTime.getTime() - 24 * 60 * 60 * 1000)
        const diff24h = now.getTime() - reminder24hTime.getTime()
        if (diff24h >= 0 && diff24h < 60 * 60 * 1000) { // Within the hour
          due.push(appt)
          continue
        }
      }

      // Check 2h reminder
      if (appt.reminder2h) {
        const reminder2hTime = new Date(apptDateTime.getTime() - 2 * 60 * 60 * 1000)
        const diff2h = now.getTime() - reminder2hTime.getTime()
        if (diff2h >= 0 && diff2h < 60 * 60 * 1000) { // Within the hour
          due.push(appt)
        }
      }
    }

    return due
  },

  // Format appointment for display
  formatDisplay(appointment: Appointment): {
    date: string
    time: string
    fullDateTime: string
    isToday: boolean
    isTomorrow: boolean
    daysUntil: number
  } {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const apptDate = new Date(appointment.date)
    apptDate.setHours(0, 0, 0, 0)
    
    const diffTime = apptDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const dateFormatter = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const timeFormatter = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })

    return {
      date: dateFormatter.format(apptDate),
      time: timeFormatter.format(new Date(`2000-01-01T${appointment.time}`)),
      fullDateTime: `${dateFormatter.format(apptDate)} a las ${timeFormatter.format(new Date(`2000-01-01T${appointment.time}`))}`,
      isToday: diffDays === 0,
      isTomorrow: diffDays === 1,
      daysUntil: diffDays
    }
  },

  // Generate ICS content for calendar export
  generateICS(appointment: Appointment): string {
    const startDate = new Date(`${appointment.date}T${appointment.time}`)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hour duration

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Contigo//Turno Médico//ES
BEGIN:VEVENT
UID:${appointment.id}@contigo.app
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Turno médico: ${appointment.doctorName}
${appointment.specialty ? `DESCRIPTION:${appointment.specialty}\n` : ''}${appointment.location ? `LOCATION:${appointment.location}\n` : ''}END:VEVENT
END:VCALENDAR`
  }
}
