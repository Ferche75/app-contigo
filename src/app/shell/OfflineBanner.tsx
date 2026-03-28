import React from 'react'
import styles from './OfflineBanner.module.css'
import { WifiOff, Wifi } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus()

  // Show when offline
  if (!isOnline) {
    return (
      <div className={styles.banner} role="status" aria-live="polite">
        <WifiOff size={18} />
        <span>Sin conexión. Los datos se sincronarán cuando vuelvas a estar en línea.</span>
      </div>
    )
  }

  // Show "back online" message briefly
  if (wasOffline) {
    return (
      <div className={`${styles.banner} ${styles.online}`} role="status" aria-live="polite">
        <Wifi size={18} />
        <span>¡Conexión restaurada!</span>
      </div>
    )
  }

  return null
}
