import { useRef, useState, type ReactNode } from 'react'
import { Broom, Smiley, X } from '@phosphor-icons/react'
import '../globaliti-assistant.css'

export default function FloatingAssistant({
  children,
  onClearChat,
}: {
  children: ReactNode
  onClearChat?: () => void
}) {
  const [open, setOpen] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const close = () => {
    setOpen(false)
    launcher.current?.focus()
  }
  const toggle = () => {
    if (open) return close()
    setOpen(true)
    requestAnimationFrame(() => panel.current?.querySelector<HTMLInputElement>('input')?.focus())
  }
  return (
    <div className="assistant-widget" onKeyDown={(event) => {
      if (event.key === 'Escape' && open) { event.stopPropagation(); close() }
    }}>
      <div id="assistant-panel" className="assistant-panel" ref={panel} hidden={!open} role="dialog" aria-labelledby="assistant-title">
        <header className="assistant-panel-header">
          <div className="assistant-panel-brand">
            <div className="assistant-panel-avatar">
              <Smiley size={30} weight="duotone" aria-hidden="true" />
            </div>
            <div className="assistant-panel-titles">
              <h2 id="assistant-title">Asisten Globaliti</h2>
              <p>Data toko dan panduan, tanpa pindah halaman.</p>
            </div>
          </div>
          <div className="assistant-panel-header-actions">
            {onClearChat && (
              <button
                type="button"
                aria-label="Bersihkan percakapan"
                title="Bersihkan riwayat percakapan"
                onClick={onClearChat}
              >
                <Broom size={18} />
              </button>
            )}
            <button type="button" aria-label="Tutup asisten" onClick={close}><X size={18} weight="bold" /></button>
          </div>
        </header>
        {children}
        <p className="assistant-disclaimer">Periksa usulan perubahan sebelum menyetujuinya.</p>
      </div>
      <button ref={launcher} type="button" className="assistant-launcher" aria-label={open ? 'Tutup percakapan asisten' : 'Buka asisten Globaliti'} aria-expanded={open} aria-controls="assistant-panel" onClick={toggle}>
        {open ? <X size={26} aria-hidden="true" /> : <Smiley size={38} weight="duotone" aria-hidden="true" />}
      </button>
    </div>
  )
}
