import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { SettingsProvider } from '@/context/SettingsContext'
import { AppShell } from './shell/AppShell'
import { LoginPage } from '@/features/onboarding/LoginPage'
import { RegisterPage } from '@/features/onboarding/RegisterPage'
import { TodayPage } from '@/features/today/TodayPage'
import { MedsPage } from '@/features/meds/MedsPage'
import { FootCarePage } from '@/features/footcare/FootCarePage'
import { VitalsPage } from '@/features/vitals/VitalsPage'
import { AppointmentsPage } from '@/features/appointments/AppointmentsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { EmergencyPage } from '@/features/profile/EmergencyPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { CaregiverPage } from '@/features/caregiver/CaregiverPage'
import { notificationService } from '@/services/notificationService'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div>Cargando...</div></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()
  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div>Cargando...</div></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/today" replace />
  return <>{children}</>
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div>Cargando...</div></div>
  if (isAuthenticated) return <Navigate to="/today" replace />
  return <>{children}</>
}

// Auto-subscribe patient to push when they open the app
const PushSubscriber: React.FC = () => {
  const { user, isCaregiver } = useAuth()

  useEffect(() => {
    if (user && !isCaregiver && notificationService.isSupported()) {
      setTimeout(() => {
        notificationService.requestPermission().then(granted => {
          if (granted) {
            notificationService.subscribeToPush(user.id)
          }
        })
      }, 3000)
    }
  }, [user, isCaregiver])

  return null
}

const AppWithSettings: React.FC = () => {
  return (
    <SettingsProvider>
      <PushSubscriber />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/today" element={<TodayPage />} />
          <Route path="/meds" element={<MedsPage />} />
          <Route path="/vitals" element={<VitalsPage />} />
          <Route path="/footcare" element={<FootCarePage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/caregiver" element={<CaregiverPage />} />
        </Route>

        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </SettingsProvider>
  )
}

function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('SW registered'))
        .catch(err => console.log('SW registration failed:', err))
    }
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppWithSettings />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: { background: '#1f2937', color: '#fff', padding: '16px', borderRadius: '12px' },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App