import React, { useEffect, useState } from 'react'
import styles from './TodayPage.module.css'
import { Card, CardHeader, CardContent } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/ui/Modal/Modal'
import { Textarea } from '@/components/ui/Input/Input'
import { 
  Pill, 
  Footprints, 
  Calendar, 
  BookOpen, 
  Droplets, 
  CheckCircle2, 
  Circle,
  AlertCircle,
  Heart,
  Activity,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { medsRepo, medLogsRepo } from '@/data/repos/medsRepo'
import { footChecksRepo, defaultFootChecklist } from '@/data/repos/woundsRepo'
import { appointmentsRepo } from '@/data/repos/appointmentsRepo'
import { journalRepo } from '@/data/repos/journalRepo'
import { glucoseRepo, bpRepo } from '@/data/repos/healthMetricsRepo'
import { notificationService } from '@/services/notificationService'
import { useNavigate } from 'react-router-dom'
import type { Medication, MedicationLog, Appointment, FootCheck, GlucoseReading, BloodPressureReading } from '@/types'

export const TodayPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [medications, setMedications] = useState<Medication[]>([])
  const [medLogs, setMedLogs] = useState<MedicationLog[]>([])
  const [footCheck, setFootCheck] = useState<FootCheck | null>(null)
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null)
  const [journalEntry, setJournalEntry] = useState('')
  const [showJournalModal, setShowJournalModal] = useState(false)
  const [showFootCheckModal, setShowFootCheckModal] = useState(false)
  const [checklistItems, setChecklistItems] = useState(defaultFootChecklist)
  const [footNotes, setFootNotes] = useState('')
  const [todayGlucose, setTodayGlucose] = useState<GlucoseReading[]>([])
  const [latestBP, setLatestBP] = useState<BloodPressureReading | null>(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    const [meds, logs, check, next, journal, glucose, bp] = await Promise.all([
      medsRepo.getAll(user.id),
      medLogsRepo.getForToday(user.id),
      footChecksRepo.getToday(user.id),
      appointmentsRepo.getNext(user.id),
      journalRepo.getToday(user.id),
      glucoseRepo.getToday(user.id),
      bpRepo.getLast(user.id, 1)
    ])
    setMedications(meds)
    setMedLogs(logs)
    setFootCheck(check || null)
    setNextAppointment(next)
    setTodayGlucose(glucose)
    setLatestBP(bp[0] || null)

    if (journal) {
      setJournalEntry(journal.content)
    }

    // Schedule notification reminders for pending meds
    if (notificationService.getPermission() === 'granted') {
      const pendingMeds = logs
        .filter(l => l.status !== 'taken')
        .map(l => {
          const med = meds.find(m => m.id === l.medicationId)
          return med ? { name: med.name, dosage: med.dosage, scheduledTime: l.scheduledTime, logId: l.id } : null
        })
        .filter(Boolean) as Array<{ name: string; dosage: string; scheduledTime: string; logId: string }>
      
      notificationService.scheduleMedicationReminders(pendingMeds)
    }
  }

  const handleMarkTaken = async (logId: string) => {
    await medLogsRepo.markTaken(logId)
    await loadData()
  }

  const handleSaveJournal = async () => {
    if (!user) return
    await journalRepo.saveToday(user.id, journalEntry)
    setShowJournalModal(false)
    await loadData()
  }

  const handleSaveFootCheck = async () => {
    if (!user) return
    await footChecksRepo.saveTodayCheck(user.id, checklistItems, footNotes)
    setShowFootCheckModal(false)
    await loadData()
  }

  const takenCount = medLogs.filter(l => l.status === 'taken').length

  // Today's vitals summary
  const fastingGlucose = todayGlucose.find(g => g.type === 'fasting')
  const glucoseStatus = fastingGlucose ? glucoseRepo.getStatus(fastingGlucose.value, 'fasting') : null
  const bpStatus = latestBP ? bpRepo.getStatus(latestBP.systolic, latestBP.diastolic) : null
  const hasVitalAlert = glucoseStatus && glucoseStatus !== 'normal' || bpStatus && bpStatus !== 'normal'

  return (
    <div className={styles.page}>
      <header className={styles.welcome}>
        <h2 className={styles.greeting}>Hola, {user?.name?.split(' ')[0]}</h2>
        <p className={styles.date}>
          {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })}
        </p>
      </header>

      {/* Vitals summary strip - NEW */}
      <Card
        className={`${styles.vitalsStrip} ${hasVitalAlert ? styles.warning : ''}`}
        interactive
        onClick={() => navigate('/vitals')}
      >
        <CardContent>
          <div className={styles.vitalsRow}>
            <Activity size={18} className={styles.vitalsMainIcon} />
            <span className={styles.vitalsTitle}>Signos vitales de hoy</span>
            <TrendingUp size={16} className={styles.vitalsArrow} />
          </div>
          <div className={styles.vitalsGrid}>
            <div className={`${styles.vitalChip} ${glucoseStatus ? styles[`vital_${glucoseStatus}`] : styles.vital_empty}`}>
              <Droplets size={14} />
              <span>{fastingGlucose ? `${fastingGlucose.value} mg/dL` : 'Glucosa —'}</span>
            </div>
            <div className={`${styles.vitalChip} ${bpStatus ? styles[`vital_${bpStatus}`] : styles.vital_empty}`}>
              <Heart size={14} />
              <span>{latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : 'Presión —'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medication Card */}
      <Card className={styles.card}>
        <CardHeader
          title="Medicación de hoy"
          subtitle={`${takenCount} de ${medLogs.length} tomadas`}
          icon={<Pill size={24} />}
        />
        <CardContent>
          {medLogs.length === 0 ? (
            <p className={styles.empty}>No hay medicación programada para hoy</p>
          ) : (
            <div className={styles.medicationList}>
              {medLogs.map((log) => {
                const med = medications.find(m => m.id === log.medicationId)
                if (!med) return null
                const isTaken = log.status === 'taken'
                const time = new Date(log.scheduledTime).toLocaleTimeString('es-ES', {
                  hour: '2-digit', minute: '2-digit'
                })
                return (
                  <div key={log.id} className={`${styles.medicationItem} ${isTaken ? styles.taken : ''}`}>
                    <div className={styles.medInfo}>
                      <span className={styles.medTime}>{time}</span>
                      <span className={styles.medName}>{med.name}</span>
                      <span className={styles.medDose}>{med.dosage}</span>
                    </div>
                    <Button
                      variant={isTaken ? 'ghost' : 'primary'}
                      size="small"
                      leftIcon={isTaken ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      onClick={() => !isTaken && handleMarkTaken(log.id)}
                      disabled={isTaken}
                    >
                      {isTaken ? 'Tomada' : 'Tomar'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Foot Check Card */}
      <Card 
        className={`${styles.card} ${footCheck?.woundFound ? styles.warning : ''}`}
        interactive 
        onClick={() => setShowFootCheckModal(true)}
      >
        <CardHeader
          title="Revisión de pies"
          subtitle={footCheck 
            ? footCheck.woundFound ? 'Se detectaron signos de alerta' : 'Revisión completada ✓'
            : '2 minutos para revisar tus pies'
          }
          icon={<Footprints size={24} />}
        />
        {footCheck?.woundFound && (
          <CardContent>
            <div className={styles.alert}>
              <AlertCircle size={18} />
              <span>Se detectaron signos que requieren atención</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Journal Card */}
      <Card className={styles.card} interactive onClick={() => setShowJournalModal(true)}>
        <CardHeader
          title="Nota del día"
          subtitle={journalEntry ? 'Ver tu nota' : '¿Cómo te sentís hoy?'}
          icon={<BookOpen size={24} />}
        />
        {journalEntry && (
          <CardContent>
            <p className={styles.journalPreview}>{journalEntry}</p>
          </CardContent>
        )}
      </Card>

      {/* Next Appointment */}
      {nextAppointment && (
        <Card className={styles.card} interactive onClick={() => navigate('/appointments')}>
          <CardHeader
            title="Próximo turno"
            subtitle={appointmentsRepo.formatDisplay(nextAppointment).fullDateTime}
            icon={<Calendar size={24} />}
          />
          <CardContent>
            <p className={styles.appointmentDoctor}>{nextAppointment.doctorName}</p>
            {nextAppointment.specialty && <p className={styles.appointmentSpecialty}>{nextAppointment.specialty}</p>}
            {nextAppointment.location && <p className={styles.appointmentLocation}>{nextAppointment.location}</p>}
          </CardContent>
        </Card>
      )}

      <p className={styles.disclaimer}>
        <AlertCircle size={14} />
        Esta app no reemplaza el consejo médico. Ante síntomas graves o urgencias, llamá al servicio de emergencias.
      </p>

      {/* Journal Modal */}
      <Modal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        title="Nota del día"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowJournalModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveJournal}>Guardar</Button>
          </>
        }
      >
        <Textarea
          label="¿Cómo te sentís hoy?"
          value={journalEntry}
          onChange={(e) => setJournalEntry(e.target.value)}
          placeholder="Escribí aquí cómo te sentís, cualquier síntoma o preocupación..."
          rows={6}
          fullWidth
        />
      </Modal>

      {/* Foot Check Modal */}
      <Modal
        isOpen={showFootCheckModal}
        onClose={() => setShowFootCheckModal(false)}
        title="Revisión de Pies"
        description="Marcá cada ítem después de revisar"
        size="large"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowFootCheckModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveFootCheck}>Guardar revisión</Button>
          </>
        }
      >
        <div className={styles.footChecklist}>
          <p className={styles.footInstructions}>
            Usá un espejo o pedí ayuda para revisar la planta de tus pies. Prestá atención a cualquier cambio.
          </p>
          {checklistItems.map((item, index) => (
            <label key={item.id} className={styles.checklistItem}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => {
                  const newItems = [...checklistItems]
                  newItems[index].checked = e.target.checked
                  setChecklistItems(newItems)
                }}
              />
              <span className={item.checked ? styles.checked : ''}>{item.item}</span>
            </label>
          ))}
          <Textarea
            label="Notas adicionales (opcional)"
            value={footNotes}
            onChange={(e) => setFootNotes(e.target.value)}
            placeholder="¿Notaste algo fuera de lo normal?"
            rows={3}
            fullWidth
          />
        </div>
      </Modal>
    </div>
  )
}
