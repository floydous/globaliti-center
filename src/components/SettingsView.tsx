import { useEffect, useState } from 'react'
import {
  Check,
  CheckCircle,
  Key,
  ShieldCheck,
  User,
} from '@phosphor-icons/react'

type SettingsViewProps = {
  onExportBackup: () => void
  activeOperator: string
  onChangeOperator: (operator: string) => void
  groqKey: string
  onSaveGroqKey: (key: string) => void
}

export default function SettingsView({
  onExportBackup,
  activeOperator,
  onChangeOperator,
  groqKey,
  onSaveGroqKey,
}: SettingsViewProps) {
  const [operator, setOperator] = useState(activeOperator)
  const [apiKey, setApiKey] = useState(groqKey)
  const [savedNotice, setSavedNotice] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    setApiKey(groqKey)
  }, [groqKey])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanKey = apiKey.trim()
    onChangeOperator(operator)
    onSaveGroqKey(cleanKey)
    setApiKey(cleanKey)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  const handleTestGroq = async () => {
    const key = apiKey.trim()
    if (!key) {
      setTestResult({ ok: false, message: 'Harap masukkan kunci API terlebih dahulu.' })
      return
    }
    setTestingKey(true)
    setTestResult(null)

    const testModels = [
      'qwen/qwen3.8-27b',
      'groq/compound-mini',
      'groq/compound',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'allam-2-7b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ]

    let successModel = ''
    let lastErr = ''

    for (const m of testModels) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: 'tes koneksi' }],
            max_tokens: 5,
          }),
        })
        if (res.ok) {
          successModel = m
          break
        } else {
          const data = await res.json().catch(() => null)
          lastErr = data?.error?.message || `HTTP ${res.status}`
        }
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'Koneksi jaringan gagal'
      }
    }

    setTestingKey(false)
    if (successModel) {
      setTestResult({ ok: true, message: `Berhasil terhubung ke Groq! Model aktif: ${successModel}` })
      onSaveGroqKey(key)
    } else {
      setTestResult({ ok: false, message: `Gagal terhubung ke Groq: ${lastErr}` })
    }
  }

  return (
    <section className="settings-page">
      <div className="settings-header">
        <div>
          <h2>Pengaturan Sistem</h2>
          <p className="settings-sub">
            Konfigurasi kasir aktif, perangkat cetak, dan integrasi kecerdasan buatan
          </p>
        </div>
      </div>

      <section className="settings-card"><h3>Cadangan data</h3><p>Data disimpan pada browser dan perangkat ini saja. Unduh cadangan setiap selesai bertugas. Berkas tidak memuat kunci API. Pemulihan saat ini membutuhkan bantuan pengelola teknis.</p><button className="secondary-button" onClick={onExportBackup}>Unduh Cadangan</button></section>
      <form className="settings-form" onSubmit={handleSave}>
        {/* Seksi 1: Hak Akses & Operator */}
        <div className="settings-card">
          <div className="settings-card-head">
            <div className="settings-card-icon">
              <User size={20} />
            </div>
            <div>
              <h3>Operator Kasir Aktif</h3>
              <p>Pilih akun pengelola yang bertugas saat ini</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="operator-options">
              <label
                className={`operator-chip ${
                  operator === 'Pengelola 1' ? 'active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="operator"
                  value="Pengelola 1"
                  checked={operator === 'Pengelola 1'}
                  onChange={(e) => setOperator(e.target.value)}
                />
                <div>
                  <strong>Pengelola 1</strong>
                  <span>Kasir Utama</span>
                </div>
              </label>

              <label
                className={`operator-chip ${
                  operator === 'Pengelola 2' ? 'active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="operator"
                  value="Pengelola 2"
                  checked={operator === 'Pengelola 2'}
                  onChange={(e) => setOperator(e.target.value)}
                />
                <div>
                  <strong>Pengelola 2</strong>
                  <span>Kasir Pendamping</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Seksi 2: Integrasi AI Groq */}
        <div className="settings-card">
          <div className="settings-card-head">
            <div className="settings-card-icon">
              <Key size={20} />
            </div>
            <div>
              <h3>Kunci API Groq (Opsional)</h3>
              <p>
                Gunakan Groq API untuk model Llama berkecepatan tinggi, atau biarkan kosong untuk engine lokal bawaan
              </p>
            </div>
          </div>
          <div className="settings-card-body">
            <label className="field full">
              <span>Groq API Key</span>
              <input
                type="password"
                placeholder="gsk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <small>
                Kunci disimpan di browser ini. Saat memakai AI, kunci, percakapan, dan ringkasan data toko dikirim ke Groq. Gunakan hanya pada perangkat tepercaya.
              </small>
            </label>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={handleTestGroq}
                disabled={testingKey || !apiKey.trim()}
              >
                {testingKey ? 'Menguji Koneksi...' : 'Uji Koneksi Groq API'}
              </button>
              {testResult && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: testResult.ok ? '#15803d' : '#b91c1c',
                    background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${testResult.ok ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  {testResult.ok ? '✓ ' : '✕ '}
                  {testResult.message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Seksi 3: Informasi Toko Sekolah */}
        <div className="settings-card">
          <div className="settings-card-head">
            <div className="settings-card-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3>Informasi Unit Usaha</h3>
              <p>Data identitas toko sekolah</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-info-grid">
              <div>
                <span>Nama Unit:</span>
                <strong>Globaliti Creative Center</strong>
              </div>
              <div>
                <span>Instansi:</span>
                <strong>SMKS TI Bali Global Denpasar</strong>
              </div>
              <div>
                <span>Mode Database:</span>
                <strong>Lokal Terisolasi</strong>
              </div>
              <div>
                <span>Standar Pembukuan:</span>
                <strong>SAK EMKM IAI</strong>
              </div>
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
