import { getProspectionConfig } from './config'
import { maskPhone, normalizePhone } from './phone'
import QRCode from 'qrcode'

function headers(apiKey: string) {
  return {
    apikey: apiKey,
    'Content-Type': 'application/json',
  }
}

function parseJson(text: string) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
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
    const data = parseJson(text)
    return {
      ok: response.ok,
      configured: true,
      status: response.status,
      data,
      code: response.ok ? 'OK' : response.status === 401 || response.status === 403 ? 'EVOLUTION_UNAUTHORIZED' : response.status === 404 ? 'EVOLUTION_INSTANCE_MISSING' : 'EVOLUTION_HTTP_ERROR',
    }
  } catch (error) {
    return { ok: false, configured: true, status: 0, data: null, code: 'EVOLUTION_REQUEST_FAILED', error: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timeout)
  }
}

function extractInstances(data: unknown) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data === 'object') {
    const root = data as Record<string, unknown>
    if (Array.isArray(root.response)) return root.response
    if (Array.isArray(root.instances)) return root.instances
    if (root.instance && typeof root.instance === 'object') return [root]
  }
  return []
}

function instanceName(item: unknown) {
  const root = item && typeof item === 'object' ? item as Record<string, unknown> : {}
  const instance = root.instance && typeof root.instance === 'object' ? root.instance as Record<string, unknown> : root
  return String(instance.instanceName || instance.name || '').trim()
}

function pickTextQrCode(data: unknown) {
  const root = data && typeof data === 'object' ? data as Record<string, unknown> : {}
  return String(root.code || root.pairingCode || (root.instance as Record<string, unknown> | undefined)?.code || '').trim()
}

async function pickQr(data: unknown) {
  const root = data && typeof data === 'object' ? data as Record<string, unknown> : {}
  const instance = root.instance && typeof root.instance === 'object' ? root.instance as Record<string, unknown> : {}
  const imageValue = String(root.base64 || root.qrcode || root.qr || instance.qrcode || '')
  if (imageValue) {
    const qrCode = imageValue.startsWith('data:image') ? imageValue : `data:image/png;base64,${imageValue.replace(/^data:image\/png;base64,/, '')}`
    return {
      qrCode,
      source: imageValue.startsWith('data:image') ? 'evolution_data_url' : 'evolution_base64',
      length: qrCode.length,
    }
  }
  const textCode = pickTextQrCode(data)
  if (!textCode) return { qrCode: null, source: 'missing', length: 0 }
  const qrCode = await QRCode.toDataURL(textCode, {
    type: 'image/png',
    width: 720,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  })
  return { qrCode, source: 'generated_from_code', length: qrCode.length }
}

async function findProspectionInstance() {
  const config = getProspectionConfig()
  const result = await evolutionFetch('/instance/fetchInstances')
  if (!result.ok) return null
  return extractInstances(result.data).find((item) => instanceName(item) === config.evolutionInstance) || null
}

function instanceDetails(item: unknown) {
  const root = item && typeof item === 'object' ? item as Record<string, unknown> : {}
  const number = String(root.number || root.ownerJid || '').replace(/\D/g, '')
  return {
    number: number || null,
    profileName: root.profileName ? String(root.profileName) : null,
    connectionStatus: root.connectionStatus ? String(root.connectionStatus) : null,
  }
}

async function configureProspectionWebhook() {
  const config = getProspectionConfig()
  return evolutionFetch(`/webhook/set/${encodeURIComponent(config.evolutionInstance)}`, {
    method: 'POST',
    body: JSON.stringify({
      enabled: true,
      url: `${config.prospectionPublicUrl}/api/prospection/webhook`,
      webhookByEvents: true,
      webhookBase64: true,
      events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    }),
  })
}

async function ensureProspectionInstance() {
  const config = getProspectionConfig()
  const fetchResult = await evolutionFetch('/instance/fetchInstances')
  if (!fetchResult.ok) return fetchResult
  const instances = extractInstances(fetchResult.data)
  const existing = instances.find((item) => instanceName(item) === config.evolutionInstance)
  if (existing) {
    return { ok: true, configured: true, created: false, status: 200, code: 'INSTANCE_EXISTS', data: existing }
  }
  const createResult = await evolutionFetch('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: config.evolutionInstance,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      rejectCall: true,
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: true,
      readStatus: true,
      syncFullHistory: false,
      webhook: {
        enabled: true,
        url: `${config.prospectionPublicUrl}/api/prospection/webhook`,
        webhookByEvents: true,
        webhookBase64: true,
        events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      },
    }),
  })
  if (!createResult.ok) return createResult
  return { ...createResult, created: true }
}

export async function getWhatsappStatus() {
  const config = getProspectionConfig()
  const [result, foundInstance] = await Promise.all([
    evolutionFetch(`/instance/connectionState/${encodeURIComponent(config.evolutionInstance)}`),
    findProspectionInstance(),
  ])
  const stateData = result.data && typeof result.data === 'object' ? result.data as Record<string, unknown> : {}
  const state = String(stateData.state || (stateData.instance as Record<string, unknown> | undefined)?.state || '').toLowerCase()
  const connected = ['open', 'connected', 'online'].includes(state)
  const missing = result.status === 404 || result.code === 'EVOLUTION_INSTANCE_MISSING'
  const details = foundInstance ? instanceDetails(foundInstance) : { number: null, profileName: null, connectionStatus: null }
  return {
    ok: result.ok || missing,
    configured: result.configured,
    instance: config.evolutionInstance,
    status: missing ? 'missing' : connected ? 'connected' : state ? 'disconnected' : 'unknown',
    state,
    code: missing ? 'EVOLUTION_INSTANCE_MISSING' : result.code,
    message: missing ? 'Instancia de prospecção ainda nao foi criada na Evolution.' : undefined,
    number: details.number,
    profileName: details.profileName,
    connectionStatus: details.connectionStatus,
  }
}

export async function requestWhatsappQr() {
  const config = getProspectionConfig()
  const ensured = await ensureProspectionInstance()
  if (!ensured.ok) {
    return {
      ok: false,
      configured: ensured.configured,
      instance: config.evolutionInstance,
      qrCode: null,
      code: ensured.code || 'EVOLUTION_HTTP_ERROR',
      message: 'Falha ao preparar a instância de prospecção na Evolution.',
      status: ensured.status,
    }
  }
  await configureProspectionWebhook().catch(() => null)
  const result = await evolutionFetch(`/instance/connect/${encodeURIComponent(config.evolutionInstance)}`, { method: 'GET' })
  if (!result.ok && result.status === 404) {
    return {
      ok: false,
      configured: result.configured,
      instance: config.evolutionInstance,
      qrCode: null,
      code: 'EVOLUTION_INSTANCE_MISSING',
      message: 'Instancia de prospecção nao encontrada na Evolution.',
    }
  }
  const qr = await pickQr(result.data)
  const root = result.data && typeof result.data === 'object' ? result.data as Record<string, unknown> : {}
  return {
    ok: result.ok,
    configured: result.configured,
    instance: config.evolutionInstance,
    qrCode: qr.qrCode,
    qrSource: qr.source,
    qrLength: qr.length,
    qrUpdatedAt: new Date().toISOString(),
    qrExpiresInSeconds: typeof root.count === 'number' ? root.count : null,
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
