import { woundOps, footCheckOps } from '@/data/local/db'
import { syncEngine } from '@/data/sync/syncEngine'
import type { WoundReport, FootCheck, FootChecklistItem } from '@/types'

export const woundsRepo = {
  // Get all wound reports for user
  async getAll(userId: string): Promise<WoundReport[]> {
    return await woundOps.getAll(userId)
  },

  // Get single wound report
  async get(id: string): Promise<WoundReport | undefined> {
    return await woundOps.get(id)
  },

  // Create wound report
  async create(wound: Omit<WoundReport, 'id' | 'createdAt'>): Promise<WoundReport> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const newWound: WoundReport = {
      ...wound,
      id,
      createdAt: now
    }

    // Save locally first
    await woundOps.put(newWound)

    // Queue for sync
    await syncEngine.queueOperation('wound_reports', 'insert', {
      id,
      user_id: wound.userId,
      location: wound.location,
      description: wound.description,
      severity: wound.severity,
      size: wound.size,
      color: wound.color,
      has_pain: wound.hasPain,
      has_temperature: wound.hasTemperature,
      has_secretion: wound.hasSecretion,
      photo_url: wound.photoUrl,
      checked_at: wound.checkedAt,
      created_at: now
    })

    return newWound
  },

  // Update wound report
  async update(id: string, updates: Partial<WoundReport>): Promise<void> {
    const existing = await woundOps.get(id)
    if (!existing) throw new Error('Wound report not found')

    const updated: WoundReport = {
      ...existing,
      ...updates,
      id
    }

    // Save locally
    await woundOps.put(updated)

    // Queue for sync
    await syncEngine.queueOperation('wound_reports', 'update', {
      id,
      location: updated.location,
      description: updated.description,
      severity: updated.severity,
      size: updated.size,
      color: updated.color,
      has_pain: updated.hasPain,
      has_temperature: updated.hasTemperature,
      has_secretion: updated.hasSecretion,
      photo_url: updated.photoUrl,
      checked_at: updated.checkedAt
    })
  },

  // Delete wound report
  async delete(id: string): Promise<void> {
    await woundOps.delete(id)
    await syncEngine.queueOperation('wound_reports', 'delete', { id })
  },

  // Get high severity wounds
  async getHighSeverity(userId: string): Promise<WoundReport[]> {
    const all = await woundOps.getAll(userId)
    return all.filter(w => w.severity === 'high')
  }
}

// Default foot checklist items based on medical guidelines
export const defaultFootChecklist: FootChecklistItem[] = [
  { id: '1', item: 'Revisé la planta de los pies (usando espejo o ayuda)', checked: false },
  { id: '2', item: 'Revisé entre los dedos de los pies', checked: false },
  { id: '3', item: 'No hay cambios de color (rojo, blanco, azul, negro)', checked: false },
  { id: '4', item: 'No hay áreas calientes o frías anormales', checked: false },
  { id: '5', item: 'No hay hinchazón o inflamación', checked: false },
  { id: '6', item: 'No hay cortes, raspaduras o heridas', checked: false },
  { id: '7', item: 'No hay ampollas o callosidades nuevas', checked: false },
  { id: '8', item: 'La piel no está seca o agrietada', checked: false },
  { id: '9', item: 'Las uñas se ven normales', checked: false },
  { id: '10', item: 'Siento sensibilidad normal en ambos pies', checked: false }
]

export const footChecksRepo = {
  // Get all foot checks for user
  async getAll(userId: string): Promise<FootCheck[]> {
    return await footCheckOps.getAll(userId)
  },

  // Get today's foot check
  async getToday(userId: string): Promise<FootCheck | undefined> {
    return await footCheckOps.getToday(userId)
  },

  // Create foot check
  async create(check: Omit<FootCheck, 'id'>): Promise<FootCheck> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const newCheck: FootCheck = {
      ...check,
      id,
      createdAt: now
    }

    // Save locally first
    await footCheckOps.put(newCheck)

    // Queue for sync
    await syncEngine.queueOperation('foot_checks', 'insert', {
      id,
      user_id: check.userId,
      checked_at: check.checkedAt,
      notes: check.notes,
      checklist_items: check.checklistItems,
      wound_found: check.woundFound,
      wound_report_id: check.woundReportId,
      created_at: now
    })

    return newCheck
  },

  // Update foot check
  async update(id: string, updates: Partial<FootCheck>): Promise<void> {
    const allChecks = await footCheckOps.getAll('')
    const existing = allChecks.find(c => c.id === id)
    if (!existing) throw new Error('Foot check not found')

    const updated: FootCheck = {
      ...existing,
      ...updates,
      id
    }

    // Save locally
    await footCheckOps.put(updated)

    // Queue for sync
    await syncEngine.queueOperation('foot_checks', 'update', {
      id,
      checked_at: updated.checkedAt,
      notes: updated.notes,
      checklist_items: updated.checklistItems,
      wound_found: updated.woundFound,
      wound_report_id: updated.woundReportId
    })
  },

  // Create or update today's check
  async saveTodayCheck(
    userId: string, 
    checklistItems: FootChecklistItem[], 
    notes?: string,
    woundReportId?: string
  ): Promise<FootCheck> {
    const existing = await this.getToday(userId)
    const woundFound = checklistItems.some(item => 
      (item.id === '3' && !item.checked) || // Color change
      (item.id === '4' && !item.checked) || // Temperature
      (item.id === '5' && !item.checked) || // Swelling
      (item.id === '6' && !item.checked) || // Cuts
      (item.id === '7' && !item.checked) || // Blisters
      (item.id === '8' && !item.checked) || // Dry skin
      (item.id === '10' && !item.checked)   // Sensitivity
    )

    const now = new Date().toISOString()
    if (existing) {
      await this.update(existing.id, {
        checklistItems,
        notes,
        woundFound: woundFound || !!woundReportId,
        woundReportId
      })
      return { ...existing, checklistItems, notes, woundFound: woundFound || !!woundReportId, woundReportId, createdAt: existing.createdAt }
    } else {
      return await this.create({
        userId,
        checkedAt: now,
        checklistItems,
        notes,
        woundFound: woundFound || !!woundReportId,
        woundReportId,
        createdAt: now
      })
    }
  },

  // Get checklist with warning signs
  getWarningSigns(checklistItems: FootChecklistItem[]): string[] {
    const warnings: string[] = []
    
    const warningMap: Record<string, string> = {
      '3': 'Cambio de color en la piel',
      '4': 'Temperatura anormal (caliente o frío)',
      '5': 'Hinchazón o inflamación',
      '6': 'Cortes, raspaduras o heridas visibles',
      '7': 'Ampollas o callosidades nuevas',
      '8': 'Piel muy seca o agrietada',
      '10': 'Pérdida de sensibilidad'
    }

    for (const item of checklistItems) {
      if (!item.checked && warningMap[item.id]) {
        warnings.push(warningMap[item.id])
      }
    }

    return warnings
  },

  // Check if should consult doctor
  shouldConsultDoctor(checklistItems: FootChecklistItem[]): boolean {
    const criticalItems = ['3', '4', '5', '6', '7']
    return checklistItems.some(item => 
      criticalItems.includes(item.id) && !item.checked
    )
  }
}
