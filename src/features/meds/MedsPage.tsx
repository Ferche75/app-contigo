import React, { useEffect, useState } from 'react'
import styles from './MedsPage.module.css'
import { Card, CardHeader, CardContent } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/ui/Modal/Modal'
import { Input } from '@/components/ui/Input/Input'
import { Plus, Pill, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { medsRepo, medLogsRepo } from '@/data/repos/medsRepo'
import type { Medication } from '@/types'

const DAYS_OPTIONS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
]

export const MedsPage: React.FC = () => {
  const { user } = useAuth()
  const [medications, setMedications] = useState<Medication[]>([])
  const [adherence, setAdherence] = useState(100)
  const [streak, setStreak] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Form state
  const [medName, setMedName] = useState('')
  const [medDose, setMedDose] = useState('')
  const [medTime, setMedTime] = useState('08:00')
  const [medDays, setMedDays] = useState<string[]>(['1', '2', '3', '4', '5'])

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    
    const meds = await medsRepo.getAll(user.id)
    setMedications(meds)
    
    const adh = await medLogsRepo.calculateAdherence(user.id, 7)
    setAdherence(adh)
    
    const str = await medLogsRepo.getStreak(user.id)
    setStreak(str)
  }

  const handleAddMedication = async () => {
    if (!user || !medName || !medDose) return
    
    await medsRepo.create({
      userId: user.id,
      name: medName,
      dosage: medDose,
      schedule: [{
        id: crypto.randomUUID(),
        time: medTime,
        days: medDays.map(d => parseInt(d)),
        label: ''
      }],
      toleranceWindow: 30,
      notes: '',
      active: true
    })
    
    setShowAddModal(false)
    setMedName('')
    setMedDose('')
    setMedTime('08:00')
    setMedDays(['1', '2', '3', '4', '5'])
    await loadData()
  }

  const toggleDay = (day: string) => {
    setMedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Medicación</h2>
        <Button
          variant="primary"
          size="small"
          leftIcon={<Plus size={18} />}
          onClick={() => setShowAddModal(true)}
        >
          Agregar
        </Button>
      </header>

      {/* Stats */}
      <div className={styles.stats}>
        <Card className={styles.statCard}>
          <div className={styles.statValue}>{adherence}%</div>
          <div className={styles.statLabel}>Adherencia (7 días)</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statValue}>{streak}</div>
          <div className={styles.statLabel}>Días seguidos</div>
        </Card>
      </div>

      {/* Medications List */}
      <div className={styles.medicationsList}>
        {medications.length === 0 ? (
          <Card className={styles.emptyCard}>
            <CardContent>
              <Pill size={48} className={styles.emptyIcon} />
              <p className={styles.emptyText}>No tienes medicación registrada</p>
              <Button variant="outline" onClick={() => setShowAddModal(true)}>
                Agregar medicación
              </Button>
            </CardContent>
          </Card>
        ) : (
          medications.map(med => (
            <Card key={med.id} className={styles.medCard}>
              <CardHeader
                title={med.name}
                subtitle={med.dosage}
                icon={<Pill size={20} />}
              />
              <CardContent>
                <div className={styles.schedule}>
                  <Clock size={16} />
                  <span>
                    {med.schedule.map(s => s.time).join(', ')} - {' '}
                    {med.schedule[0]?.days.length === 7 
                      ? 'Todos los días' 
                      : `${med.schedule[0]?.days.length} días a la semana`
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Agregar Medicación"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMedication}>
              Guardar
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <Input
            label="Nombre del medicamento"
            value={medName}
            onChange={(e) => setMedName(e.target.value)}
            placeholder="Ej: Metformina"
            required
            fullWidth
          />
          
          <Input
            label="Dosis"
            value={medDose}
            onChange={(e) => setMedDose(e.target.value)}
            placeholder="Ej: 500mg"
            required
            fullWidth
          />
          
          <Input
            label="Hora"
            type="time"
            value={medTime}
            onChange={(e) => setMedTime(e.target.value)}
            required
            fullWidth
          />
          
          <div className={styles.daysSelector}>
            <label className={styles.daysLabel}>Días de la semana</label>
            <div className={styles.daysGrid}>
              {DAYS_OPTIONS.map(day => (
                <button
                  key={day.value}
                  type="button"
                  className={`${styles.dayButton} ${medDays.includes(day.value) ? styles.selected : ''}`}
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
