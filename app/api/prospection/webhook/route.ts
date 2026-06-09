import { NextResponse } from 'next/server'
import { classifyInbound, detectDevice } from '@/lib/prospection/classifier'
import { getProspectionConfig } from '@/lib/prospection/config'
import { sendProspectionText } from '@/lib/prospection/evolution'
import { normalizePhone } from '@/lib/prospection/phone'
import { triggerInstall, triggerWelcome } from '@/lib/prospection/panel2'
import { recordFlowResult, recordInbound, recordOutboundReply, recordProspectionEvent } from '@/lib/prospection/store'

type FlowAction = {
  type?: unknown
  code?: unknown
  phone?: unknown
  name?: unknown
  device?: unknown
  body?: unknown
  idempotencyKey?: unknown
  leadId?: unknown
  campaignId?: unknown
  instanceName?: unknown
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function payloadParts(payload: Record<string, unknown>) {
  const data = objectValue(payload.data)
  const source = Object.keys(data).length ? data : payload
  const dataKey = objectValue(data.key)
  const rootKey = objectValue(payload.key)
  const key = Object.keys(dataKey).length ? dataKey : rootKey
  return { data: source, key }
}

function pickText(payload: Record<string, unknown>) {
  const { data } = payloadParts(payload)
  const message = objectValue(data.message)
  return String(
    message.conversation ||
    (message.extendedTextMessage as Record<string, unknown> | undefined)?.text ||
    data.text ||
    data.messageText ||
    payload.text ||
    ''
  ).trim()
}

function pickRemoteJid(payload: Record<string, unknown>) {
  const { data, key } = payloadParts(payload)
  return String(key.remoteJid || data.remoteJid || data.from || payload.remoteJid || payload.from || '').trim()
}

function pickTargetPhone(payload: Record<string, unknown>) {
  const remoteJid = pickRemoteJid(payload)
  return normalizePhone(remoteJid.split('@')[0])
}

function fromMe(payload: Record<string, unknown>) {
  const { data, key } = payloadParts(payload)
  return Boolean(key.fromMe || data.fromMe)
}

function pickMessageId(payload: Record<string, unknown>) {
  const { data, key } = payloadParts(payload)
  return String(key.id || data.messageId || data.id || payload.messageId || '').trim() || null
}

function pickInstanceName(payload: Record<string, unknown>) {
  const { data } = payloadParts(payload)
  const config = getProspectionConfig()
  return String(data.instance || data.instanceName || payload.instance || payload.instanceName || config.evolutionInstance || 'unknown').trim()
}

async function runReservedAction(action: FlowAction, context: { remoteJid?: string; messageId?: string | null; fromMe?: boolean; connectedInstancePhone?: string | null }) {
  const config = getProspectionConfig()
  const type = String(action.type || '')
  const phone = normalizePhone(action.phone)
  const idempotencyKey = String(action.idempotencyKey || '')
  const leadId = action.leadId ? String(action.leadId) : null
  const campaignId = action.campaignId ? String(action.campaignId) : null
  const instanceName = action.instanceName ? String(action.instanceName) : null
  if (!phone) return
  if (type === 'reply') {
    const body = String(action.body || '').trim()
    if (!body) return
    const result = await sendProspectionText({ phone, message: body, allowCampaignRecipient: true })
    await recordOutboundReply({
      phone,
      body,
      leadId,
      campaignId,
      status: result.ok && 'dryRun' in result && result.dryRun ? 'dry_run' : result.ok ? 'sent' : 'failed',
      evolutionMessageId: 'evolutionMessageId' in result ? result.evolutionMessageId : null,
      error: result.ok ? null : String(result.code || 'REPLY_SEND_FAILED'),
      eventType: String(action.code || 'PROSPECTION_REPLY_SENT'),
    })
    console.log(`[PROSPECTION_REPLY_TRIGGERED] ${JSON.stringify({ phone, ok: result.ok, code: result.code, action: action.code })}`)
    return
  }
  if (!idempotencyKey) return
  const basePayload = {
    source: 'prospection',
    phone,
    customerPhone: phone,
    to: phone,
    recipient: phone,
    name: String(action.name || ''),
    idempotencyKey,
    dryRun: config.dryRun || !config.enabled,
  }
  await recordProspectionEvent({
    eventType: 'PROSPECTION_PANEL2_CALL_PREPARED',
    message: 'Payload para Painel 2 preparado.',
    phone,
    instanceName,
    messageId: context.messageId || null,
    metadata: {
      source: 'prospection',
      flow: type,
      targetPhone: phone,
      leadPhone: phone,
      connectedInstancePhone: context.connectedInstancePhone || null,
      remoteJid: context.remoteJid || null,
      fromMe: Boolean(context.fromMe),
      panel2Payload: type === 'install' ? { ...basePayload, device: String(action.device || '') } : basePayload,
      idempotencyKey,
    },
  })
  if (type === 'welcome') {
    const result = await triggerWelcome({ phone, name: String(action.name || ''), idempotencyKey })
    await recordFlowResult({ flow: 'welcome', phone, leadId, campaignId, ok: Boolean(result.ok), code: String(result.code || ''), metadata: { status: (result as { status?: number }).status || null, idempotencyKey, instanceName } })
    console.log(`[PROSPECTION_WELCOME_TRIGGERED] ${JSON.stringify({ phone, ok: result.ok, status: (result as { status?: number }).status, code: result.code })}`)
  } else if (type === 'install') {
    const device = String(action.device || '')
    const result = await triggerInstall({ phone, name: String(action.name || ''), device, idempotencyKey })
    await recordFlowResult({ flow: 'install', phone, leadId, campaignId, device, ok: Boolean(result.ok), code: String(result.code || ''), metadata: { status: (result as { status?: number }).status || null, idempotencyKey, instanceName } })
    console.log(`[PROSPECTION_INSTALL_TRIGGERED] ${JSON.stringify({ phone, ok: result.ok, status: (result as { status?: number }).status, code: result.code, device })}`)
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!payload) return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 })
  const instanceName = pickInstanceName(payload)
  const messageId = pickMessageId(payload)
  const phone = pickTargetPhone(payload)
  if (fromMe(payload)) {
    await recordProspectionEvent({ eventType: 'PROSPECTION_IGNORED_FROM_ME', message: 'Mensagem enviada pela propria instancia ignorada.', phone, instanceName, messageId })
    return NextResponse.json({ ok: true, code: 'PROSPECTION_IGNORED_FROM_ME' })
  }
  if (!phone) {
    await recordProspectionEvent({ eventType: 'PROSPECTION_BLOCKED_MISSING_TARGET', message: 'Inbound sem remoteJid/from valido para roteamento.', instanceName, messageId, metadata: { remoteJid: pickRemoteJid(payload) || null } })
    return NextResponse.json({ ok: true, code: 'PROSPECTION_BLOCKED_MISSING_TARGET' })
  }
  const config = getProspectionConfig()
  const connectedPhone = normalizePhone(config.connectedInstancePhone)
  if (connectedPhone && phone === connectedPhone) {
    await recordProspectionEvent({ eventType: 'PROSPECTION_BLOCKED_SELF_TARGET', message: 'Inbound bloqueado porque o target e o numero conectado da instancia.', phone, instanceName, messageId, metadata: { connectedInstancePhone: connectedPhone } })
    return NextResponse.json({ ok: true, code: 'PROSPECTION_BLOCKED_SELF_TARGET' })
  }
  const text = pickText(payload)
  if (!text) return NextResponse.json({ ok: false, code: 'TEXT_REQUIRED' }, { status: 400 })

  const classification = classifyInbound(text)
  const device = detectDevice(text)
  const record = await recordInbound({ phone, text, classification, device, messageId, instanceName })
  if ('duplicate' in record && record.duplicate) {
    return NextResponse.json({ ok: true, code: 'INBOUND_DUPLICATE_IGNORED', status: 'ignored_duplicate' })
  }

  const action = (record as { action?: FlowAction }).action || null
  if (action && ['welcome', 'install', 'reply'].includes(String(action.type || ''))) {
    void runReservedAction(action, { remoteJid: pickRemoteJid(payload), messageId, fromMe: false, connectedInstancePhone: connectedPhone || null }).catch((error) => {
      console.warn(`[PROSPECTION_FLOW_FAILED] ${JSON.stringify({ phone, action: action.code, error: error instanceof Error ? error.message : String(error) })}`)
    })
  }

  return NextResponse.json({ ok: true, targetPhone: phone, classification, device: device || null, action })
}
