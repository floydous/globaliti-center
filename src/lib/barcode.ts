// Pembuat barcode EAN-13 tanpa dependensi, supaya label cetak bisa dipindai scanner kasir biasa.

const L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const G_CODES = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R_CODES = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']
// Pola L/G untuk enam digit kiri, ditentukan oleh digit pertama
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

export const EAN13_MODULES = 95

export const ean13CheckDigit = (first12: string) => {
  const sum = [...first12].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10
}

export const isValidEan13 = (code: string) =>
  /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12])

// Rangkaian 95 modul (1 = garis hitam) untuk kode EAN-13 yang valid.
export function ean13Modules(code: string): string {
  if (!isValidEan13(code)) throw new Error('Kode EAN-13 tidak valid')
  const parity = PARITY[Number(code[0])]
  let bits = '101'
  for (let i = 0; i < 6; i++) {
    const digit = Number(code[i + 1])
    bits += parity[i] === 'L' ? L_CODES[digit] : G_CODES[digit]
  }
  bits += '01010'
  for (let i = 7; i < 13; i++) bits += R_CODES[Number(code[i])]
  return bits + '101'
}

// Awalan 2 (20-29) dicadangkan standar EAN untuk pemakaian internal toko, sehingga kode buatan
// tidak bentrok dengan barcode produk pabrik.
export function generateEan13(existing: Set<string>): string {
  for (;;) {
    const random = crypto.getRandomValues(new Uint32Array(2))
    const body = `2${String(random[0]).padStart(10, '0').slice(-6)}${String(random[1]).padStart(10, '0').slice(-5)}`
    const code = `${body}${ean13CheckDigit(body)}`
    if (!existing.has(code)) return code
  }
}
