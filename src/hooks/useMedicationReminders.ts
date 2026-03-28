import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { medLogsRepo } from '@/data/repos/medsRepo'
import type { MedicationLog } from '@/types'

interface ReminderAlert {
  log: MedicationLog
  medicationName: string
  dosage: string
  scheduledTime: string
}

export const useMedicationReminders = () => {
  const { user } = useAuth()
  const [pendingReminders, setPendingReminders] = useState<ReminderAlert[]>([])
  const [currentAlert, setCurrentAlert] = useState<ReminderAlert | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check for pending reminders
  const checkReminders = useCallback(async () => {
    if (!user) return

    try {
      const pending = await medLogsRepo.getPending(user.id)
      
      const alerts: ReminderAlert[] = pending.map(log => ({
        log,
        medicationName: log.medicationId, // Will be resolved by component
        dosage: '', // Will be resolved by component
        scheduledTime: log.scheduledTime
      }))

      setPendingReminders(alerts)

      // Show alert if there's a pending reminder and no current alert
      if (alerts.length > 0 && !currentAlert) {
        setCurrentAlert(alerts[0])
      }
    } catch (error) {
      console.error('Error checking reminders:', error)
    }
  }, [user, currentAlert])

  // Start checking for reminders
  useEffect(() => {
    if (!user) return

    // Check immediately
    checkReminders()

    // Check every minute
    intervalRef.current = setInterval(checkReminders, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user, checkReminders])

  // Mark reminder as taken
  const markTaken = useCallback(async (logId: string) => {
    try {
      await medLogsRepo.markTaken(logId)
      
      // Remove from pending
      setPendingReminders(prev => prev.filter(r => r.log.id !== logId))
      
      // Clear current alert
      if (currentAlert?.log.id === logId) {
        setCurrentAlert(null)
      }
    } catch (error) {
      console.error('Error marking as taken:', error)
    }
  }, [currentAlert])

  // Skip reminder
  const skipReminder = useCallback(async (logId: string, reason?: string) => {
    try {
      await medLogsRepo.markSkipped(logId, reason)
      
      // Remove from pending
      setPendingReminders(prev => prev.filter(r => r.log.id !== logId))
      
      // Clear current alert
      if (currentAlert?.log.id === logId) {
        setCurrentAlert(null)
      }
    } catch (error) {
      console.error('Error skipping reminder:', error)
    }
  }, [currentAlert])

  // Postpone reminder
  const postponeReminder = useCallback(async (logId: string, minutes: number) => {
    try {
      const postponeTo = new Date(Date.now() + minutes * 60000).toISOString()
      await medLogsRepo.postpone(logId, postponeTo)
      
      // Remove from pending (will reappear after postpone time)
      setPendingReminders(prev => prev.filter(r => r.log.id !== logId))
      
      // Clear current alert
      if (currentAlert?.log.id === logId) {
        setCurrentAlert(null)
      }
    } catch (error) {
      console.error('Error postponing reminder:', error)
    }
  }, [currentAlert])

  // Dismiss current alert
  const dismissAlert = useCallback(() => {
    setCurrentAlert(null)
  }, [])

  // Show next alert
  const showNextAlert = useCallback(() => {
    const remaining = pendingReminders.filter(r => r.log.id !== currentAlert?.log.id)
    if (remaining.length > 0) {
      setCurrentAlert(remaining[0])
    } else {
      setCurrentAlert(null)
    }
  }, [pendingReminders, currentAlert])

  return {
    pendingReminders,
    currentAlert,
    hasReminders: pendingReminders.length > 0,
    markTaken,
    skipReminder,
    postponeReminder,
    dismissAlert,
    showNextAlert
  }
}
