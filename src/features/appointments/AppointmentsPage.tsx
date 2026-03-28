import React, { useEffect, useState, useRef } from 'react'
import styles from './AppointmentsPage.module.css'
import { Card, CardHeader, CardContent } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/ui/Modal/Modal'
import { Input } from '@/components/ui/Input/Input'
import { Textarea } from '@/components/ui/Input/Input'
import { Plus, Calendar, MapPin, Clock, Download, FileText, ChevronDown, ChevronUp, Mic, MicOff, FileDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { appointmentsRepo } from '@/data/repos/appointmentsRepo'
import { glucoseRepo, bpRepo } from '@/data/repos/healthMetricsRepo'
import { medsRepo, medLogsRepo } from '@/data/repos/medsRepo'
import type { Appointment } from '@/types'

// ConsultNote stored in localStorage per appointment
interface ConsultNote {
  id: string
  appointmentId: string
  content: string
  createdAt: string
  updatedAt: string
}

const getNotesKey = (userId: string) => `contigo_consult_notes_${userId}`

const loadNotes = (userId: string): ConsultNote[] => {
  try {
    return JSON.parse(localStorage.getItem(getNotesKey(userId)) || '[]')
  } catch { return [] }
}

const saveNotes = (userId: string, notes: ConsultNote[]) => {
  localStorage.setItem(getNotesKey(userId), JSON.stringify(notes))
}

export const AppointmentsPage: React.FC = () => {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [consultNotes, setConsultNotes] = useState<ConsultNote[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<string[]>([])
  const [noteText, setNoteText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Form state
  const [doctorName, setDoctorName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (user) {
      loadData()
      setConsultNotes(loadNotes(user.id))
    }
  }, [user])

  const loadData = async () => {
    if (!user) return
    const appts = await appointmentsRepo.getAll(user.id)
    setAppointments(appts.sort((a, b) => a.date.localeCompare(b.date)))
  }

  const handleAdd = async () => {
    if (!user || !doctorName || !date || !time) return
    await appointmentsRepo.create({
      userId: user.id,
      doctorName,
      specialty: specialty || undefined,
      date,
      time,
      location: location || undefined,
      notes: notes || undefined,
      reminder24h: true,
      reminder2h: true
    })
    setShowAddModal(false)
    setDoctorName(''); setSpecialty(''); setDate(''); setTime(''); setLocation(''); setNotes('')
    await loadData()
  }

  const handleExportICS = (appt: Appointment) => {
    const ics = appointmentsRepo.generateICS(appt)
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `turno-${appt.doctorName.replace(/\s+/g, '-').toLowerCase()}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Consult notes ─────────────────────────────────
  const openNoteModal = (appt: Appointment) => {
    setSelectedAppt(appt)
    const existing = consultNotes.find(n => n.appointmentId === appt.id)
    setNoteText(existing?.content || '')
    setShowNoteModal(true)
  }

  const saveNote = () => {
    if (!user || !selectedAppt) return
    const now = new Date().toISOString()
    const existing = consultNotes.find(n => n.appointmentId === selectedAppt.id)
    let updated: ConsultNote[]
    if (existing) {
      updated = consultNotes.map(n =>
        n.appointmentId === selectedAppt.id
          ? { ...n, content: noteText, updatedAt: now }
          : n
      )
    } else {
      updated = [...consultNotes, {
        id: crypto.randomUUID(),
        appointmentId: selectedAppt.id,
        content: noteText,
        createdAt: now,
        updatedAt: now
      }]
    }
    setConsultNotes(updated)
    saveNotes(user.id, updated)
    setShowNoteModal(false)
    setNoteText('')
  }

  const toggleNotes = (apptId: string) => {
    setExpandedNotes(prev =>
      prev.includes(apptId) ? prev.filter(id => id !== apptId) : [...prev, apptId]
    )
  }

  // ── Voice recording ───────────────────────────────
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'es-ES'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ')
      setNoteText(prev => prev ? `${prev} ${transcript}` : transcript)
    }
    recognition.onend = () => setIsRecording(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  // ── PDF Generation ────────────────────────────────
  const handleGeneratePDF = async () => {
    if (!user) return
    setGeneratingPDF(true)

    try {
      const [glucose, bp, meds] = await Promise.all([
        glucoseRepo.getLast(user.id, 14),
        bpRepo.getLast(user.id, 14),
        medsRepo.getAll(user.id)
      ])

      const today = new Date().toLocaleDateString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric'
      })

      const upcomingAppts = appointments.filter(a => a.date >= new Date().toISOString().split('T')[0])
      const pastAppts = appointments.filter(a => a.date < new Date().toISOString().split('T')[0])

      // Build HTML for PDF
      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; color: #1f2937; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { color: #0d9488; font-size: 24px; margin-bottom: 4px; }
  h2 { color: #0d9488; font-size: 18px; border-bottom: 2px solid #ccfbf1; padding-bottom: 6px; margin-top: 28px; }
  h3 { font-size: 15px; margin: 12px 0 4px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .subtitle { color: #6b7280; font-size: 13px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge-normal { background: #dcfce7; color: #16a34a; }
  .badge-elevated { background: #fef3c7; color: #d97706; }
  .badge-high { background: #fee2e2; color: #dc2626; }
  .badge-low { background: #dbeafe; color: #1d4ed8; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th { background: #f0fdfa; color: #0f766e; text-align: left; padding: 8px 10px; font-weight: 600; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
  tr:last-child td { border-bottom: none; }
  .note-box { background: #f9fafb; border-left: 3px solid #0d9488; padding: 10px 14px; margin: 8px 0; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.6; }
  .appt-card { background: #f0fdfa; padding: 12px 16px; border-radius: 8px; margin: 8px 0; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
  .med-pill { display: inline-block; background: #f0fdfa; border: 1px solid #0d9488; color: #0f766e; padding: 2px 10px; border-radius: 999px; font-size: 12px; margin: 2px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>Contigo — Informe médico</h1>
    <p class="subtitle">Paciente: <strong>${user.name}</strong> &nbsp;|&nbsp; Generado: ${today}</p>
  </div>
</div>

<h2>Medicación activa</h2>
${meds.length === 0
  ? '<p class="subtitle">Sin medicamentos registrados</p>'
  : meds.map(m => `<span class="med-pill">${m.name} ${m.dosage}</span>`).join('')
}

<h2>Últimas glucemias</h2>
${glucose.length === 0
  ? '<p class="subtitle">Sin registros</p>'
  : `<table>
    <tr><th>Fecha</th><th>Valor</th><th>Tipo</th><th>Estado</th></tr>
    ${glucose.slice(0, 10).map(g => {
      const status = glucoseRepo.getStatus(g.value, g.type)
      const badgeClass = status === 'normal' ? 'badge-normal' : status === 'low' ? 'badge-low' : status === 'elevated' ? 'badge-elevated' : 'badge-high'
      const statusLabel = status === 'normal' ? 'Normal' : status === 'low' ? 'Bajo' : status === 'elevated' ? 'Elevado' : 'Alto'
      return `<tr>
        <td>${new Date(g.recordedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td><strong>${g.value} mg/dL</strong></td>
        <td>${glucoseRepo.getTypeLabel(g.type)}</td>
        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      </tr>`
    }).join('')}
  </table>`
}

<h2>Últimas presiones arteriales</h2>
${bp.length === 0
  ? '<p class="subtitle">Sin registros</p>'
  : `<table>
    <tr><th>Fecha</th><th>Sistólica</th><th>Diastólica</th><th>Pulso</th><th>Estado</th></tr>
    ${bp.slice(0, 10).map(r => {
      const status = bpRepo.getStatus(r.systolic, r.diastolic)
      const badgeClass = status === 'normal' ? 'badge-normal' : status === 'elevated' ? 'badge-elevated' : 'badge-high'
      return `<tr>
        <td>${new Date(r.recordedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${r.systolic} mmHg</td>
        <td>${r.diastolic} mmHg</td>
        <td>${r.pulse ? `${r.pulse} bpm` : '—'}</td>
        <td><span class="badge ${badgeClass}">${bpRepo.getStatusLabel(status)}</span></td>
      </tr>`
    }).join('')}
  </table>`
}

<h2>Turnos y notas de consulta</h2>
${[...upcomingAppts, ...pastAppts.slice(-5).reverse()].map(appt => {
  const note = consultNotes.find(n => n.appointmentId === appt.id)
  const isPast = appt.date < new Date().toISOString().split('T')[0]
  return `
  <div class="appt-card">
    <h3>${appt.doctorName}${appt.specialty ? ` — ${appt.specialty}` : ''} ${isPast ? '(pasado)' : '(próximo)'}</h3>
    <p class="subtitle">${new Date(appt.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} a las ${appt.time}${appt.location ? ` · ${appt.location}` : ''}</p>
    ${note ? `<div class="note-box"><strong>Nota de consulta:</strong><br>${note.content}</div>` : '<p class="subtitle">Sin notas de consulta</p>'}
  </div>`
}).join('')}

<div class="footer">
  Generado por Contigo · Esta información es confidencial y de uso médico.
  No reemplaza el consejo médico profesional.
</div>
</body>
</html>`

      // Open in new window and print
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        win.focus()
        setTimeout(() => {
          win.print()
        }, 500)
      }
    } finally {
      setGeneratingPDF(false)
    }
  }

  const upcoming = appointments.filter(a => a.date >= new Date().toISOString().split('T')[0])
  const past = appointments.filter(a => a.date < new Date().toISOString().split('T')[0])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Turnos Médicos</h2>
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            size="small"
            leftIcon={<FileDown size={16} />}
            onClick={handleGeneratePDF}
            loading={generatingPDF}
          >
            PDF
          </Button>
          <Button
            variant="primary"
            size="small"
            leftIcon={<Plus size={18} />}
            onClick={() => setShowAddModal(true)}
          >
            Agregar
          </Button>
        </div>
      </header>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Próximos turnos</h3>
          <div className={styles.appointmentsList}>
            {upcoming.map(appt => {
              const display = appointmentsRepo.formatDisplay(appt)
              const note = consultNotes.find(n => n.appointmentId === appt.id)
              const isExpanded = expandedNotes.includes(appt.id)
              return (
                <Card key={appt.id} className={styles.appointmentCard}>
                  <CardHeader
                    title={appt.doctorName}
                    subtitle={display.fullDateTime}
                    icon={<Calendar size={20} />}
                  />
                  <CardContent>
                    {appt.specialty && (
                      <p className={styles.detail}><Clock size={16} />{appt.specialty}</p>
                    )}
                    {appt.location && (
                      <p className={styles.detail}><MapPin size={16} />{appt.location}</p>
                    )}
                    <div className={styles.cardActions}>
                      <Button
                        variant="ghost"
                        size="small"
                        leftIcon={<Download size={16} />}
                        onClick={() => handleExportICS(appt)}
                      >
                        Calendario
                      </Button>
                      <Button
                        variant={note ? 'primary' : 'outline'}
                        size="small"
                        leftIcon={<FileText size={16} />}
                        onClick={() => openNoteModal(appt)}
                      >
                        {note ? 'Ver nota' : 'Tomar nota'}
                      </Button>
                    </div>
                    {/* Note preview */}
                    {note && (
                      <div className={styles.notePreviewWrap}>
                        <button
                          className={styles.noteToggle}
                          onClick={() => toggleNotes(appt.id)}
                        >
                          <FileText size={14} />
                          Nota de consulta
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {isExpanded && (
                          <div className={styles.notePreview}>
                            {note.content}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Turnos pasados</h3>
          <div className={styles.appointmentsList}>
            {past.slice(-5).reverse().map(appt => {
              const note = consultNotes.find(n => n.appointmentId === appt.id)
              const isExpanded = expandedNotes.includes(appt.id)
              return (
                <Card key={appt.id} className={`${styles.appointmentCard} ${styles.past}`}>
                  <CardContent>
                    <div className={styles.pastHeader}>
                      <div>
                        <p className={styles.pastDate}>
                          {new Date(appt.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className={styles.pastDoctor}>{appt.doctorName}</p>
                        {appt.specialty && <p className={styles.pastSpecialty}>{appt.specialty}</p>}
                      </div>
                      <Button
                        variant={note ? 'primary' : 'ghost'}
                        size="small"
                        leftIcon={<FileText size={14} />}
                        onClick={() => openNoteModal(appt)}
                      >
                        {note ? 'Nota' : 'Agregar'}
                      </Button>
                    </div>
                    {note && (
                      <div className={styles.notePreviewWrap}>
                        <button className={styles.noteToggle} onClick={() => toggleNotes(appt.id)}>
                          <FileText size={14} />
                          Ver nota
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {isExpanded && (
                          <div className={styles.notePreview}>{note.content}</div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <Card className={styles.emptyCard}>
          <CardContent>
            <Calendar size={48} className={styles.emptyIcon} />
            <p className={styles.emptyText}>No tenés turnos registrados</p>
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              Agregar turno
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Agregar Turno"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            <Button onClick={handleAdd}>Guardar</Button>
          </>
        }
      >
        <div className={styles.form}>
          <Input label="Nombre del médico" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. García" required fullWidth />
          <Input label="Especialidad" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Endocrinología" fullWidth />
          <div className={styles.formRow}>
            <Input label="Fecha" type="date" value={date} onChange={e => setDate(e.target.value)} required fullWidth />
            <Input label="Hora" type="time" value={time} onChange={e => setTime(e.target.value)} required fullWidth />
          </div>
          <Input label="Ubicación" value={location} onChange={e => setLocation(e.target.value)} placeholder="Hospital San Juan, piso 3" fullWidth />
          <Input label="Notas previas" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Traer estudios, ayuno, etc." fullWidth />
        </div>
      </Modal>

      {/* Note Modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => { setShowNoteModal(false); stopRecording() }}
        title={`Nota — ${selectedAppt?.doctorName}`}
        description={selectedAppt ? `${new Date(selectedAppt.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} · ${selectedAppt.time}` : ''}
        size="large"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowNoteModal(false); stopRecording() }}>Cancelar</Button>
            <Button onClick={saveNote}>Guardar nota</Button>
          </>
        }
      >
        <div className={styles.noteForm}>
          <div className={styles.noteToolbar}>
            <span className={styles.noteHint}>Escribí o dictá lo que dijo el médico</span>
            <button
              className={`${styles.micBtn} ${isRecording ? styles.micActive : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              type="button"
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              {isRecording ? 'Detener' : 'Dictar'}
            </button>
          </div>
          {isRecording && (
            <div className={styles.recordingIndicator}>
              <span className={styles.recordingDot} />
              Escuchando...
            </div>
          )}
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Ej: El médico indicó aumentar la metformina a 850mg. Volver en 3 meses. Pedir análisis de HbA1c..."
            rows={10}
            fullWidth
          />
        </div>
      </Modal>
    </div>
  )
}