// Kunci API Groq disimpan sebagai file di mesin ini lewat endpoint lokal,
// bukan di localStorage browser. Browser hanya pernah melihat status terkonfigurasi
// dan bentuk tersamar (masked) dari kunci tersebut.
import { apiHeaders } from './apiAuth'

export type GroqKeyStatus = {
  configured: boolean
  masked: string
  // Pesan bila server menolak (token salah, host tidak diizinkan, dst.)
  error?: string
}

export async function fetchGroqKeyStatus(): Promise<GroqKeyStatus> {
  try {
    const res = await fetch('/api/groq-key', { headers: apiHeaders() })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { configured: false, masked: '', error: res.status === 404 ? undefined : data.message }
    }
    const data = await res.json()
    return { configured: Boolean(data.configured), masked: String(data.masked || '') }
  } catch {
    return { configured: false, masked: '' }
  }
}

export async function saveGroqKey(key: string): Promise<{ ok: boolean; message?: string; masked?: string }> {
  try {
    const res = await fetch('/api/groq-key', {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ key: key.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, message: data.message || 'Gagal menyimpan kunci API Groq' }
    return { ok: true, masked: String(data.masked || '') }
  } catch {
    return { ok: false, message: 'Server lokal tidak dapat diakses, kunci tidak tersimpan' }
  }
}

export async function testGroqKey(key: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/api/groq/test', {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ key: key.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.ok) return { ok: true, message: `Berhasil terhubung ke Groq! Model aktif: ${data.model}` }
    return { ok: false, message: data.message || 'Gagal terhubung ke Groq' }
  } catch {
    return { ok: false, message: 'Server lokal tidak dapat diakses' }
  }
}
