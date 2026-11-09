// Foto produk disimpan di localStorage sebagai data URL, jadi diperkecil dulu
// supaya satu foto kamera tidak menghabiskan kuota penyimpanan browser.
const MAX_SIDE = 400

export async function fileToProductImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Format gambar harus PNG, JPG, atau WebP')
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Gambar tidak dapat dibaca')
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/webp', 0.85)
}

// Hanya gambar bawaan (/products/...) atau foto unggahan hasil fileToProductImage yang dipakai;
// nilai lain (mis. dari berkas cadangan atau keluaran AI) tidak pernah dimuat sebagai gambar.
const SAFE_IMAGE = /^(\/products\/[\w.-]+|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$/

export function safeProductImage(value: unknown): string | undefined {
  return typeof value === 'string' && value.length < 700_000 && SAFE_IMAGE.test(value) ? value : undefined
}
