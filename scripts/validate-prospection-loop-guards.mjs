#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'

const root = process.cwd()
const envPath = path.join(root, '.env.local')

function loadEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnv(envPath)

const dbUrl = process.env.PROSPECTION_DATABASE_URL
const baseUrl = String(process.env.PROSPECTION_API_BASE_URL || 'http://127.0.0.1:3003').replace(/\/+$/, '')
const targetPhone = '5522988473304'
const selfPhone = String(process.env.PROSPECTION_CONNECTED_INSTANCE_PHONE || '5519988552541').replace(/\D/g, '')
const instanceName = `mock-loop-${Date.now()}`
const pool = new Pool({ connectionString: dbUrl, max: 1 })

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

function payload({ phone = targetPhone, id, text, fromMe = false }) {
  return {
    event: 'MESSAGES_UPSERT',
    instance: instanceName,
    data: {
      key: { remoteJid: `${phone}@s.whatsapp.net`, id, fromMe },
      message: { conversation: text },
    },
  }
}

async function post(body) {
  let response
  let lastError
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      response = await fetch(`${baseUrl}/api/prospection/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      break
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  if (!response) throw lastError || new Error('fetch failed')
  const json = await response.json().catch(() => ({}))
  assert(response.ok, `HTTP ${response.status}`, json)
  return json
}

async function countEvents(eventType, extra = '') {
  const result = await pool.query(
    `select count(*)::int as count
       from prospection_events
      where event_type=$1
        and metadata->>'targetPhone'=$2
        ${extra}`,
    [eventType, targetPhone],
  )
  return Number(result.rows[0]?.count || 0)
}

async function setup() {
  await pool.query(
    `update prospection_events
        set event_type = event_type || '_MOCK_ARCHIVED',
            idempotency_key = null
      where event_type in ('INBOUND_RECEIVED','WELCOME_TRIGGERED','WELCOME_SENT','INSTALL_TRIGGERED','INSTALL_SENT','PROSPECTION_CIRCUIT_BREAKER_TRIGGERED')
        and metadata->>'targetPhone'=$1
        and (
          coalesce(metadata->>'instanceName','') like 'mock-loop-%'
          or coalesce(metadata->>'idempotencyKey','') in ($2,$3)
        )`,
    [targetPhone, `prospection:welcome:${targetPhone}`, `prospection:install:${targetPhone}:android-tv-google-tv-tcl`],
  )
  await pool.query(
    `update prospection_events
        set event_type = event_type || '_MOCK_ARCHIVED',
            idempotency_key = null
      where event_type in ('WELCOME_TRIGGERED','WELCOME_SENT','INSTALL_TRIGGERED','INSTALL_SENT')
        and metadata->>'targetPhone'=$1
        and coalesce(metadata->>'idempotencyKey','') like 'prospection:%'`,
    [targetPhone],
  )
  await pool.query(
    `update prospection_leads
        set welcome_triggered_at=null,
            welcome_status=null,
            active_flow_type=null,
            install_sent_at=null,
            install_device=null,
            install_status=null,
            last_inbound_message_id=null,
            last_inbound_at=null,
            updated_at=now()
      where phone_e164=$1 and status <> 'opt_out'`,
    [targetPhone],
  )
}

async function main() {
  assert(dbUrl, 'PROSPECTION_DATABASE_URL ausente.')
  await setup()

  const first = await post(payload({ id: 'msg_001', text: 'posso sim' }))
  assert(first.targetPhone === targetPhone, 'targetPhone incorreto no positivo normal.', first)
  assert(first.action?.code === 'WELCOME_TRIGGERED', 'positivo normal nao reservou welcome.', first)

  const duplicates = []
  for (let index = 0; index < 3; index += 1) {
    duplicates.push(await post(payload({ id: 'msg_001', text: 'posso sim' })))
  }
  assert(duplicates.every((item) => item.code === 'INBOUND_DUPLICATE_IGNORED'), 'reentregas nao foram deduplicadas.', duplicates)
  assert(await countEvents('WELCOME_TRIGGERED') === 1, 'welcome duplicou apos mesmo messageId 4x.')

  const positiveTexts = ['ok', 'sim', 'pode', 'manda']
  for (let index = 0; index < positiveTexts.length; index += 1) {
    const result = await post(payload({ id: `msg_00${index + 2}`, text: positiveTexts[index] }))
    assert(result.action?.code === 'PROSPECTION_WELCOME_SKIPPED_ALREADY_SENT', 'variacao positiva repetiu welcome.', result)
  }
  assert(await countEvents('WELCOME_TRIGGERED') === 1, 'welcome duplicou apos variacoes positivas.')

  const own = await post(payload({ id: 'msg_from_me', text: 'posso sim', fromMe: true }))
  assert(own.code === 'PROSPECTION_IGNORED_FROM_ME', 'fromMe=true nao foi ignorado.', own)
  assert(await countEvents('WELCOME_TRIGGERED') === 1, 'fromMe=true disparou welcome.')

  const self = await post(payload({ phone: selfPhone, id: 'msg_self', text: 'posso sim' }))
  assert(self.code === 'PROSPECTION_BLOCKED_SELF_TARGET', 'self target nao foi bloqueado.', self)

  const install = await post(payload({ id: 'msg_install_001', text: 'TV TCL' }))
  assert(install.action?.code === 'INSTALL_TRIGGERED', 'aparelho nao reservou install.', install)
  const installAgain = await post(payload({ id: 'msg_install_002', text: 'TV TCL' }))
  assert(installAgain.action?.code === 'INSTALL_SKIPPED_ALREADY_SENT', 'aparelho repetido duplicou install.', installAgain)
  assert(await countEvents('INSTALL_TRIGGERED') === 1, 'install duplicou para aparelho repetido.')

  await pool.query(
    `update prospection_leads
        set welcome_status='pending',
            active_flow_type='welcome',
            welcome_triggered_at=now(),
            install_sent_at=null,
            install_device=null,
            install_status=null
      where phone_e164=$1 and status <> 'opt_out'`,
    [targetPhone],
  )
  await pool.query(
    `update prospection_events
        set event_type = event_type || '_MOCK_ARCHIVED',
            idempotency_key = null
      where event_type in ('INSTALL_TRIGGERED','INSTALL_SENT')
        and metadata->>'targetPhone'=$1
        and coalesce(metadata->>'instanceName','')=$2`,
    [targetPhone, instanceName],
  )
  const installAfterWelcome = await post(payload({ id: 'msg_install_003', text: 'TV TCL' }))
  assert(installAfterWelcome.action?.code === 'INSTALL_TRIGGERED', 'aparelho apos welcome pendente nao reservou install.', installAfterWelcome)
  const lead = await pool.query(
    `select active_flow_type, welcome_status, install_status, install_device
       from prospection_leads
      where phone_e164=$1 and status not in ('duplicate','invalid_phone')
      order by created_at desc
      limit 1`,
    [targetPhone],
  )
  assert(lead.rows[0]?.active_flow_type === 'install', 'active_flow_type nao mudou para install.', lead.rows[0])
  assert(lead.rows[0]?.welcome_status === 'cancelled', 'welcome pendente nao foi cancelado.', lead.rows[0])

  console.log(JSON.stringify({
    ok: true,
    instanceName,
    targetPhone,
    welcomeTriggered: await countEvents('WELCOME_TRIGGERED'),
    welcomeSkippedAlreadySent: await countEvents('PROSPECTION_WELCOME_SKIPPED_ALREADY_SENT'),
    installTriggered: await countEvents('INSTALL_TRIGGERED'),
    installSkippedAlreadySent: await countEvents('INSTALL_SKIPPED_ALREADY_SENT'),
    fromMeBlocked: await countEvents('PROSPECTION_IGNORED_FROM_ME'),
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, message: error.message, details: error.details || null }, null, 2))
    process.exitCode = 1
  })
  .finally(() => pool.end())
