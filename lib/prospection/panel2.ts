import { getProspectionConfig } from './config'
import { maskPhone, normalizePhone } from './phone'

async function callPanel2(path: string, body: Record<string, unknown>) {
  const config = getProspectionConfig()
  const response = await fetch(`${config.panel2ApiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  return {
    ok: response.ok,
    status: response.status,
    payload,
  }
}

function panel2Code(result: { ok: boolean; payload: unknown }, fallback: string) {
  if (result.payload && typeof result.payload === 'object' && 'code' in result.payload) {
    const code = String((result.payload as { code?: unknown }).code || '').trim()
    if (code) return code
  }
  return fallback
}

function realFlowBlocked(phone: string) {
  const config = getProspectionConfig()
  if (config.dryRun || !config.enabled) return false
  return !config.realAllowedPhones.includes(phone)
}

function panel2TriggerDisabled() {
  return !getProspectionConfig().triggerPanel2Enabled
}

export async function triggerWelcome(input: { phone: string; name?: string | null; idempotencyKey: string }) {
  const config = getProspectionConfig()
  const phone = normalizePhone(input.phone)
  if (!phone) return { ok: false, code: 'INVALID_PHONE', phone: '' }
  if (panel2TriggerDisabled()) return { ok: false, code: 'PROSPECTION_PANEL2_TRIGGER_DISABLED', phone: maskPhone(phone) }
  if (realFlowBlocked(phone)) return { ok: false, code: 'PROSPECTION_BLOCKED_NOT_ALLOWLISTED', phone: maskPhone(phone) }
  try {
    const result = await callPanel2('/api/flows/welcome', {
      phone,
      customerPhone: phone,
      to: phone,
      recipient: phone,
      name: input.name || '',
      client: { name: input.name || '', phone },
      source: 'prospection',
      idempotencyKey: input.idempotencyKey,
      idempotency_key: input.idempotencyKey,
      dryRun: config.dryRun || !config.enabled,
    })
    return { ...result, code: panel2Code(result, 'WELCOME_TRIGGERED'), phone: maskPhone(phone) }
  } catch (error) {
    return { ok: false, code: 'WELCOME_TRIGGER_FAILED', phone: maskPhone(phone), error: error instanceof Error ? error.message : String(error) }
  }
}

export async function triggerInstall(input: { phone: string; name?: string | null; device: string; idempotencyKey: string }) {
  const config = getProspectionConfig()
  const phone = normalizePhone(input.phone)
  if (!phone) return { ok: false, code: 'INVALID_PHONE', phone: '' }
  if (panel2TriggerDisabled()) return { ok: false, code: 'PROSPECTION_PANEL2_TRIGGER_DISABLED', phone: maskPhone(phone) }
  if (realFlowBlocked(phone)) return { ok: false, code: 'PROSPECTION_BLOCKED_NOT_ALLOWLISTED', phone: maskPhone(phone) }
  try {
    const result = await callPanel2('/api/flows/install', {
      phone,
      customerPhone: phone,
      to: phone,
      recipient: phone,
      name: input.name || '',
      client: { name: input.name || '', phone },
      app: process.env.PROSPECTION_DEFAULT_INSTALL_APP || 'XCloud',
      device: input.device,
      source: 'prospection',
      idempotencyKey: input.idempotencyKey,
      idempotency_key: input.idempotencyKey,
      dryRun: config.dryRun || !config.enabled,
    })
    return { ...result, code: panel2Code(result, 'INSTALL_TRIGGERED'), phone: maskPhone(phone) }
  } catch (error) {
    return { ok: false, code: 'INSTALL_TRIGGER_FAILED', phone: maskPhone(phone), error: error instanceof Error ? error.message : String(error) }
  }
}
