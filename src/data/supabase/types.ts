export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          age: number | null
          diabetes_type: string | null
          doctor_name: string | null
          doctor_phone: string | null
          allergies: string | null
          base_medication: string | null
          emergency_contacts: Json
          low_vision_mode: boolean
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          age?: number | null
          diabetes_type?: string | null
          doctor_name?: string | null
          doctor_phone?: string | null
          allergies?: string | null
          base_medication?: string | null
          emergency_contacts?: Json
          low_vision_mode?: boolean
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          age?: number | null
          diabetes_type?: string | null
          doctor_name?: string | null
          doctor_phone?: string | null
          allergies?: string | null
          base_medication?: string | null
          emergency_contacts?: Json
          low_vision_mode?: boolean
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      medications: {
        Row: {
          id: string
          user_id: string
          name: string
          dosage: string
          schedule: Json
          tolerance_window: number
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          dosage: string
          schedule?: Json
          tolerance_window?: number
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          dosage?: string
          schedule?: Json
          tolerance_window?: number
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      medication_logs: {
        Row: {
          id: string
          medication_id: string
          user_id: string
          scheduled_time: string
          taken_at: string | null
          status: string
          postponed_to: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          medication_id: string
          user_id: string
          scheduled_time: string
          taken_at?: string | null
          status: string
          postponed_to?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          medication_id?: string
          user_id?: string
          scheduled_time?: string
          taken_at?: string | null
          status?: string
          postponed_to?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      wound_reports: {
        Row: {
          id: string
          user_id: string
          location: string
          description: string
          severity: string
          size: string | null
          color: string | null
          has_pain: boolean
          has_temperature: boolean
          has_secretion: boolean
          photo_url: string | null
          checked_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          location: string
          description: string
          severity: string
          size?: string | null
          color?: string | null
          has_pain?: boolean
          has_temperature?: boolean
          has_secretion?: boolean
          photo_url?: string | null
          checked_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          location?: string
          description?: string
          severity?: string
          size?: string | null
          color?: string | null
          has_pain?: boolean
          has_temperature?: boolean
          has_secretion?: boolean
          photo_url?: string | null
          checked_at?: string
          created_at?: string
        }
      }
      foot_checks: {
        Row: {
          id: string
          user_id: string
          checked_at: string
          notes: string | null
          checklist_items: Json
          wound_found: boolean
          wound_report_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          checked_at: string
          notes?: string | null
          checklist_items?: Json
          wound_found?: boolean
          wound_report_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          checked_at?: string
          notes?: string | null
          checklist_items?: Json
          wound_found?: boolean
          wound_report_id?: string | null
          created_at?: string
        }
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          content: string
          mood: string | null
          glucose_level: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          content: string
          mood?: string | null
          glucose_level?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          content?: string
          mood?: string | null
          glucose_level?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          user_id: string
          doctor_name: string
          specialty: string | null
          date: string
          time: string
          location: string | null
          notes: string | null
          reminder_24h: boolean
          reminder_2h: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          doctor_name: string
          specialty?: string | null
          date: string
          time: string
          location?: string | null
          notes?: string | null
          reminder_24h?: boolean
          reminder_2h?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          doctor_name?: string
          specialty?: string | null
          date?: string
          time?: string
          location?: string | null
          notes?: string | null
          reminder_24h?: boolean
          reminder_2h?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      get_admin_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_users: number
          active_7_days: number
          active_30_days: number
          total_reminders: number
          total_logs: number
          total_wounds: number
          avg_adherence: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
