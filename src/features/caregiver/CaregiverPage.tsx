// src/features/caregiver/CaregiverPage.tsx
import React, { useEffect, useState } from 'react'
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
  Clock
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { caregiverRepo } from '@/data/repos/caregiverRepo'
import type { PatientSummary } from '@/data/repos/caregiverRepo'

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

export const CaregiverPage: React.FC = () => {
  const { user } = useAuth()
  const [summary, setSummary] = useState<PatientSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Code activation
  const [code, setCode] = useState('')
  const [activating, setActivating] = useState(false)
  const [codeError, setCodeError] = useState('')

  useEffect(() => {
    if (user) load()
  }, [user])

  const load = async () => {
    if (!user) return
    setLoading(true)
    const s = await caregiverRepo.getPatientSummary(user.id)
    setSummary(s)
    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleActivate = async () => {
    if (!user || code.length !== 6) return
    setActivating(true)
    setCodeError('')
    const result = await caregiverRepo.activateCode(code.trim(), user.id)
    if (result === 'ok') {
      setCode('')
      await load()
    } else if (result === 'not_found') {
      setCodeError('Código incorrecto o expirado. Pedile a tu familiar que genere uno nuevo.')
    } else {
      setCodeError('Este código ya fue usado.')
    }
    setActivating(false)
  }

  const handleDisconnect = async () => {
    if (!user) return
    if (!confirm('¿Desconectarte del paciente? Deberás ingresar un nuevo código para volver a conectarte.')) return
    await caregiverRepo.removeAsCaregiver(user.id)
    setSummary(null)
  }

  // ── Glucose status helper ────────────────────────────────
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

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingText}>Cargando...</div>
      </div>
    )
  }

  // ── No patient linked yet ────────────────────────────────
  if (!summary) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h2 className={styles.title}>Modo cuidador</h2>
          <p className={styles.subtitle}>Ingresá el código de 6 dígitos que te compartió tu familiar</p>
        </header>

        <Card>
          <CardContent>
            <div className={styles.codeForm}>
              <Input
                label="Código de acceso"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                fullWidth
                style={{ fontSize: '2rem', textAlign: 'center', letterSpacing: '0.4em', fontWeight: 700 }}
              />
              {codeError && <p className={styles.codeError}>{codeError}</p>}
              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={handleActivate}
                loading={activating}
                disabled={code.length !== 6}
              >
                Conectarme
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className={styles.hint}>
              <strong>¿Cómo obtener el código?</strong><br />
              Tu familiar tiene que ir a <strong>Perfil → Modo cuidador</strong> y tocar "Generar código". 
              El código tiene 10 minutos de validez.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Patient summary view ─────────────────────────────────
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
      <header className={styles.header}>
        <div className={styles.headerTop}>
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
        </div>
      </header>

      {/* Alert banner */}
      {hasAlerts && (
        <div className={styles.alertBanner}>
          <AlertTriangle size={20} />
          <span>Hay alertas que requieren tu atención</span>
        </div>
      )}

      {!hasAlerts && (
        <div className={styles.okBanner}>
          <CheckCircle2 size={20} />
          <span>Todo en orden hoy</span>
        </div>
      )}

      {/* Medication card */}
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

      {/* Foot check card */}
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

      {/* Glucose card */}
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

      {/* Blood pressure card */}
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

      {/* Disconnect */}
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