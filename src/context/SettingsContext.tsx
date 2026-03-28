import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { profilesRepo } from '@/data/repos/profilesRepo'

interface SettingsContextType {
  lowVisionMode: boolean
  toggleLowVisionMode: () => Promise<void>
  notificationsEnabled: boolean
  requestNotificationPermission: () => Promise<boolean>
  soundEnabled: boolean
  toggleSound: () => void
  vibrationEnabled: boolean
  toggleVibration: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile } = useAuth()
  
  const [lowVisionMode, setLowVisionMode] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState(true)

  // Load settings from localStorage and user profile
  useEffect(() => {
    // Load from localStorage
    const savedSound = localStorage.getItem('contigo_soundEnabled')
    const savedVibration = localStorage.getItem('contigo_vibrationEnabled')
    
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true')
    }
    if (savedVibration !== null) {
      setVibrationEnabled(savedVibration === 'true')
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  // Sync low vision mode with user profile
  useEffect(() => {
    if (user) {
      setLowVisionMode(user.lowVisionMode)
    }
  }, [user])

  // Apply low vision mode class to body
  useEffect(() => {
    if (lowVisionMode) {
      document.body.classList.add('lowVision')
    } else {
      document.body.classList.remove('lowVision')
    }
  }, [lowVisionMode])

  const toggleLowVisionMode = useCallback(async () => {
    const newMode = !lowVisionMode
    setLowVisionMode(newMode)
    
    if (user) {
      await profilesRepo.toggleLowVisionMode(user.id, newMode)
      await updateProfile({ lowVisionMode: newMode })
    }
  }, [lowVisionMode, user, updateProfile])

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      const granted = permission === 'granted'
      setNotificationsEnabled(granted)
      return granted
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }, [])

  const toggleSound = useCallback(() => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    localStorage.setItem('contigo_soundEnabled', String(newValue))
  }, [soundEnabled])

  const toggleVibration = useCallback(() => {
    const newValue = !vibrationEnabled
    setVibrationEnabled(newValue)
    localStorage.setItem('contigo_vibrationEnabled', String(newValue))
  }, [vibrationEnabled])

  const value: SettingsContextType = {
    lowVisionMode,
    toggleLowVisionMode,
    notificationsEnabled,
    requestNotificationPermission,
    soundEnabled,
    toggleSound,
    vibrationEnabled,
    toggleVibration
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// Hook for playing alerts
export const useAlert = () => {
  const { soundEnabled, vibrationEnabled } = useSettings()

  const playAlert = useCallback(() => {
    // Play sound
    if (soundEnabled) {
      try {
        const audio = new Audio('/sounds/alert.mp3')
        audio.play().catch(() => {})
      } catch {}
    }

    // Vibrate
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([200, 100, 200])
    }
  }, [soundEnabled, vibrationEnabled])

  return { playAlert }
}
