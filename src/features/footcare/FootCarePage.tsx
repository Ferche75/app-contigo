import React, { useEffect, useState, useRef } from 'react'
import styles from './FootCarePage.module.css'
import { Card, CardHeader, CardContent } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/ui/Modal/Modal'
import { Textarea } from '@/components/ui/Input/Input'
import { 
  Footprints, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Stethoscope,
  Camera,
  X,
  ImagePlus
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { footChecksRepo, woundsRepo, defaultFootChecklist } from '@/data/repos/woundsRepo'
import type { FootCheck, WoundReport } from '@/types'

export const FootCarePage: React.FC = () => {
  const { user } = useAuth()
  const [footChecks, setFootChecks] = useState<FootCheck[]>([])
  const [wounds, setWounds] = useState<WoundReport[]>([])
  const [showCheckModal, setShowCheckModal] = useState(false)
  const [showWoundModal, setShowWoundModal] = useState(false)
  const [checklistItems, setChecklistItems] = useState(defaultFootChecklist)
  const [footNotes, setFootNotes] = useState('')
  
  // Wound form
  const [woundLocation, setWoundLocation] = useState('')
  const [woundDescription, setWoundDescription] = useState('')
  const [woundSeverity, setWoundSeverity] = useState<'low' | 'medium' | 'high'>('low')
  // NEW: photo state
  const [woundPhoto, setWoundPhoto] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  const loadData = async () => {
    if (!user) return
    const checks = await footChecksRepo.getAll(user.id)
    setFootChecks(checks)
    const wnds = await woundsRepo.getAll(user.id)
    setWounds(wnds)
  }

  const handleSaveCheck = async () => {
    if (!user) return
    await footChecksRepo.saveTodayCheck(user.id, checklistItems, footNotes)
    setShowCheckModal(false)
    await loadData()
  }

  const handleReportWound = async () => {
    if (!user) return
    await woundsRepo.create({
      userId: user.id,
      location: woundLocation,
      description: woundDescription,
      severity: woundSeverity,
      hasPain: false,
      hasTemperature: false,
      hasSecretion: false,
      photoUrl: woundPhoto || undefined,   // NEW: save photo
      checkedAt: new Date().toISOString()
    })
    setShowWoundModal(false)
    resetWoundForm()
    await loadData()
  }

  const resetWoundForm = () => {
    setWoundLocation('')
    setWoundDescription('')
    setWoundSeverity('low')
    setWoundPhoto(null)
    stopCamera()
    setShowCamera(false)
    setCameraError('')
  }

  // ── Camera helpers ──────────────────────────────────────
  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      setShowCamera(true)
      // Wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch {
      setCameraError('No se pudo acceder a la cámara. Usá "Subir imagen" en su lugar.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const takePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    // Compress to ~80% JPEG, max 800px wide to keep size reasonable
    const maxW = 800
    const scale = Math.min(1, maxW / canvas.width)
    const out = document.createElement('canvas')
    out.width = canvas.width * scale
    out.height = canvas.height * scale
    out.getContext('2d')?.drawImage(canvas, 0, 0, out.width, out.height)
    const dataUrl = out.toDataURL('image/jpeg', 0.8)
    setWoundPhoto(dataUrl)
    stopCamera()
    setShowCamera(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const maxW = 800
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        setWoundPhoto(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }
  // ────────────────────────────────────────────────────────

  const todayCheck = footChecks[0]
  const shouldConsult = todayCheck ? footChecksRepo.shouldConsultDoctor(todayCheck.checklistItems) : false

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Cuidado de Pies</h2>
      </header>

      {/* Info Card */}
      <Card className={styles.infoCard}>
        <CardContent>
          <div className={styles.infoHeader}>
            <Info size={24} className={styles.infoIcon} />
            <h3>¿Por qué es importante?</h3>
          </div>
          <p className={styles.infoText}>
            La diabetes puede reducir la sensibilidad y el flujo sanguíneo en los pies, 
            haciendo que las heridas sean más difíciles de detectar y cicatrizar. 
            Una revisión diaria puede prevenir complicaciones graves.
          </p>
        </CardContent>
      </Card>

      {/* Today's Check */}
      <Card 
        className={`${styles.checkCard} ${shouldConsult ? styles.warning : ''}`}
        interactive
        onClick={() => setShowCheckModal(true)}
      >
        <CardHeader
          title={todayCheck ? 'Revisión de hoy' : 'Hacer revisión diaria'}
          subtitle={todayCheck 
            ? shouldConsult 
              ? 'Se detectaron signos de alerta'
              : 'Todo se ve bien'
            : '2 minutos para cuidar tus pies'
          }
          icon={<Footprints size={24} />}
        />
        {shouldConsult && (
          <CardContent>
            <div className={styles.alert}>
              <AlertTriangle size={18} />
              <span>Se detectaron signos que requieren atención médica</span>
            </div>
            <Button 
              variant="danger" 
              size="small" 
              fullWidth
              leftIcon={<Stethoscope size={18} />}
            >
              Consultar médico
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Report wound button */}
      <div className={styles.quickActions}>
        <Button
          variant="danger"
          size="large"
          fullWidth
          leftIcon={<AlertTriangle size={20} />}
          onClick={() => setShowWoundModal(true)}
          style={{ backgroundColor: 'transparent', color: 'var(--color-danger)', border: '2px solid var(--color-danger)' }}
        >
          Reportar herida o cambio
        </Button>
      </div>

      {/* History */}
      {footChecks.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Historial de revisiones</h3>
          <div className={styles.historyList}>
            {footChecks.slice(0, 7).map(check => (
              <div 
                key={check.id} 
                className={`${styles.historyItem} ${check.woundFound ? styles.hasIssue : ''}`}
              >
                <div className={styles.historyDate}>
                  {new Date(check.checkedAt).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className={styles.historyStatus}>
                  {check.woundFound ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reported Wounds — NOW WITH PHOTO THUMBNAIL */}
      {wounds.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Heridas reportadas</h3>
          <div className={styles.woundsList}>
            {wounds.slice(0, 5).map(wound => (
              <Card key={wound.id} className={styles.woundCard}>
                <CardContent>
                  {/* NEW: show photo if available */}
                  {wound.photoUrl && (
                    <img
                      src={wound.photoUrl}
                      alt="Foto de herida"
                      className={styles.woundPhoto}
                    />
                  )}
                  <div className={styles.woundHeader}>
                    <span className={styles.woundLocation}>{wound.location}</span>
                    <span className={`${styles.severity} ${styles[wound.severity]}`}>
                      {wound.severity === 'low' ? 'Baja' : wound.severity === 'medium' ? 'Media' : 'Alta'}
                    </span>
                  </div>
                  <p className={styles.woundDescription}>{wound.description}</p>
                  <p className={styles.woundDate}>
                    {new Date(wound.checkedAt).toLocaleDateString('es-ES')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Check Modal */}
      <Modal
        isOpen={showCheckModal}
        onClose={() => setShowCheckModal(false)}
        title="Revisión de Pies"
        description="Marcá cada ítem después de revisar cuidadosamente"
        size="large"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCheckModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveCheck}>Guardar revisión</Button>
          </>
        }
      >
        <div className={styles.checklist}>
          <div className={styles.instructions}>
            <Info size={18} />
            <p>Usá un espejo o pedí ayuda para revisar la planta de tus pies. 
               Prestá atención a cualquier cambio.</p>
          </div>
          
          {checklistItems.map((item, index) => (
            <label key={item.id} className={styles.checkItem}>
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
            label="Notas adicionales"
            value={footNotes}
            onChange={(e) => setFootNotes(e.target.value)}
            placeholder="¿Notaste algo fuera de lo normal?"
            rows={3}
            fullWidth
          />
        </div>
      </Modal>

      {/* Wound Modal — WITH CAMERA */}
      <Modal
        isOpen={showWoundModal}
        onClose={() => { setShowWoundModal(false); resetWoundForm() }}
        title="Reportar Herida o Cambio"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowWoundModal(false); resetWoundForm() }}>
              Cancelar
            </Button>
            <Button onClick={handleReportWound} variant="danger">
              Reportar
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <Textarea
            label="¿Dónde está ubicado?"
            value={woundLocation}
            onChange={(e) => setWoundLocation(e.target.value)}
            placeholder="Ej: Planta del pie derecho, talón izquierdo..."
            rows={2}
            fullWidth
            required
          />
          
          <Textarea
            label="Describí lo que observás"
            value={woundDescription}
            onChange={(e) => setWoundDescription(e.target.value)}
            placeholder="Color, tamaño, si hay dolor, secreción..."
            rows={3}
            fullWidth
            required
          />

          {/* NEW: Photo section */}
          <div className={styles.photoSection}>
            <label className={styles.label}>Foto (opcional)</label>

            {/* Camera live view */}
            {showCamera && (
              <div className={styles.cameraContainer}>
                <video
                  ref={videoRef}
                  className={styles.cameraVideo}
                  autoPlay
                  playsInline
                  muted
                />
                <div className={styles.cameraActions}>
                  <Button
                    variant="primary"
                    size="large"
                    leftIcon={<Camera size={20} />}
                    onClick={takePhoto}
                    fullWidth
                  >
                    Sacar foto
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => { stopCamera(); setShowCamera(false) }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Photo preview */}
            {woundPhoto && !showCamera && (
              <div className={styles.photoPreview}>
                <img src={woundPhoto} alt="Foto de herida" className={styles.previewImg} />
                <button
                  className={styles.removePhoto}
                  onClick={() => setWoundPhoto(null)}
                  aria-label="Eliminar foto"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Buttons to add photo */}
            {!woundPhoto && !showCamera && (
              <div className={styles.photoButtons}>
                <Button
                  variant="outline"
                  size="medium"
                  leftIcon={<Camera size={18} />}
                  onClick={startCamera}
                  fullWidth
                >
                  Abrir cámara
                </Button>
                <Button
                  variant="outline"
                  size="medium"
                  leftIcon={<ImagePlus size={18} />}
                  onClick={() => fileInputRef.current?.click()}
                  fullWidth
                >
                  Subir imagen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>
            )}

            {cameraError && (
              <p className={styles.cameraError}>{cameraError}</p>
            )}
          </div>
          
          <div className={styles.severitySelector}>
            <label className={styles.label}>Nivel de preocupación</label>
            <div className={styles.severityOptions}>
              {[
                { value: 'low', label: 'Bajo', desc: 'Vigilar' },
                { value: 'medium', label: 'Medio', desc: 'Consultar pronto' },
                { value: 'high', label: 'Alto', desc: '¡Urgente!' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.severityOption} ${woundSeverity === opt.value ? styles.selected : ''}`}
                  onClick={() => setWoundSeverity(opt.value as 'low' | 'medium' | 'high')}
                >
                  <span className={styles.severityLabel}>{opt.label}</span>
                  <span className={styles.severityDesc}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
