import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './TabBar.module.css'
import { Calendar, Home, Pill, Footprints, Activity } from 'lucide-react'
import clsx from 'clsx'

interface TabItem {
  path: string
  label: string
  icon: React.ElementType
}

const tabs: TabItem[] = [
  { path: '/today', label: 'Hoy', icon: Home },
  { path: '/meds', label: 'Medicación', icon: Pill },
  { path: '/vitals', label: 'Signos', icon: Activity },
  { path: '/footcare', label: 'Pies', icon: Footprints },
  { path: '/appointments', label: 'Turnos', icon: Calendar },
]

export const TabBar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!isMobile) return null

  return (
    <nav className={styles.tabBar} role="navigation" aria-label="Navegación principal">
      <div className={styles.container}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = location.pathname === tab.path || 
            (tab.path !== '/today' && location.pathname.startsWith(tab.path))

          return (
            <button
              key={tab.path}
              className={clsx(styles.tab, isActive && styles.active)}
              onClick={() => navigate(tab.path)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.label}
            >
              <Icon 
                size={22} 
                className={styles.icon}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className={styles.label}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
