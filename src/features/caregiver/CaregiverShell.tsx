// src/features/caregiver/CaregiverShell.tsx
import React, { useEffect, useState, useRef } from 'react'
import styles from './CaregiverShell.module.css'
import {
  RefreshCw, LogOut
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { caregiverRepo } from '@/data/repos/caregiverRepo'
import type { PatientSummary } from '@/data/repos/caregiverRepo'
import { CaregiverPage } from './CaregiverPage'

interface Props {
  isOnline: boolean
}

export const CaregiverShell: React.FC<Props> = ({ isOnline }) => {
  const { user, signOut } = useAuth()
  const [summary, setSummary] = useState<PatientSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const isLoadingRef = useRef(false)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    if (userIdRef.current === user.id && !loading) return
    
    userIdRef.current = user.id
    
    const loadOnce = async () => {
      if (isLoadingRef.current) return
      isLoadingRef.current = true
      
      try {
        const s = await caregiverRepo.getPatientSummary(user.id)
        setSummary(s)
      } finally {
        setLoading(false)
        isLoadingRef.current = false
      }
    }
    
    loadOnce()
  }, [user?.id])

  const handleRefresh = async () => {
    if (!user?.id || refreshing) return
    setRefreshing(true)
    try {
      const s = await caregiverRepo.getPatientSummary(user.id)
      setSummary(s)
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const handlePatientConnected = () => {
    // Recargar datos cuando se conecta un paciente
    if (user?.id) {
      setLoading(true)
      caregiverRepo.getPatientSummary(user.id).then(s => {
        setSummary(s)
        setLoading(false)
      })
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src="/contigo-corto.png" alt="Contigo" className={styles.logo} />
        </div>
        <div className={styles.headerRight}>
          <button className={styles.iconBtn} onClick={handleRefresh} disabled={refreshing} aria-label="Actualizar">
            <RefreshCw size={20} className={refreshing ? styles.spinning : ''} />
          </button>
          <button className={styles.iconBtn} onClick={handleLogout} aria-label="Salir">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {!isOnline && (
        <div className={styles.offlineBanner}>Sin conexión — mostrando última información</div>
      )}

      <main className={styles.main}>
        <CaregiverPage 
          summary={summary} 
          loading={loading} 
          onPatientConnected={handlePatientConnected}
        />
      </main>
    </div>
  )
}
