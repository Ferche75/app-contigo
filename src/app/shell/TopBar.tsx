import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './TopBar.module.css'
import { Settings, User, Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { useAuth } from '@/context/AuthContext'

interface AppNotification {
  id: string
  title: string
  body: string
  receivedAt: string
  read: boolean
}

const NOTIF_KEY = (userId: string) => `contigo_notifications_${userId}`

const loadNotifications = (userId: string): AppNotification[] => {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY(userId)) || '[]')
  } catch { return [] }
}

const saveNotifications = (userId: string, notifs: AppNotification[]) => {
  localStorage.setItem(NOTIF_KEY(userId), JSON.stringify(notifs.slice(0, 50)))
}

// Called from sw.js message or push event to store notification
export const storeNotification = (userId: string, title: string, body: string) => {
  const notifs = loadNotifications(userId)
  notifs.unshift({
    id: crypto.randomUUID(),
    title,
    body,
    receivedAt: new Date().toISOString(),
    read: false
  })
  saveNotifications(userId, notifs)
}

export const TopBar: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      setNotifications(loadNotifications(user.id))
    }
  }, [user, showNotifs])

  // Close panel when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    if (showNotifs) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifs])

  // Listen for push notifications via service worker messages
  useEffect(() => {
    if (!user) return
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        storeNotification(user.id, event.data.title, event.data.body)
        setNotifications(loadNotifications(user.id))
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage)
  }, [user])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleOpenNotifs = () => {
    setShowNotifs(!showNotifs)
    // Mark all as read
    if (user && !showNotifs) {
      const updated = notifications.map(n => ({ ...n, read: true }))
      setNotifications(updated)
      saveNotifications(user.id, updated)
    }
  }

  const clearAll = () => {
    if (!user) return
    setNotifications([])
    saveNotifications(user.id, [])
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 2) return 'ahora'
    if (mins < 60) return `hace ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `hace ${hours}h`
    return `hace ${Math.floor(hours / 24)}d`
  }

  return (
    <header className={styles.topBar}>
      <div className={styles.container}>
        <div
          className={styles.brand}
          onClick={() => navigate('/today')}
          role="button"
          tabIndex={0}
        >
          <img src="/contigo-corto.png" alt="Contigo" className={styles.logoImg} />
        </div>

        <div className={styles.actions}>
          {/* Notification bell */}
          <div className={styles.bellWrap} ref={panelRef}>
            <button
              className={styles.iconButton}
              onClick={handleOpenNotifs}
              aria-label="Notificaciones"
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {showNotifs && (
              <div className={styles.notifPanel}>
                <div className={styles.notifHeader}>
                  <span className={styles.notifTitle}>Notificaciones</span>
                  {notifications.length > 0 && (
                    <button className={styles.clearBtn} onClick={clearAll}>Limpiar</button>
                  )}
                </div>
                <div className={styles.notifList}>
                  {notifications.length === 0 ? (
                    <div className={styles.notifEmpty}>Sin notificaciones</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`${styles.notifItem} ${n.read ? styles.notifRead : ''}`}>
                        <div className={styles.notifItemTitle}>{n.title}</div>
                        <div className={styles.notifItemBody}>{n.body}</div>
                        <div className={styles.notifItemTime}>{timeAgo(n.receivedAt)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="small"
            onClick={() => navigate('/profile')}
            aria-label="Perfil"
            className={styles.iconButton}
          >
            <User size={24} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => navigate('/profile')}
            aria-label="Configuración"
            className={styles.iconButton}
          >
            <Settings size={24} />
          </Button>
        </div>
      </div>
    </header>
  )
}