import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Progress } from '../types'

const STORAGE_KEY = 'tka-math-progress'
export const CURRENT_PROGRESS_SCHEMA_VERSION = 3
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export type SyncState = 'local' | 'syncing' | 'synced' | 'offline'

export function readLocalProgress(fallback: Progress): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw) as Partial<Progress>
    if (saved.schemaVersion !== CURRENT_PROGRESS_SCHEMA_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      return fallback
    }
    return { ...fallback, ...saved, schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return fallback
  }
}

export function writeLocalProgress(progress: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...progress, schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION, lastSavedAt: new Date().toISOString() }))
}

export async function pullCloudProgress(userId: string): Promise<Progress | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('user_progress').select('progress').eq('user_id', userId).maybeSingle()
  if (error) throw error
  const cloudProgress = data?.progress as Partial<Progress> | undefined
  if (!cloudProgress || cloudProgress.schemaVersion !== CURRENT_PROGRESS_SCHEMA_VERSION) return null
  return cloudProgress as Progress
}

export async function pushCloudProgress(userId: string, progress: Progress) {
  if (!supabase) return
  const { error } = await supabase.from('user_progress').upsert({ user_id: userId, progress: { ...progress, lastSavedAt: new Date().toISOString() }, updated_at: new Date().toISOString() })
  if (error) throw error
}

export function hasCloudConfig() {
  return Boolean(supabase)
}
