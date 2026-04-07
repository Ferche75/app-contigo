// src/features/caregiver/CaregiverPage.tsx
import React, { useState } from 'react'
import styles from './CaregiverPage.module.css'
import { Card, CardContent } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import {
  Pill,
  Footprints,
  Droplets,
  Heart,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  UserX,
  Clock,
  Edit3
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { caregiverRepo } from '@/data/repos/caregiverRepo'
import type { PatientSummary } from '@/data/repos/caregiverRepo'

interface Props {
  summary: PatientSummary | null
  loading: boolean
  onPatientConnected: () => void
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

export const CaregiverPage: React.FC<Props> = ({ summary, loading, onPatientConnected }) => {
  const { user } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  const [code, setCode] = useState('')
  const [activating, setActivating] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [showChangeCode, setShowChangeCode] = useState(false)

  const handleRefresh = async () => {
    if (!user) return
    setRefreshing(true)
    // No hacemos nada, el refresh viene del padre
    setTimeout(() => setRefreshing(false), 500)
  }

  const handleActivate = async () => {
    if (!user || code.length !== 6) return
    setActivating(true)
    setCodeError('')
    const result = await caregiverRepo.activateCode(code.trim(), user.id)
    if (result === 'ok') {
      setCode('')
      setShowChangeCode(false)
      onPatientConnected() // Avisar al padre que recargue
    } else if (result === 'not_found') {
      setCodeError('Código incorrecto o expirado.')
    } else {
      setCodeError('Este código ya fue usado.')
    }
    setActivating(false)
  }

  const handleDisconnect = async () => {
    if (!user) return
    if (!confirm('¿Desconectarte del paciente?')) return
    await caregiverRepo.removeAsCaregiver(user.id)
    onPatientConnected() // Recargar
  }

  const handleChangePatient = () => {
    setShowChangeCode(true)
    setCode('')
    setCodeError('')
  }

  const getGlucoseStatus = (value: number | null, type: string | null) => {
    if (!value) return null
    if (value < 70) return 'low'
    if (type === 'fasting') {
      if (value <= 100) return 'normal'
      if (value <= 125) return 'elevated'
      return 'high'
    }
    if (value <= 140) return 'normal'
    if (value <= 199) return 'elevated'
    return 'high'
  }

  const getBpStatus = (sys: number | null, dia: number | null) => {
    if (!sys || !dia) return null
    if (sys >= 180 || dia >= 120) return 'crisis'
    if (sys >= 140 || dia >= 90) return 'high'
    if (sys >= 130 || dia >= 80) return 'elevated'
    return 'normal'
  }

  if (loading) {
    return <div className={styles.loadingText}>Cargando...</div>
  }

  // SIN PACIENTE - Mostrar input de código
  if (!summary || showChangeCode) {
    return (
      <div className={styles.noPatientContainer}>
        <div className={styles.noPatientIcon}>👥</div>
        <h2>Sin paciente vinculado</h2>
        <p>Ingresá el código de 6 dígitos que te compartió tu familiar</p>
        
        <div className={styles.codeInputSection}>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            className={styles.codeInput}
            maxLength={6}
          />
          {codeError && <p className={styles.codeError}>{codeError}</p>}
          <button 
            className={styles.connectBtn}
            onClick={handleActivate}
            disabled={code.length !== 6 || activating}
          >
            {activating ? 'Conectando...' : 'Conectarme'}
          </button>
        </div>
        
        <p className={styles.hint}>
          ¿No tenés código? Pedile a tu familiar que genere uno desde <strong>Perfil → Modo cuidador</strong>.
        </p>
        
        {showChangeCode && (
          <button 
            className={styles.cancelBtn}
            onClick={() => setShowChangeCode(false)}
          >
            Cancelar
          </button>
        )}
      </div>
    )
  }

  // CON PACIENTE - Mostrar resumen
  const glucoseStatus = getGlucoseStatus(summary.lastGlucose, summary.lastGlucoseType)
  const bpStatus = getBpStatus(summary.lastBpSystolic, summary.lastBpDiastolic)
  const medsOk = summary.medsTotal > 0 && summary.medsTaken === summary.medsTotal
  const medsMissing = summary.medsTotal > 0 && summary.medsTaken < summary.medsTotal

  const hasAlerts =
    summary.footWoundFound ||
    (glucoseStatus && glucoseStatus !== 'normal') ||
    (bpStatus && bpStatus !== 'normal') ||
    medsMissing

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h2 className={styles.title}>{summary.patientName}</h2>
          <p className={styles.subtitle}>Resumen de hoy</p>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Actualizar"
        >
          <RefreshCw size={20} className={refreshing ? styles.spinning : ''} />
        </button>
      </header>

      {hasAlerts ? (
        <div className={styles.alertBanner}>
          <AlertTriangle size={20} />
          <span>Hay alertas que requieren tu atención</span>
        </div>
      ) : (
        <div className={styles.okBanner}>
          <CheckCircle2 size={20} />
          <span>Todo en orden hoy</span>
        </div>
      )}

      <Card className={medsMissing ? styles.cardAlert : ''}>
        <CardContent>
          <div className={styles.cardRow}>
            <div className={styles.cardIcon}>
              <Pill size={22} color={medsMissing ? 'var(--color-warning)' : 'var(--color-primary)'} />
            </div>
            <div className={styles.cardInfo}>
              <div className={styles.cardTitle}>Medicación</div>
              <div className={styles.cardValue}>
                {summary.medsTotal === 0
                  ? 'Sin medicamentos hoy'
                  : `${summary.medsTaken} de ${summary.medsTotal} tomados`}
              </div>
            </div>
            <div className={styles.cardStatus}>
              {summary.medsTotal === 0 ? null
                : medsOk
                  ? <CheckCircle2 size={24} color="var(--color-success)" />
                  : <XCircle size={24} color="var(--color-warning)" />}
            </div>
          </div>
          {medsMissing && (
            <p className={styles.cardHint}>
              Faltan {summary.medsTotal - summary.medsTaken} medicamentos por tomar
            </p>
          )}
        </CardContent>
      </Card>

      <Card className={summary.footWoundFound ? styles.cardAlert : ''}>
        <CardContent>
          <div className={styles.cardRow}>
            <div className={styles.cardIcon}>
              <Footprints size={22} color={summary.footWoundFound ? 'var(--color-danger)' : 'var(--color-primary)'} />
            </div>
            <div className={styles.cardInfo}>
              <div className={styles.cardTitle}>Revisión de pies</div>
              <div className={styles.cardValue}>
                {!summary.footCheckDone
                  ? 'No revisó hoy'
                  : summary.footWoundFound
                    ? 'Se detectó una herida'
                    : 'Todo bien'}
              </div>
            </div>
            <div className={styles.cardStatus}>
              {!summary.footCheckDone
                ? <Clock size={24} color="var(--color-text-muted)" />
                : summary.footWoundFound
                  ? <AlertTriangle size={24} color="var(--color-danger)" />
                  : <CheckCircle2 size={24} color="var(--color-success)" />}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={glucoseStatus && glucoseStatus !== 'normal' ? styles.cardAlert : ''}>
        <CardContent>
          <div className={styles.cardRow}>
            <div className={styles.cardIcon}>
              <Droplets size={22} color={
                !glucoseStatus ? 'var(--color-text-muted)'
                  : glucoseStatus === 'normal' ? 'var(--color-primary)'
                  : 'var(--color-warning)'
              } />
            </div>
            <div className={styles.cardInfo}>
              <div className={styles.cardTitle}>Glucosa</div>
              <div className={styles.cardValue}>
                {summary.lastGlucose
                  ? `${summary.lastGlucose} mg/dL`
                  : 'Sin registro hoy'}
              </div>
              {summary.lastGlucoseAt && (
                <div className={styles.cardTime}>{timeAgo(summary.lastGlucoseAt)}</div>
              )}
            </div>
            <div className={styles.cardStatus}>
              {glucoseStatus === 'normal' && <CheckCircle2 size={24} color="var(--color-success)" />}
              {glucoseStatus && glucoseStatus !== 'normal' && <AlertTriangle size={24} color="var(--color-warning)" />}
              {!glucoseStatus && <Clock size={24} color="var(--color-text-muted)" />}
            </div>
          </div>
          {glucoseStatus && glucoseStatus !== 'normal' && (
            <p className={styles.cardHint}>
              {glucoseStatus === 'low' ? 'Glucosa baja — verificar' : 'Glucosa elevada — consultar'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className={bpStatus && bpStatus !== 'normal' ? styles.cardAlert : ''}>
        <CardContent>
          <div className={styles.cardRow}>
            <div className={styles.cardIcon}>
              <Heart size={22} color={
                !bpStatus ? 'var(--color-text-muted)'
                  : bpStatus === 'normal' ? 'var(--color-primary)'
                  : 'var(--color-danger)'
              } />
            </div>
            <div className={styles.cardInfo}>
              <div className={styles.cardTitle}>Presión arterial</div>
              <div className={styles.cardValue}>
                {summary.lastBpSystolic
                  ? `${summary.lastBpSystolic}/${summary.lastBpDiastolic} mmHg`
                  : 'Sin registro hoy'}
              </div>
              {summary.lastBpAt && (
                <div className={styles.cardTime}>{timeAgo(summary.lastBpAt)}</div>
              )}
            </div>
            <div className={styles.cardStatus}>
              {bpStatus === 'normal' && <CheckCircle2 size={24} color="var(--color-success)" />}
              {bpStatus && bpStatus !== 'normal' && <AlertTriangle size={24} color="var(--color-danger)" />}
              {!bpStatus && <Clock size={24} color="var(--color-text-muted)" />}
            </div>
          </div>
          {bpStatus && bpStatus !== 'normal' && (
            <p className={styles.cardHint}>
              {bpStatus === 'crisis' ? '⚠️ Presión en crisis — buscar atención inmediata' : 'Presión elevada — consultar al médico'}
            </p>
          )}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="medium"
        fullWidth
        leftIcon={<Edit3 size={18} />}
        onClick={handleChangePatient}
        className={styles.changePatientBtn}
      >
        Cambiar paciente (ingresar nuevo código)
      </Button>

      <Button
        variant="ghost"
        size="medium"
        fullWidth
        leftIcon={<UserX size={18} />}
        onClick={handleDisconnect}
        className={styles.disconnectBtn}
      >
        Desconectarme de {summary.patientName}
      </Button>
    </div>
  )
}
