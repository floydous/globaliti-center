import { useEffect, useState } from 'react'
import {
  Check,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import { fetchGroqKeyStatus, saveGroqKey, testGroqKey } from '../lib/groqKey'
import { getApiToken, setApiToken } from '../lib/apiAuth'
import { normalizeProfile, type BusinessProfile } from '../lib/business'

type SettingsViewProps = {
  onExportBackup: () => void
  onGroqKeySaved: (configured: boolean) => void
  profile: BusinessProfile
  onProfileSaved: (profile: BusinessProfile) => void
}

type ProfileDraft = Record<keyof BusinessProfile, string>

const toDraft = (profile: BusinessProfile): ProfileDraft =>
  Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, String(value)])) as ProfileDraft

const PROFILE_FIELDS: { key: keyof BusinessProfile; label: string; type?: 'number' }[] = [
  { key: 'unitName', label: 'Nama unit usaha' },
  { key: 'openingCash', label: 'Modal kas awal (Rp)', type: 'number' },
]

export default function SettingsView({ onExportBackup, onGroqKeySaved, profile, onProfileSaved }: SettingsViewProps) {
  const [apiKey, setApiKey] = useState('')
  const [maskedKey, setMaskedKey] = useState('')
  const [serverNotice, setServerNotice] = useState('')
  const [accessToken, setAccessToken] = useState(getApiToken)
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile))
  const [savedNotice, setSavedNotice] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchGroqKeyStatus().then((status) => {
      setMaskedKey(status.masked)
      setServerNotice(status.error ?? '')
    })
  }, [])

  const handleTestGroq = async () => {
    const key = apiKey.trim()
    if (!key) {
      setTestResult({ ok: false, message: 'Harap masukkan kunci API terlebih dahulu.' })
      return
    }
    setTestingKey(true)
    setTestResult(null)

    // Token yang baru diketik dipakai untuk uji ini walau belum disimpan
    setApiToken(accessToken)
    const result = await testGroqKey(key)
    setTestingKey(false)
    setTestResult(result)

    if (result.ok) {
      const saved = await saveGroqKey(key)
      if (saved.ok) {
        setMaskedKey(saved.masked || '')
        onGroqKeySaved(true)
      }
      setApiKey('')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestResult(null)

    setApiToken(accessToken)
    onProfileSaved(normalizeProfile(draft))
    setDraft(toDraft(normalizeProfile(draft)))

    const cleanKey = apiKey.trim()
    if (cleanKey) {
      const saved = await saveGroqKey(cleanKey)
      if (!saved.ok) {
        setTestResult({ ok: false, message: saved.message || 'Gagal menyimpan kunci API Groq' })
        return
      }
      setMaskedKey(saved.masked || '')
      setApiKey('')
      onGroqKeySaved(true)
    }
    const status = await fetchGroqKeyStatus()
    setServerNotice(status.error ?? '')
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  const handleRemoveKey = async () => {
    const saved = await saveGroqKey('')
    if (!saved.ok) {
      setTestResult({ ok: false, message: saved.message || 'Gagal menghapus kunci API Groq' })
      return
    }
    setMaskedKey('')
    setApiKey('')
    onGroqKeySaved(false)
    setTestResult({ ok: false, message: 'Kunci API Groq dihapus. Asisten AI dinonaktifkan.' })
  }

  return (
    <section className="settings-page">
      <div className="settings-header">
        <div>
          <h2>Pengaturan Sistem</h2>
          <p className="settings-sub">
            Identitas unit usaha, cadangan data, dan integrasi kecerdasan buatan untuk toko
          </p>
        </div>
      </div>

      <section className="settings-card"><h3>Cadangan data</h3><p>Data disimpan pada browser dan perangkat ini saja. Unduh cadangan setiap selesai bertugas. Berkas tidak memuat kunci API. Pemulihan saat ini membutuhkan bantuan pengelola teknis.</p><button className="secondary-button" onClick={onExportBackup}>Unduh Cadangan</button></section>

      <form className="settings-form" onSubmit={handleSave}>
        {/* Integrasi AI Groq */}
        <div className="settings-card">
          <div className="settings-card-head">
            <div>
              <h3>Kunci API Groq</h3>
              <p>
                Asisten AI toko memakai Groq. Tanpa kunci yang tersimpan, asisten dimatikan.
              </p>
            </div>
          </div>
          <div className="settings-card-body">
            <label className="field full">
              <span>Groq API Key</span>
              <input
                type="password"
                placeholder={maskedKey ? `Tersimpan: ${maskedKey}` : 'gsk_...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
              <small>
                Kunci disimpan sebagai file lokal di server aplikasi, bukan di browser. Saat memakai asisten, kunci, percakapan, dan ringkasan data toko dikirim ke Groq. Gunakan hanya pada perangkat tepercaya.
              </small>
            </label>
            <label className="field full">
              <span>Token akses server (opsional)</span>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                autoComplete="off"
                placeholder="Isi bila server memakai GLOBALITI_API_TOKEN"
              />
              <small>
                Diperlukan bila aplikasi diakses dari alamat publik atau jaringan toko. Token disimpan di perangkat ini.
              </small>
            </label>
            {serverNotice && <p className="settings-warning" role="alert">{serverNotice}</p>}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={handleTestGroq}
                disabled={testingKey || !apiKey.trim()}
              >
                {testingKey ? 'Menguji Koneksi...' : 'Uji Koneksi Groq API'}
              </button>
              {maskedKey && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleRemoveKey}
                >
                  Hapus Kunci
                </button>
              )}
              {testResult && (
                <span className={`status-pill ${testResult.ok ? 'live' : 'paused'}`}>
                  {testResult.ok ? <CheckCircle size={13} /> : <WarningCircle size={13} />}
                  {testResult.message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Identitas unit usaha dan parameter laporan */}
        <div className="settings-card">
          <div className="settings-card-head">
            <div>
              <h3>Informasi Unit Usaha</h3>
              <p>Dipakai pada kop dan isi laporan keuangan, serta perhitungan kas.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="profile-grid">
              {PROFILE_FIELDS.map((field) => (
                <label key={field.key} className="field">
                  <span>{field.label}</span>
                  <input
                    name={field.key}
                    type={field.type === 'number' ? 'number' : 'text'}
                    min={field.type === 'number' ? 0 : undefined}
                    value={draft[field.key]}
                    onChange={(e) => setDraft((current) => ({ ...current, [field.key]: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          {savedNotice && (
            <span className="save-toast">
              <CheckCircle size={16} /> Pengaturan berhasil disimpan
            </span>
          )}
          <button type="submit" className="primary-action">
            <Check size={16} weight="bold" /> Simpan Pengaturan
          </button>
        </div>
      </form>
    </section>
  )
}
