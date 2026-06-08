import { getProspectionConfig } from './config'
import { maskPhone, normalizePhone } from './phone'

function headers(apiKey: string) {
  return {
    apikey: apiKey,
    'Content-Type': 'application/json',
  }
}

async function evolutionFetch(path: string, init?: RequestInit) {
  const config = getProspectionConfig()
  if (!config.evolutionApiUrl || !config.evolutionApiKey) {
    return { ok: false, configured: false, status: 0, data: null, code: 'EVOLUTION_NOT_CONFIGURED' }
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.evolutionTimeoutMs)
  try {
    const response = await fetch(`${config.evolutionApiUrl}${path}`, {
      ...init,
      headers: { ...headers(config.evolutionApiKey), ...(init?.headers || {}) },
      signal: controller.signal,
    })
    const text = await response.text().catch(() => '')
    const data = text ? JSON.parse(text) : null
    return { ok: response.ok, configured: true, status: response.status, data, code: response.ok ? 'OK' : 'EVOLUTION_HTTP_ERROR' }
  } catch (error) {
    return { ok: false, configured: true, status: 0, data: null, code: 'EVOLUTION_REQUEST_FAILED', error: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timeout)
  }
}

function pickQr(data: unknown) {
  const root = data && typeof data === 'object' ? data as Record<string, unknown> : {}
  const base64 = String(root.base64 || root.qrcode || root.qr || root.code || (root.instance as Record<string, unknown> | undefined)?.qrcode || '')
  if (!base64) return null
  return base64.startsWith('data:image') ? base64 : `data:image/png;base64,${base64.replace(/^data:image\/png;base64,/, '')}`
}

export async function getWhatsappStatus() {
  const config = getProspectionConfig()
  const result = await evolutionFetch(`/instance/connectionState/${encodeURIComponent(config.evolutionInstance)}`)
  const stateData = result.data && typeof result.data === 'object' ? result.data as Record<string, unknown> : {}
  const state = String(stateData.state || (stateData.instance as Record<string, unknown> | undefined)?.state || '').toLowerCase()
  const connected = ['open', 'connected', 'online'].includes(state)
  return {
    ok: result.ok,
    configured: result.configured,
    instance: config.evolutionInstance,
    status: connected ? 'connected' : state ? 'disconnected' : 'unknown',
    state,
    code: result.code,
  }
}

export async function requestWhatsappQr() {
  const config = getProspectionConfig()
  const result = await evolutionFetch(`/instance/connect/${encodeURIComponent(config.evolutionInstance)}`, { method: 'GET' })
  return {
    ok: result.ok,
    configured: result.configured,
    instance: config.evolutionInstance,
    qrCode: pickQr(result.data),
    code: result.code,
  }
}

export async function disconnectWhatsapp() {
  const config = getProspectionConfig()
  const result = await evolutionFetch(`/instance/logout/${encodeURIComponent(config.evolutionInstance)}`, { method: 'DELETE' })
  return {
    ok: result.ok,
    configured: result.configured,
    instance: config.evolutionInstance,
    code: result.code,
  }
}

export async function sendProspectionText(input: { phone: string; message: string }) {
  const config = getProspectionConfig()
  const phone = normalizePhone(input.phone)
  if (!phone) return { ok: false, code: 'INVALID_PHONE', message: 'Telefone invalido.' }

  if (config.dryRun || !config.enabled) {
    return { ok: true, dryRun: true, code: 'PROSPECTION_DRY_RUN', message: 'Dry-run: envio real bloqueado.', phone: maskPhone(phone) }
  }

  if (!config.realAllowedPhones.includes(phone)) {
    return { ok: false, dryRun: false, code: 'REAL_SEND_NOT_ALLOWED', message: 'Envio real bloqueado fora da allowlist.', phone: maskPhone(phone) }
  }

  const result = await evolutionFetch(`/message/sendText/${encodeURIComponent(config.evolutionInstance)}`, {
    method: 'POST',
    body: JSON.stringify({
      number: phone,
      text: input.message,
      options: { delay: 0, presence: 'composing' },
    }),
  })
  if (!result.ok) return { ok: false, code: result.code, message: 'Falha no envio Evolution.', phone: maskPhone(phone) }
  const data = result.data && typeof result.data === 'object' ? result.data as Record<string, unknown> : {}
  return { ok: true, dryRun: false, code: 'SENT', phone: maskPhone(phone), evolutionMessageId: String(data.key || data.id || data.messageId || '') }
}
