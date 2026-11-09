// Token akses server (GLOBALITI_API_TOKEN) disimpan di perangkat ini dan dikirim bersama
// setiap permintaan ke /api/groq*. Kosong bila server tidak memintanya.
const TOKEN_KEY = 'globaliti_api_token'

export function getApiToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setApiToken(token: string) {
  const clean = token.trim()
  if (clean) localStorage.setItem(TOKEN_KEY, clean)
  else localStorage.removeItem(TOKEN_KEY)
}

export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getApiToken()
  return token ? { ...extra, 'x-globaliti-token': token } : extra
}
