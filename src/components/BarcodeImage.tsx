import { ean13Modules } from '../lib/barcode'

const QUIET = 9
const BAR_HEIGHT = 56
const TEXT_Y = BAR_HEIGHT + 10

// Gambar EAN-13 sebagai SVG vektor: tetap tajam saat dicetak dan tidak memerlukan berkas gambar.
export default function BarcodeImage({ code, className }: { code: string; className?: string }) {
  const modules = ean13Modules(code)
  const bars: string[] = []
  for (let x = 0; x < modules.length; ) {
    if (modules[x] !== '1') {
      x++
      continue
    }
    let end = x
    while (modules[end] === '1') end++
    bars.push(`M${QUIET + x} 0h${end - x}v${BAR_HEIGHT}h-${end - x}z`)
    x = end
  }
  const leftStart = QUIET + 3
  const rightStart = QUIET + 3 + 42 + 5
  return (
    <svg
      className={className}
      viewBox={`0 0 ${modules.length + QUIET * 2} ${BAR_HEIGHT + 14}`}
      role="img"
      aria-label={`Barcode ${code}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      <path d={bars.join('')} fill="#000000" />
      <g fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="#000000" textAnchor="middle">
        <text x={QUIET / 2} y={TEXT_Y}>{code[0]}</text>
        {[...code.slice(1, 7)].map((digit, index) => <text key={`l${index}`} x={leftStart + index * 7 + 3.5} y={TEXT_Y}>{digit}</text>)}
        {[...code.slice(7)].map((digit, index) => <text key={`r${index}`} x={rightStart + index * 7 + 3.5} y={TEXT_Y}>{digit}</text>)}
      </g>
    </svg>
  )
}
