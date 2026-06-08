import { NextResponse } from 'next/server'
import { classifyInbound, detectDevice } from '@/lib/prospection/classifier'
import { normalizePhone } from '@/lib/prospection/phone'
import { triggerInstall, triggerWelcome } from '@/lib/prospection/panel2'
import { recordInbound } from '@/lib/prospection/store'

function pickText(payload: Record<string, unknown>) {
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : payload
  const message = data.message && typeof data.message === 'object' ? data.message as Record<string, unknown> : {}
  return String(
    message.conversation ||
    (message.extendedTextMessage as Record<string, unknown> | undefined)?.text ||
    data.text ||
    data.messageText ||
    payload.text ||
    ''
  ).trim()
}

function pickPhone(payload: Record<string, unknown>) {
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : payload
  const key = data.key && typeof data.key === 'object' ? data.key as Record<string, unknown> : {}
  const remoteJid = String(key.remoteJid || data.remoteJid || data.from || data.sender || payload.phone || '')
  return normalizePhone(remoteJid.split('@')[0])
}

function fromMe(payload: Record<string, unknown>) {
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : payload
  const key = data.key && typeof data.key === 'object' ? data.key as Record<string, unknown> : {}
  return Boolean(key.fromMe || data.fromMe)
}

function pickMessageId(payload: Record<string, unknown>) {
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : payload
  const key = data.key && typeof data.key === 'object' ? data.key as Record<string, unknown> : {}
  return String(key.id || data.messageId || data.id || payload.messageId || '').trim() || null
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!payload) return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 })
  if (fromMe(payload)) return NextResponse.json({ ok: true, code: 'IGNORED_FROM_ME' })
  const phone = pickPhone(payload)
  const text = pickText(payload)
  if (!phone || !text) return NextResponse.json({ ok: false, code: 'PHONE_OR_TEXT_REQUIRED' }, { status: 400 })
  const messageId = pickMessageId(payload)

  const classification = classifyInbound(text)
  const device = detectDevice(text)
  const record = await recordInbound({ phone, text, classification, device, messageId })
  if ('duplicate' in record && record.duplicate) {
    return NextResponse.json({ ok: true, code: 'INBOUND_DUPLICATE_IGNORED' })
  }

  let action: unknown = null
  if (classification === 'positive') {
    action = await triggerWelcome({ phone, name: record.lead?.name })
  } else if (classification === 'device') {
    action = await triggerInstall({ phone, name: record.lead?.name, device })
  }

  return NextResponse.json({ ok: true, classification, device: device || null, action })
}
