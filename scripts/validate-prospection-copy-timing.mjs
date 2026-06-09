#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'

const root = process.cwd()

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

loadEnv(path.join(root, '.env.local'))

const dbUrl = process.env.PROSPECTION_DATABASE_URL
const baseUrl = String(process.env.PROSPECTION_API_BASE_URL || 'http://127.0.0.1:3003').replace(/\/+$/, '')
const pool = new Pool({ connectionString: dbUrl, max: 1 })
const runId = `validation-${Date.now()}`
const instanceName = `mock-${runId}`

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

function phone(offset) {
  return `55119${String(offset).padStart(2, '0')}${String(Date.now()).slice(-6)}`
}

async function post(pathname, body) {
  let response
  let lastError
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      response = await fetch(`${baseUrl}${pathname}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      break
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  if (!response) throw lastError || new Error('fetch failed')
  const json = await response.json().catch(() => ({}))
  return { response, json }
}

function webhookPayload(targetPhone, id, text) {
  return {
    event: 'MESSAGES_UPSERT',
    instance: instanceName,
    data: {
      key: { remoteJid: `${targetPhone}@s.whatsapp.net`, id, fromMe: false },
      message: { conversation: text },
    },
  }
}

async function createCampaign(name, leads) {
  const campaign = await pool.query(
    `insert into prospection_campaigns
       (name,status,instance_name,rate_limit_count,rate_limit_window_minutes,min_delay_seconds,max_delay_seconds,allowed_start_time,allowed_end_time,next_send_after)
     values ($1,'running',$2,15,50,160,270,'00:00','23:59',now())
     returning id`,
    [name, process.env.EVOLUTION_PROSPECTION_INSTANCE || 'centralplay-leads'],
  )
  const campaignId = campaign.rows[0].id
  for (const lead of leads) {
    await pool.query(
      `insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,status,scheduled_at,metadata)
       values ($1,$2,$3,$3,'scheduled',now(),$4::jsonb)`,
      [campaignId, lead.name, lead.phone, JSON.stringify({ validationRun: runId })],
    )
  }
  return campaignId
}

async function sendNext(campaignId) {
  const { response, json } = await post(`/api/prospection/send-next?campaignId=${encodeURIComponent(campaignId)}`)
  return { status: response.status, ...json }
}

async function testName(fullName, expectedGreeting) {
  const target = phone(Math.floor(Math.random() * 90) + 10)
  const campaignId = await createCampaign(`${runId}-name`, [{ name: fullName, phone: target }])
  const sent = await sendNext(campaignId)
  assert(sent.ok, 'send-next de nome nao concluiu em dry-run.', sent)
  const message = await pool.query(`select body from prospection_messages where campaign_id=$1 and direction='outbound' order by created_at desc limit 1`, [campaignId])
  assert(String(message.rows[0]?.body || '').startsWith(expectedGreeting), 'saudacao renderizada incorreta.', { body: message.rows[0]?.body, expectedGreeting })
}

async function testTiming() {
  const leads = [1, 2, 3, 4].map((index) => ({ name: `Lead ${index}`, phone: phone(index) }))
  const campaignId = await createCampaign(`${runId}-timing`, leads)
  const first = await sendNext(campaignId)
  assert(first.ok && first.code === 'DRY_RUN_SENT', 'primeiro envio simulado nao ocorreu agora.', first)
  const second = await sendNext(campaignId)
  assert(!second.ok && ['WAITING_NEXT_SEND', 'NO_DUE_LEAD'].includes(second.code), 'segundo envio nao respeitou intervalo.', second)
  const next = await pool.query(`select next_send_after from prospection_campaigns where id=$1`, [campaignId])
  const waitSeconds = Math.ceil((new Date(next.rows[0].next_send_after).getTime() - Date.now()) / 1000)
  assert(waitSeconds >= 150 && waitSeconds <= 280, 'next_send_after fora da faixa esperada.', { waitSeconds, nextSendAt: next.rows[0].next_send_after })
  const sentCount = await pool.query(`select count(*)::int as count from prospection_messages where campaign_id=$1 and direction='outbound' and type='initial'`, [campaignId])
  assert(sentCount.rows[0].count === 1, 'houve burst em chamadas imediatas.', sentCount.rows[0])
}

async function testInbound() {
  const target = phone(77)
  const campaignId = await createCampaign(`${runId}-inbound`, [{ name: 'Gabrielle Teste', phone: target }])
  await sendNext(campaignId)

  const question = await post('/api/prospection/webhook', webhookPayload(target, `${runId}-q1`, 'com quem estou falando?'))
  assert(question.json.classification === 'question_identity', 'pergunta nao foi classificada como question_identity.', question.json)
  assert(question.json.action?.code === 'IDENTITY_REPLY_TRIGGERED', 'pergunta disparou acao incorreta.', question.json)

  const positive = await post('/api/prospection/webhook', webhookPayload(target, `${runId}-p1`, 'posso sim'))
  assert(positive.json.classification === 'positive', 'positivo nao classificado.', positive.json)
  assert(positive.json.action?.code === 'WELCOME_TRIGGERED', 'positivo nao reservou welcome.', positive.json)

  for (const [index, text] of ['ok', 'sim', 'pode'].entries()) {
    const repeated = await post('/api/prospection/webhook', webhookPayload(target, `${runId}-p${index + 2}`, text))
    assert(repeated.json.action?.code === 'PROSPECTION_WELCOME_SKIPPED_ALREADY_SENT', 'welcome repetiu em positivo subsequente.', repeated.json)
  }

  const device = await post('/api/prospection/webhook', webhookPayload(target, `${runId}-d1`, 'TV TCL'))
  assert(device.json.classification === 'device', 'aparelho nao classificado.', device.json)
  assert(device.json.action?.code === 'INSTALL_TRIGGERED', 'aparelho nao reservou install.', device.json)
  const deviceAgain = await post('/api/prospection/webhook', webhookPayload(target, `${runId}-d2`, 'TV TCL'))
  assert(deviceAgain.json.action?.code === 'INSTALL_SKIPPED_ALREADY_SENT', 'install repetiu em 24h.', deviceAgain.json)

  const optoutTarget = phone(78)
  await createCampaign(`${runId}-optout`, [{ name: 'Opt Out', phone: optoutTarget }])
  const optout = await post('/api/prospection/webhook', webhookPayload(optoutTarget, `${runId}-o1`, 'NÃO'))
  assert(optout.json.classification === 'opt_out', 'opt-out nao classificado.', optout.json)
  const optoutLead = await pool.query(`select status from prospection_leads where phone_e164=$1 order by created_at desc limit 1`, [optoutTarget])
  assert(optoutLead.rows[0]?.status === 'opt_out', 'lead opt-out nao foi bloqueado.', optoutLead.rows[0])

  const wrongTarget = phone(79)
  await createCampaign(`${runId}-wrong`, [{ name: 'Gabrielle', phone: wrongTarget }])
  const wrong = await post('/api/prospection/webhook', webhookPayload(wrongTarget, `${runId}-w1`, 'Esse número não é de Gabrielle. Obrigada!'))
  assert(wrong.json.classification === 'wrong_number', 'numero errado nao classificado.', wrong.json)
  const wrongLead = await pool.query(`select status from prospection_leads where phone_e164=$1 order by created_at desc limit 1`, [wrongTarget])
  assert(wrongLead.rows[0]?.status === 'wrong_number', 'lead wrong_number nao saiu da fila.', wrongLead.rows[0])
}

async function main() {
  assert(dbUrl, 'PROSPECTION_DATABASE_URL ausente.')
  await testName('GABRIELLE DOS SANTOS CIPRIANO', 'Olá, *Gabrielle*, tudo bem?')
  await testName('ACME SERVICOS LTDA', 'Olá, tudo bem?')
  await testTiming()
  await testInbound()
  console.log(JSON.stringify({ ok: true, runId }, null, 2))
}

async function cleanup() {
  await pool.query(
    `update prospection_campaigns
        set status='cancelled', next_send_after=null, updated_at=now()
      where name like $1 and status in ('running','paused','draft')`,
    [`${runId}%`],
  ).catch(() => null)
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, message: error.message, details: error.details || null, runId }, null, 2))
    process.exitCode = 1
  })
  .finally(async () => {
    await cleanup()
    await pool.end()
  })
