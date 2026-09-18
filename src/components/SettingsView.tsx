import { useState } from 'react'
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onChangeOperator(operator)
    onSaveGroqKey(apiKey)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
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
