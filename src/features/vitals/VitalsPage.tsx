import React, { useEffect, useState } from 'react'
import styles from './VitalsPage.module.css'
import { Card, CardHeader, CardContent } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/ui/Modal/Modal'
import { Input } from '@/components/ui/Input/Input'
import { Heart, Droplets, Scale, TrendingUp, Plus, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { bpRepo, glucoseRepo, weightRepo } from '@/data/repos/healthMetricsRepo'
import type { BloodPressureReading, GlucoseReading, WeightReading } from '@/types'

type TabType = 'glucose' | 'bp' | 'weight'

export const VitalsPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('glucose')

  // Glucose state
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>([])
  const [showGlucoseModal, setShowGlucoseModal] = useState(false)
  const [glucoseValue, setGlucoseValue] = useState('')
  const [glucoseType, setGlucoseType] = useState<GlucoseReading['type']>('fasting')

  // Blood pressure state
  const [bpReadings, setBpReadings] = useState<BloodPressureReading[]>([])
  const [showBpModal, setShowBpModal] = useState(false)
  const [bpSystolic, setBpSystolic] = useState('')
  const [bpDiastolic, setBpDiastolic] = useState('')
  const [bpPulse, setBpPulse] = useState('')

  // Weight state
  const [weightReadings, setWeightReadings] = useState<WeightReading[]>([])
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [weightValue, setWeightValue] = useState('')

  useEffect(() => {
    if (user) loadAll()
  }, [user])

  const loadAll = async () => {
    if (!user) return
    const [glucose, bp, weight] = await Promise.all([
      glucoseRepo.getLast(user.id, 14),
      bpRepo.getLast(user.id, 14),
      weightRepo.getLast(user.id, 30)
    ])
    setGlucoseReadings(glucose)
    setBpReadings(bp)
    setWeightReadings(weight)
  }

  const handleSaveGlucose = async () => {
    if (!user || !glucoseValue) return
    await glucoseRepo.create({
      userId: user.id,
      value: parseInt(glucoseValue),
      type: glucoseType,
      recordedAt: new Date().toISOString()
    })
    setShowGlucoseModal(false)
    setGlucoseValue('')
    await loadAll()
  }

  const handleSaveBP = async () => {
    if (!user || !bpSystolic || !bpDiastolic) return
    await bpRepo.create({
      userId: user.id,
      systolic: parseInt(bpSystolic),
      diastolic: parseInt(bpDiastolic),
      pulse: bpPulse ? parseInt(bpPulse) : undefined,
      recordedAt: new Date().toISOString()
    })
    setShowBpModal(false)
    setBpSystolic('')
    setBpDiastolic('')
    setBpPulse('')
    await loadAll()
  }

  const handleSaveWeight = async () => {
    if (!user || !weightValue) return
    await weightRepo.create({
      userId: user.id,
      weightKg: parseFloat(weightValue),
      recordedAt: new Date().toISOString()
    })
    setShowWeightModal(false)
    setWeightValue('')
    await loadAll()
  }

  const latestGlucose = glucoseReadings[0]
  const latestBP = bpReadings[0]
  const latestWeight = weightReadings[0]

  const glucoseStatus = latestGlucose
    ? glucoseRepo.getStatus(latestGlucose.value, latestGlucose.type)
    : null

  const bpStatus = latestBP
    ? bpRepo.getStatus(latestBP.systolic, latestBP.diastolic)
    : null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Mis signos vitales</h2>
      </header>

      {/* Summary cards */}
      <div className={styles.summaryGrid}>
        <button
          className={`${styles.summaryCard} ${activeTab === 'glucose' ? styles.active : ''} ${glucoseStatus && glucoseStatus !== 'normal' ? styles.alert : ''}`}
          onClick={() => setActiveTab('glucose')}
        >
          <Droplets size={20} className={styles.summaryIcon} />
          <div className={styles.summaryValue}>
            {latestGlucose ? `${latestGlucose.value}` : '—'}
            {latestGlucose && <span className={styles.summaryUnit}>mg/dL</span>}
          </div>
          <div className={styles.summaryLabel}>Glucosa</div>
          {glucoseStatus && glucoseStatus !== 'normal' && (
            <AlertTriangle size={14} className={styles.alertIcon} />
          )}
        </button>

        <button
          className={`${styles.summaryCard} ${activeTab === 'bp' ? styles.active : ''} ${bpStatus && bpStatus !== 'normal' ? styles.alert : ''}`}
          onClick={() => setActiveTab('bp')}
        >
          <Heart size={20} className={styles.summaryIcon} />
          <div className={styles.summaryValue}>
            {latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : '—'}
          </div>
          <div className={styles.summaryLabel}>Presión</div>
          {bpStatus && bpStatus !== 'normal' && (
            <AlertTriangle size={14} className={styles.alertIcon} />
          )}
        </button>

        <button
          className={`${styles.summaryCard} ${activeTab === 'weight' ? styles.active : ''}`}
          onClick={() => setActiveTab('weight')}
        >
          <Scale size={20} className={styles.summaryIcon} />
          <div className={styles.summaryValue}>
            {latestWeight ? `${latestWeight.weightKg}` : '—'}
            {latestWeight && <span className={styles.summaryUnit}>kg</span>}
          </div>
          <div className={styles.summaryLabel}>Peso</div>
        </button>
      </div>

      {/* GLUCOSE TAB */}
      {activeTab === 'glucose' && (
        <div className={styles.tabContent}>
          <div className={styles.tabHeader}>
            <h3 className={styles.tabTitle}>Glucemia</h3>
            <Button
              variant="primary"
              size="small"
              leftIcon={<Plus size={16} />}
              onClick={() => setShowGlucoseModal(true)}
            >
              Registrar
            </Button>
          </div>

          {/* Reference ranges */}
          <Card>
            <CardContent>
              <div className={styles.rangeTitle}>Valores de referencia</div>
              <div className={styles.rangeGrid}>
                <div className={styles.rangeItem}>
                  <div className={styles.rangeDot} style={{ background: '#22c55e' }} />
                  <span>Ayunas: 70–100 mg/dL</span>
                </div>
                <div className={styles.rangeItem}>
                  <div className={styles.rangeDot} style={{ background: '#f59e0b' }} />
                  <span>Post-comida: &lt;140 mg/dL</span>
                </div>
                <div className={styles.rangeItem}>
                  <div className={styles.rangeDot} style={{ background: '#ef4444' }} />
                  <span>Alto: &gt;200 mg/dL</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mini chart using CSS bars */}
          {glucoseReadings.length > 0 && (
            <Card>
              <CardContent>
                <div className={styles.chartTitle}>
                  <TrendingUp size={16} />
                  Últimas {glucoseReadings.length} lecturas
                </div>
                <div className={styles.barChart}>
                  {[...glucoseReadings].reverse().map((r) => {
                    const status = glucoseRepo.getStatus(r.value, r.type)
                    const barColor = status === 'normal' ? '#22c55e' : status === 'low' ? '#3b82f6' : status === 'elevated' ? '#f59e0b' : '#ef4444'
                    const maxVal = 300
                    const height = Math.min((r.value / maxVal) * 100, 100)
                    return (
                      <div key={r.id} className={styles.barWrapper}>
                        <div className={styles.barValue}>{r.value}</div>
                        <div className={styles.barOuter}>
                          <div
                            className={styles.barInner}
                            style={{ height: `${height}%`, background: barColor }}
                          />
                        </div>
                        <div className={styles.barLabel}>
                          {new Date(r.recordedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* List */}
          <div className={styles.readingsList}>
            {glucoseReadings.length === 0 ? (
              <p className={styles.empty}>No hay lecturas registradas todavía</p>
            ) : (
              glucoseReadings.map(r => {
                const status = glucoseRepo.getStatus(r.value, r.type)
                return (
                  <div key={r.id} className={`${styles.readingItem} ${styles[status]}`}>
                    <div className={styles.readingMain}>
                      <span className={styles.readingValue}>{r.value} <small>mg/dL</small></span>
                      <span className={styles.readingType}>{glucoseRepo.getTypeLabel(r.type)}</span>
                    </div>
                    <div className={styles.readingRight}>
                      <span className={`${styles.statusBadge} ${styles[`badge_${status}`]}`}>
                        {status === 'normal' ? '✓ Normal' : status === 'low' ? '↓ Bajo' : status === 'elevated' ? '↑ Elevado' : '⚠ Alto'}
                      </span>
                      <span className={styles.readingDate}>
                        {new Date(r.recordedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* BLOOD PRESSURE TAB */}
      {activeTab === 'bp' && (
        <div className={styles.tabContent}>
          <div className={styles.tabHeader}>
            <h3 className={styles.tabTitle}>Presión arterial</h3>
            <Button
              variant="primary"
              size="small"
              leftIcon={<Plus size={16} />}
              onClick={() => setShowBpModal(true)}
            >
              Registrar
            </Button>
          </div>

          <Card>
            <CardContent>
              <div className={styles.rangeTitle}>Clasificación</div>
              <div className={styles.rangeGrid}>
                <div className={styles.rangeItem}><div className={styles.rangeDot} style={{ background: '#22c55e' }} /><span>Normal: &lt;130/80</span></div>
                <div className={styles.rangeItem}><div className={styles.rangeDot} style={{ background: '#f59e0b' }} /><span>Elevada: 130–139/80–89</span></div>
                <div className={styles.rangeItem}><div className={styles.rangeDot} style={{ background: '#ef4444' }} /><span>Alta: ≥140/90</span></div>
                <div className={styles.rangeItem}><div className={styles.rangeDot} style={{ background: '#7c3aed' }} /><span>Crisis: ≥180/120</span></div>
              </div>
            </CardContent>
          </Card>

          {bpReadings.length > 0 && (
            <Card>
              <CardContent>
                <div className={styles.chartTitle}><TrendingUp size={16} /> Últimas lecturas</div>
                <div className={styles.bpChartList}>
                  {[...bpReadings].reverse().map((r) => {
                    const status = bpRepo.getStatus(r.systolic, r.diastolic)
                    const sysPercent = Math.min((r.systolic / 200) * 100, 100)
                    const diaPercent = Math.min((r.diastolic / 130) * 100, 100)
                    const color = status === 'normal' ? '#22c55e' : status === 'elevated' ? '#f59e0b' : status === 'high' ? '#ef4444' : '#7c3aed'
                    return (
                      <div key={r.id} className={styles.bpChartRow}>
                        <div className={styles.bpChartDate}>
                          {new Date(r.recordedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className={styles.bpBars}>
                          <div className={styles.bpBarRow}>
                            <span className={styles.bpBarLabel}>Sis</span>
                            <div className={styles.bpBarOuter}>
                              <div className={styles.bpBarInner} style={{ width: `${sysPercent}%`, background: color }} />
                            </div>
                            <span className={styles.bpBarVal}>{r.systolic}</span>
                          </div>
                          <div className={styles.bpBarRow}>
                            <span className={styles.bpBarLabel}>Dia</span>
                            <div className={styles.bpBarOuter}>
                              <div className={styles.bpBarInner} style={{ width: `${diaPercent}%`, background: color, opacity: 0.7 }} />
                            </div>
                            <span className={styles.bpBarVal}>{r.diastolic}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className={styles.readingsList}>
            {bpReadings.length === 0 ? (
              <p className={styles.empty}>No hay lecturas registradas todavía</p>
            ) : (
              bpReadings.map(r => {
                const status = bpRepo.getStatus(r.systolic, r.diastolic)
                return (
                  <div key={r.id} className={`${styles.readingItem} ${styles[status]}`}>
                    <div className={styles.readingMain}>
                      <span className={styles.readingValue}>{r.systolic}/{r.diastolic} <small>mmHg</small></span>
                      {r.pulse && <span className={styles.readingType}>Pulso: {r.pulse} bpm</span>}
                    </div>
                    <div className={styles.readingRight}>
                      <span className={`${styles.statusBadge} ${styles[`badge_${status}`]}`}>
                        {bpRepo.getStatusLabel(status)}
                      </span>
                      <span className={styles.readingDate}>
                        {new Date(r.recordedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* WEIGHT TAB */}
      {activeTab === 'weight' && (
        <div className={styles.tabContent}>
          <div className={styles.tabHeader}>
            <h3 className={styles.tabTitle}>Peso corporal</h3>
            <Button
              variant="primary"
              size="small"
              leftIcon={<Plus size={16} />}
              onClick={() => setShowWeightModal(true)}
            >
              Registrar
            </Button>
          </div>

          {weightReadings.length > 1 && (
            <Card>
              <CardContent>
                <div className={styles.weightStats}>
                  <div className={styles.weightStat}>
                    <div className={styles.weightStatVal}>{weightReadings[0].weightKg} kg</div>
                    <div className={styles.weightStatLabel}>Actual</div>
                  </div>
                  <div className={styles.weightStat}>
                    <div className={styles.weightStatVal}>
                      {weightReadings[0].weightKg > weightReadings[1].weightKg ? '↑' : '↓'}
                      {Math.abs(weightReadings[0].weightKg - weightReadings[1].weightKg).toFixed(1)} kg
                    </div>
                    <div className={styles.weightStatLabel}>vs anterior</div>
                  </div>
                  <div className={styles.weightStat}>
                    <div className={styles.weightStatVal}>{weightReadings[weightReadings.length - 1].weightKg} kg</div>
                    <div className={styles.weightStatLabel}>Inicial</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className={styles.readingsList}>
            {weightReadings.length === 0 ? (
              <p className={styles.empty}>No hay registros de peso todavía</p>
            ) : (
              weightReadings.map((r, i) => {
                const prev = weightReadings[i + 1]
                const diff = prev ? r.weightKg - prev.weightKg : null
                return (
                  <div key={r.id} className={styles.readingItem}>
                    <div className={styles.readingMain}>
                      <span className={styles.readingValue}>{r.weightKg} <small>kg</small></span>
                      {diff !== null && (
                        <span className={styles.readingType} style={{ color: diff > 0 ? '#f59e0b' : '#22c55e' }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                        </span>
                      )}
                    </div>
                    <div className={styles.readingRight}>
                      <span className={styles.readingDate}>
                        {new Date(r.recordedAt).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* GLUCOSE MODAL */}
      <Modal
        isOpen={showGlucoseModal}
        onClose={() => setShowGlucoseModal(false)}
        title="Registrar glucosa"
        size="small"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowGlucoseModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveGlucose} disabled={!glucoseValue}>Guardar</Button>
          </>
        }
      >
        <div className={styles.modalForm}>
          <Input
            label="Valor (mg/dL)"
            type="number"
            value={glucoseValue}
            onChange={e => setGlucoseValue(e.target.value)}
            placeholder="Ej: 120"
            fullWidth
          />
          <div className={styles.typeSelector}>
            <label className={styles.typeLabel}>Tipo de medición</label>
            <div className={styles.typeOptions}>
              {[
                { value: 'fasting', label: '🌅 Ayunas' },
                { value: 'postmeal', label: '🍽️ Post-comida' },
                { value: 'random', label: '🕐 Aleatoria' },
                { value: 'bedtime', label: '🌙 Antes de dormir' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.typeOption} ${glucoseType === opt.value ? styles.typeSelected : ''}`}
                  onClick={() => setGlucoseType(opt.value as GlucoseReading['type'])}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* BLOOD PRESSURE MODAL */}
      <Modal
        isOpen={showBpModal}
        onClose={() => setShowBpModal(false)}
        title="Registrar presión arterial"
        size="small"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowBpModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveBP} disabled={!bpSystolic || !bpDiastolic}>Guardar</Button>
          </>
        }
      >
        <div className={styles.modalForm}>
          <div className={styles.bpInputRow}>
            <Input
              label="Sistólica (alta)"
              type="number"
              value={bpSystolic}
              onChange={e => setBpSystolic(e.target.value)}
              placeholder="120"
              fullWidth
            />
            <span className={styles.bpSlash}>/</span>
            <Input
              label="Diastólica (baja)"
              type="number"
              value={bpDiastolic}
              onChange={e => setBpDiastolic(e.target.value)}
              placeholder="80"
              fullWidth
            />
          </div>
          <Input
            label="Pulso (opcional)"
            type="number"
            value={bpPulse}
            onChange={e => setBpPulse(e.target.value)}
            placeholder="70 bpm"
            fullWidth
          />
          <p className={styles.bpHint}>
            💡 Tomá 2 lecturas con 1 minuto de diferencia y anotá el promedio
          </p>
        </div>
      </Modal>

      {/* WEIGHT MODAL */}
      <Modal
        isOpen={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        title="Registrar peso"
        size="small"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowWeightModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveWeight} disabled={!weightValue}>Guardar</Button>
          </>
        }
      >
        <div className={styles.modalForm}>
          <Input
            label="Peso (kg)"
            type="number"
            value={weightValue}
            onChange={e => setWeightValue(e.target.value)}
            placeholder="Ej: 78.5"
            fullWidth
          />
          <p className={styles.bpHint}>💡 Pesate siempre a la misma hora, preferentemente de mañana</p>
        </div>
      </Modal>
    </div>
  )
}
