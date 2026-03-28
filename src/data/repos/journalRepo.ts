import { journalOps } from '@/data/local/db'
import { syncEngine } from '@/data/sync/syncEngine'
import type { JournalEntry } from '@/types'

export const journalRepo = {
  // Get all journal entries for user
  async getAll(userId: string): Promise<JournalEntry[]> {
    return await journalOps.getAll(userId)
  },

  // Get entry for specific date
  async getForDate(userId: string, date: string): Promise<JournalEntry | undefined> {
    return await journalOps.getForDate(userId, date)
  },

  // Get today's entry
  async getToday(userId: string): Promise<JournalEntry | undefined> {
    const today = new Date().toISOString().split('T')[0]
    return await journalOps.getForDate(userId, today)
  },

  // Create or update entry
  async save(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<JournalEntry> {
    const now = new Date().toISOString()
    const id = entry.id || crypto.randomUUID()

    // Get existing entry to preserve createdAt if updating
    let createdAt = now
    if (entry.id) {
      const existing = await journalOps.getForDate(entry.userId, entry.date)
      if (existing) {
        createdAt = existing.createdAt
      }
    }

    const newEntry: JournalEntry = {
      ...entry,
      id,
      createdAt,
      updatedAt: now
    }

    // Save locally first
    await journalOps.put(newEntry)

    // Queue for sync
    await syncEngine.queueOperation('journal_entries', entry.id ? 'update' : 'insert', {
      id,
      user_id: entry.userId,
      date: entry.date,
      content: entry.content,
      mood: entry.mood,
      glucose_level: entry.glucoseLevel,
      created_at: createdAt,
      updated_at: now
    })

    return newEntry
  },

  // Update entry
  async update(id: string, updates: Partial<JournalEntry>): Promise<void> {
    const allEntries = await journalOps.getAll('')
    const existing = allEntries.find(e => e.id === id)
    if (!existing) throw new Error('Journal entry not found')

    const now = new Date().toISOString()
    const updated: JournalEntry = {
      ...existing,
      ...updates,
      id,
      updatedAt: now
    }

    // Save locally
    await journalOps.put(updated)

    // Queue for sync
    await syncEngine.queueOperation('journal_entries', 'update', {
      id,
      date: updated.date,
      content: updated.content,
      mood: updated.mood,
      glucose_level: updated.glucoseLevel,
      updated_at: now
    })
  },

  // Delete entry
  async delete(id: string): Promise<void> {
    await journalOps.delete(id)
    await syncEngine.queueOperation('journal_entries', 'delete', { id })
  },

  // Save or update today's entry
  async saveToday(userId: string, content: string, mood?: 'good' | 'neutral' | 'bad', glucoseLevel?: number): Promise<JournalEntry> {
    const today = new Date().toISOString().split('T')[0]
    const existing = await this.getForDate(userId, today)

    if (existing) {
      await this.update(existing.id, { content, mood, glucoseLevel })
      return { ...existing, content, mood, glucoseLevel, updatedAt: new Date().toISOString() }
    } else {
      return await this.save({
        userId,
        date: today,
        content,
        mood,
        glucoseLevel
      })
    }
  },

  // Get entries for date range
  async getForDateRange(userId: string, startDate: string, endDate: string): Promise<JournalEntry[]> {
    const all = await journalOps.getAll(userId)
    return all.filter(entry => entry.date >= startDate && entry.date <= endDate)
  },

  // Get mood trend for last N days
  async getMoodTrend(userId: string, days: number = 7): Promise<{ date: string; mood: string | null | undefined }[]> {
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const entries = await this.getForDateRange(userId, startDate, endDate)
    
    return entries.map(entry => ({
      date: entry.date,
      mood: entry.mood
    }))
  },

  // Get average glucose for period
  async getAverageGlucose(userId: string, days: number = 7): Promise<number | null> {
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const entries = await this.getForDateRange(userId, startDate, endDate)
    const withGlucose = entries.filter(e => e.glucoseLevel)
    
    if (withGlucose.length === 0) return null
    
    const sum = withGlucose.reduce((acc, e) => acc + (e.glucoseLevel || 0), 0)
    return Math.round(sum / withGlucose.length)
  }
}
