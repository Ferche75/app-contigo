// src/features/caregiver/CaregiverShell.tsx
import React, { useEffect, useState } from 'react'
import styles from './CaregiverShell.module.css'
import {
  Pill, Footprints, Droplets, Heart,
  CheckCircle2, XCircle, AlertTriangle, Clock,
  RefreshCw, Phone, MessageCircle, Bell, LogOut, Send, X
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { caregiverRepo } from '@/data/repos/caregiverRepo'
import { notificationService } from '@/services/notificationService'
import type { PatientSummary } from '@/data/repos/caregiverRepo'

interface Props {
  isOnline: boolean
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

export const CaregiverShell: React.FC<Props> = ({ isOnline }) => {
  const { user, signOut } = useAuth()
  const [summary, setSummary] = useState<PatientSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Reminder modal state
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
  if (user) load()
  const interval = setInterval(() => { 
    if (user) load() 
  }, 5 * 60 * 1000) // 5 minutos
  
  return () => clearInterval(interval) // Esto está bien
}, [user])

  const load = async () => {
    if (!user) return
    const s = await caregiverRepo.getPatientSummary(user.id)
    setSummary(s)
    setLastUpdated(new Date())
    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const handleCall = () => {
    if (summary?.patientPhone) {
      window.location.href = `tel:${summary.patientPhone}`
    } else {
      alert('Tu familiar no tiene teléfono registrado en su perfil todavía.')
    }
  }

  const handleWhatsApp = () => {
    if (summary?.patientPhone) {
      const phone = summary.patientPhone.replace(/\D/g, '')
      const msg = encodeURIComponent(`Hola ${summary.patientName}, te escribo desde Contigo. ¿Cómo estás?`)
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
    } else {
      alert('Tu familiar no tiene teléfono registrado en su perfil todavía.')
    }
  }

  const sendReminder = async (message: string) => {
    if (!user || !summary) return
    setReminderStatus('sending')
    const success = await notificationService.sendReminderToPatient(
      summary.patientUserId,
      user.name,
      message
    )
    setReminderStatus(success ? 'sent' : 'error')
    if (success) {
      setShowReminderModal(false)
      setCustomMessage('')
    }
    setTimeout(() => setReminderStatus('idle'), 3000)
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

  const glucoseStatus = summary ? getGlucoseStatus(summary.lastGlucose, summary.lastGlucoseType) : null
  const bpStatus = summary ? getBpStatus(summary.lastBpSystolic, summary.lastBpDiastolic) : null
  const medsMissing = summary && summary.medsTotal > 0 && summary.medsTaken < summary.medsTotal
  const hasAlerts = summary && (
    summary.footWoundFound ||
    (glucoseStatus && glucoseStatus !== 'normal') ||
    (bpStatus && bpStatus !== 'normal') ||
    medsMissing
  )

  // Quick reminder options based on patient status
  const quickOptions = summary ? [
    medsMissing && {
      label: '💊 Recordatorio de medicación',
      message: `Hola ${summary.patientName}, todavía te faltan ${summary.medsTotal - summary.medsTaken} medicamento${summary.medsTotal - summary.medsTaken > 1 ? 's' : ''} por tomar hoy.`
    },
    !summary.footCheckDone && {
      label: '🦶 Recordatorio de pies',
      message: `Hola ${summary.patientName}, no olvides hacer tu revisión de pies de hoy. Solo toma 2 minutos.`
    },
    !summary.lastGlucose && {
      label: '🩸 Recordatorio de glucosa',
      message: `Hola ${summary.patientName}, ¿ya registraste tu glucosa de hoy?`
    },
    !summary.lastBpSystolic && {
      label: '❤️ Recordatorio de presión',
      message: `Hola ${summary.patientName}, ¿ya tomaste tu presión arterial hoy?`
    },
    {
      label: '👋 ¿Cómo estás?',
      message: `Hola ${summary.patientName}, solo quería saber cómo estás hoy. ¡Te mando un abrazo!`
    },
    {
      label: '⚠️ Llamame cuando puedas',
      message: `Hola ${summary.patientName}, cuando puedas llamame, quiero saber cómo estás.`
    },
  ].filter(Boolean) as { label: string; message: string }[] : []

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
        {loading ? (
          <div className={styles.loading}>Cargando...</div>
        ) : !summary ? (
          <div className={styles.noPatient}>
            <div className={styles.noPatientIcon}>👥</div>
            <h2>Sin paciente vinculado</h2>
            <p>Pedile a tu familiar que genere un código desde <strong>Perfil → Modo cuidador</strong> y volvé a registrarte con ese código.</p>
          </div>
        ) : (
          <>
            <div className={styles.patientHeader}>
              <div className={styles.patientAvatar}>
                {summary.patientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className={styles.patientName}>Monitoreando a {summary.patientName}</h2>
                <p className={styles.lastUpdate}>
                  {lastUpdated ? `Actualizado ${timeAgo(lastUpdated.toISOString())}` : ''}
                </p>
              </div>
            </div>

            {hasAlerts ? (
              <div className={styles.alertBanner}><AlertTriangle size={18} /><span>Hay alertas que requieren atención</span></div>
            ) : (
              <div className={styles.okBanner}><CheckCircle2 size={18} /><span>Todo en orden hoy</span></div>
            )}

            <div className={styles.cards}>
              <div className={`${styles.card} ${medsMissing ? styles.cardWarn : ''}`}>
                <div className={styles.cardTop}>
                  <div className={styles.cardIconWrap} style={{ background: medsMissing ? '#fef3c7' : '#f0fdfa' }}>
                    <Pill size={22} color={medsMissing ? '#f59e0b' : '#0d9488'} />
                  </div>
                  <div className={styles.cardStatus}>
                    {summary.medsTotal === 0 ? null : summary.medsTaken === summary.medsTotal
                      ? <CheckCircle2 size={22} color="#22c55e" />
                      : <XCircle size={22} color="#f59e0b" />}
                  </div>
                </div>
                <div className={styles.cardValue}>{summary.medsTotal === 0 ? '—' : `${summary.medsTaken}/${summary.medsTotal}`}</div>
                <div className={styles.cardLabel}>Medicación tomada</div>
                {medsMissing && <div className={styles.cardAlert}>Faltan {summary.medsTotal - summary.medsTaken} dosis</div>}
              </div>

              <div className={`${styles.card} ${summary.footWoundFound ? styles.cardDanger : ''}`}>
                <div className={styles.cardTop}>
                  <div className={styles.cardIconWrap} style={{ background: summary.footWoundFound ? '#fee2e2' : '#f0fdfa' }}>
                    <Footprints size={22} color={summary.footWoundFound ? '#ef4444' : '#0d9488'} />
                  </div>
                  <div className={styles.cardStatus}>
                    {!summary.footCheckDone ? <Clock size={22} color="#9ca3af" />
                      : summary.footWoundFound ? <AlertTriangle size={22} color="#ef4444" />
                      : <CheckCircle2 size={22} color="#22c55e" />}
                  </div>
                </div>
                <div className={styles.cardValue}>{!summary.footCheckDone ? 'Pendiente' : summary.footWoundFound ? 'Alerta' : 'OK'}</div>
                <div className={styles.cardLabel}>Revisión de pies</div>
                {summary.footWoundFound && <div className={styles.cardAlert}>Se detectó una herida</div>}
              </div>

              <div className={`${styles.card} ${glucoseStatus && glucoseStatus !== 'normal' ? styles.cardWarn : ''}`}>
                <div className={styles.cardTop}>
                  <div className={styles.cardIconWrap} style={{ background: '#f0fdfa' }}>
                    <Droplets size={22} color="#0d9488" />
                  </div>
                  <div className={styles.cardStatus}>
                    {glucoseStatus === 'normal' && <CheckCircle2 size={22} color="#22c55e" />}
                    {glucoseStatus && glucoseStatus !== 'normal' && <AlertTriangle size={22} color="#f59e0b" />}
                    {!glucoseStatus && <Clock size={22} color="#9ca3af" />}
                  </div>
                </div>
                <div className={styles.cardValue}>{summary.lastGlucose ?? '—'}</div>
                <div className={styles.cardLabel}>Glucosa {summary.lastGlucose ? 'mg/dL' : ''}</div>
                {summary.lastGlucoseAt && <div className={styles.cardTime}>{timeAgo(summary.lastGlucoseAt)}</div>}
                {glucoseStatus && glucoseStatus !== 'normal' && (
                  <div className={styles.cardAlert}>{glucoseStatus === 'low' ? 'Glucosa baja' : 'Glucosa elevada'}</div>
                )}
              </div>

              <div className={`${styles.card} ${bpStatus && bpStatus !== 'normal' ? styles.cardDanger : ''}`}>
                <div className={styles.cardTop}>
                  <div className={styles.cardIconWrap} style={{ background: bpStatus && bpStatus !== 'normal' ? '#fee2e2' : '#f0fdfa' }}>
                    <Heart size={22} color={bpStatus && bpStatus !== 'normal' ? '#ef4444' : '#0d9488'} />
                  </div>
                  <div className={styles.cardStatus}>
                    {bpStatus === 'normal' && <CheckCircle2 size={22} color="#22c55e" />}
                    {bpStatus && bpStatus !== 'normal' && <AlertTriangle size={22} color="#ef4444" />}
                    {!bpStatus && <Clock size={22} color="#9ca3af" />}
                  </div>
                </div>
                <div className={styles.cardValue}>{summary.lastBpSystolic ? `${summary.lastBpSystolic}/${summary.lastBpDiastolic}` : '—'}</div>
                <div className={styles.cardLabel}>Presión {summary.lastBpSystolic ? 'mmHg' : ''}</div>
                {summary.lastBpAt && <div className={styles.cardTime}>{timeAgo(summary.lastBpAt)}</div>}
                {bpStatus && bpStatus !== 'normal' && (
                  <div className={styles.cardAlert}>{bpStatus === 'crisis' ? '⚠️ Crisis hipertensiva' : 'Presión elevada'}</div>
                )}
              </div>
            </div>

            <div className={styles.actions}>
              <h3 className={styles.actionsTitle}>Intervenir</h3>
              <div className={styles.actionButtons}>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  onClick={() => setShowReminderModal(true)}
                >
                  <Bell size={20} />
                  <span>Enviar recordatorio</span>
                </button>
                <button className={`${styles.actionBtn} ${styles.actionBtnGreen}`} onClick={handleWhatsApp}>
                  <MessageCircle size={20} />
                  <span>WhatsApp</span>
                </button>
                <button className={`${styles.actionBtn} ${styles.actionBtnRed}`} onClick={handleCall}>
                  <Phone size={20} />
                  <span>Llamar</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Reminder Modal */}
      {showReminderModal && summary && (
        <div className={styles.modalOverlay} onClick={() => setShowReminderModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Enviar recordatorio a {summary.patientName}</h3>
              <button className={styles.modalClose} onClick={() => setShowReminderModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Quick options */}
              <p className={styles.modalLabel}>Opciones rápidas</p>
              <div className={styles.quickOptions}>
                {quickOptions.map((opt, i) => (
                  <button
                    key={i}
                    className={styles.quickOption}
                    onClick={() => sendReminder(opt.message)}
                    disabled={reminderStatus === 'sending'}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom message */}
              <p className={styles.modalLabel}>O escribí un mensaje personalizado</p>
              <div className={styles.customRow}>
                <textarea
                  className={styles.customInput}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder={`Escribí un mensaje para ${summary.patientName}...`}
                  rows={3}
                />
                <button
                  className={styles.sendBtn}
                  onClick={() => customMessage.trim() && sendReminder(customMessage.trim())}
                  disabled={!customMessage.trim() || reminderStatus === 'sending'}
                >
                  <Send size={18} />
                </button>
              </div>

              {reminderStatus === 'sending' && (
                <p className={styles.statusMsg}>Enviando...</p>
              )}
              {reminderStatus === 'error' && (
                <p className={styles.statusMsgError}>
                  {summary.patientName} necesita tener notificaciones activadas en su app.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
