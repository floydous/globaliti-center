import type { BusinessProfile } from '../lib/business'

// Kop surat resmi: dipakai bersama oleh laporan keuangan dan dokumen penjualan harian.
export default function FormalKop({ profile }: { profile: BusinessProfile }) {
  const contact = [
    profile.phone && `Telepon: ${profile.phone}`,
    profile.email && `Pos-el: ${profile.email}`,
    profile.website && `Laman: ${profile.website}`,
  ].filter(Boolean).join(' | ')

  return (
    <>
      <header className="formal-kop">
        <div className="formal-kop-logo">
          <img
            src="/globaliti-creative-center-icon.png"
            alt="Logo Globaliti Creative Center"
            width={66}
            height={66}
            className="formal-kop-logo-img"
          />
        </div>
        <div className="formal-kop-body">
          <div className="formal-kop-org">{profile.foundationName.toUpperCase()}</div>
          <h1 className="formal-kop-school">{profile.schoolName.toUpperCase()}</h1>
          <div className="formal-kop-unit">UNIT USAHA KREATIF: {profile.unitName.toUpperCase()}</div>
          {profile.address && <p className="formal-kop-address">{profile.address}</p>}
          {contact && <p className="formal-kop-contact">{contact}</p>}
        </div>
        <div className="formal-kop-spacer" aria-hidden="true" />
      </header>

      {/* Garis ganda pemisah kop surat */}
      <div className="formal-kop-separator" aria-hidden="true">
        <div className="kop-line-thick" />
        <div className="kop-line-thin" />
      </div>
    </>
  )
}
