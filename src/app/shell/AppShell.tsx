import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import styles from './AppShell.module.css'
import { TopBar } from './TopBar'
import { TabBar } from './TabBar'
import { EmergencyFab } from './EmergencyFab'
import { OfflineBanner } from './OfflineBanner'
import { useAuth } from '@/context/AuthContext'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { CaregiverShell } from '@/features/caregiver/CaregiverShell'

export const AppShell: React.FC = () => {
  const { isAuthenticated, isCaregiver } = useAuth()
  const { isOnline } = useNetworkStatus()
  const location = useLocation()

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  if (!isAuthenticated || isAuthPage) {
    return (
      <div className={styles.shell}>
        <Outlet />
      </div>
    )
  }

  if (isCaregiver) {
    return <CaregiverShell isOnline={isOnline} />
  }

  return (
    <div className={styles.shell}>
      <TopBar />
      {!isOnline && <OfflineBanner />}
      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
      <EmergencyFab />
      <TabBar />
    </div>
  )
}
