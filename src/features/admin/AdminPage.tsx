import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './AdminPage.module.css'
import { Card, CardHeader, CardContent } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { 
  Users, 
  LogOut,
  Download,
  ArrowLeft
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/data/supabase/client'

interface AdminMetrics {
  totalUsers: number
  active7Days: number
  active30Days: number
  totalReminders: number
  totalLogs: number
  totalWounds: number
  avgAdherence: number
}

interface AdminUser {
  id: string
  email: string
  name: string
  createdAt: string
  lastActive: string
}

export const AdminPage: React.FC = () => {
  const navigate = useNavigate()
  const { isAdmin, signOut } = useAuth()
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) {
      navigate('/today')
      return
    }
    loadAdminData()
  }, [isAdmin, navigate])

  const loadAdminData = async () => {
    setIsLoading(true)
    try {
      // Get metrics from function
      const { data: metricsData } = await supabase
        .rpc('get_admin_metrics')
      
      if (metricsData && (metricsData as any[])[0]) {
        const m = (metricsData as any[])[0]
        setMetrics({
          totalUsers: m.total_users,
          active7Days: m.active_7_days,
          active30Days: m.active_30_days,
          totalReminders: m.total_reminders,
          totalLogs: m.total_logs,
          totalWounds: m.total_wounds,
          avgAdherence: Math.round(m.avg_adherence || 0)
        })
      }

      // Get users list
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, name, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (profiles) {
        setUsers((profiles as any[]).map(p => ({
          id: p.id,
          email: p.email,
          name: p.name,
          createdAt: p.created_at,
          lastActive: p.updated_at
        })))
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportCSV = () => {
    const csv = [
      ['ID', 'Nombre', 'Email', 'Fecha de registro', 'Última actividad'].join(','),
      ...users.map(u => [
        u.id,
        u.name,
        u.email,
        new Date(u.createdAt).toLocaleDateString('es-ES'),
        new Date(u.lastActive).toLocaleDateString('es-ES')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usuarios-contigo-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  if (!isAdmin) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Button
          variant="ghost"
          size="small"
          leftIcon={<ArrowLeft size={20} />}
          onClick={() => navigate('/today')}
        >
          Volver
        </Button>
        <h2 className={styles.title}>Panel de Administración</h2>
        <Button
          variant="ghost"
          size="small"
          leftIcon={<LogOut size={20} />}
          onClick={handleLogout}
        >
          Salir
        </Button>
      </header>

      {isLoading ? (
        <p className={styles.loading}>Cargando...</p>
      ) : (
        <>
          {/* Metrics */}
          <div className={styles.metricsGrid}>
            <Card className={styles.metricCard}>
              <div className={styles.metricValue}>{metrics?.totalUsers || 0}</div>
              <div className={styles.metricLabel}>Usuarios totales</div>
            </Card>
            
            <Card className={styles.metricCard}>
              <div className={styles.metricValue}>{metrics?.active7Days || 0}</div>
              <div className={styles.metricLabel}>Activos (7 días)</div>
            </Card>
            
            <Card className={styles.metricCard}>
              <div className={styles.metricValue}>{metrics?.active30Days || 0}</div>
              <div className={styles.metricLabel}>Activos (30 días)</div>
            </Card>
            
            <Card className={styles.metricCard}>
              <div className={styles.metricValue}>{metrics?.avgAdherence || 0}%</div>
              <div className={styles.metricLabel}>Adherencia promedio</div>
            </Card>
            
            <Card className={styles.metricCard}>
              <div className={styles.metricValue}>{metrics?.totalReminders || 0}</div>
              <div className={styles.metricLabel}>Recordatorios</div>
            </Card>
            
            <Card className={styles.metricCard}>
              <div className={styles.metricValue}>{metrics?.totalWounds || 0}</div>
              <div className={styles.metricLabel}>Heridas reportadas</div>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader
              title="Usuarios"
              subtitle={`${users.length} usuarios registrados`}
              icon={<Users size={20} />}
              action={
                <Button
                  variant="outline"
                  size="small"
                  leftIcon={<Download size={16} />}
                  onClick={handleExportCSV}
                >
                  Exportar CSV
                </Button>
              }
            />
            <CardContent>
              <div className={styles.usersTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Registro</th>
                      <th>Última actividad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{new Date(u.createdAt).toLocaleDateString('es-ES')}</td>
                        <td>{new Date(u.lastActive).toLocaleDateString('es-ES')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <footer className={styles.footer}>
            <p>Developed by cheves.co</p>
          </footer>
        </>
      )}
    </div>
  )
}
