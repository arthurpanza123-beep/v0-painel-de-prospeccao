export function normalizePhone(input: unknown): string {
  const digits = String(input || '').replace(/\D/g, '')
  if (!digits) return ''
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  if (withCountry.length < 12 || withCountry.length > 13) return ''
  if (!/^55\d{10,11}$/.test(withCountry)) return ''
  return withCountry
}

export function maskPhone(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length <= 6) return digits ? '***' : ''
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`
}

export function phoneToJid(phone: string) {
  return `${normalizePhone(phone)}@s.whatsapp.net`
}
