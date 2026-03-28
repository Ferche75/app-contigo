// src/services/notificationService.ts
import { supabase } from '@/data/supabase/client'

const VAPID_PUBLIC_KEY = 'BKgjmuvy7ZAdcoB-m0kIbDw1dvQ9XrJyeaNs-dlnrmaSvJIK0araZOOIc_1Nl-i57NQg8F2bzMHfruVvVOB8qFc'
const SUPABASE_URL = 'https://urapmtfohsaiwsvwbazt.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_LEGACY_KEY as string

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    const result = await Notification.requestPermission()
    return result === 'granted'
  },

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator
  },

  getPermission(): NotificationPermission {
    return Notification.permission
  },

  async subscribeToPush(userId: string): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

      const permission = await this.requestPermission()
      if (!permission) return false

      const reg = await navigator.serviceWorker.ready
      const existingSub = await reg.pushManager.getSubscription()
      let subscription = existingSub

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          subscription: subscription.toJSON(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (error) {
        console.error('Error saving push subscription:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error subscribing to push:', error)
      return false
    }
  },

  async sendReminderToPatient(patientUserId: string, caregiverName: string, message: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No session found')
        return false
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          patient_user_id: patientUserId,
          title: `Recordatorio de ${caregiverName}`,
          body: message,
        })
      })

      if (!response.ok) {
        const text = await response.text()
        console.error('Edge Function error:', response.status, text)
        return false
      }

      const data = await response.json()
      return data?.success === true
    } catch (error) {
      console.error('Error calling send-push function:', error)
      return false
    }
  },

  async showLocal(title: string, body: string, tag?: string): Promise<void> {
    if (Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker.ready
    // vibrate is not in standard NotificationOptions type but works at runtime
    await reg.showNotification(title, {
      body,
      icon: '/logoc.png',
      badge: '/logoc.png',
      tag: tag || 'contigo',
      data: { vibrate: [200, 100, 200] }
    })
  },

  scheduleReminder(title: string, body: string, scheduledTime: Date, tag?: string): ReturnType<typeof setTimeout> | null {
    const delay = scheduledTime.getTime() - Date.now()
    if (delay < 0) return null
    return setTimeout(() => { this.showLocal(title, body, tag) }, delay)
  },

  scheduleMedicationReminders(medications: Array<{ name: string; dosage: string; scheduledTime: string; logId: string }>): void {
    if (Notification.permission !== 'granted') return
    medications.forEach(med => {
      const scheduledDate = new Date(med.scheduledTime)
      this.scheduleReminder(`💊 Hora de tomar ${med.name}`, `Dosis: ${med.dosage}`, scheduledDate, `med-${med.logId}`)
    })
  },

  clearAllTimers(): void {
    const timers = (window as unknown as Record<string, unknown[]>)._contigoTimers
    if (Array.isArray(timers)) {
      timers.forEach(t => clearTimeout(t as ReturnType<typeof setTimeout>))
    }
  }
}