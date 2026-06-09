import { Pool } from 'pg'
import crypto from 'crypto'
import { getProspectionConfig } from './config'
import { renderTemplate, defaultTemplates } from './templates'
import { normalizePhone } from './phone'
import type {
  ImportSummary,
  ImportRowsOptions,
  ProspectionCampaign,
  ProspectionEvent,
  ProspectionLead,
  ProspectionMessage,
  ProspectionTemplate,
} from './types'

const camel = (row: any): Record<string, unknown> => row
const authorizedTestReimportPhones = new Set(['5522988473304', '5522988345946'])

const poolCache = { url: '', pool: null as Pool | null, ready: null as Promise<void> | null }

function pool() {
  const url = getProspectionConfig().prospectionDatabaseUrl
  if (!url) return null
  if (!poolCache.pool || poolCache.url !== url) {
    if (poolCache.pool) void poolCache.pool.end().catch(() => null)
    poolCache.url = url
    poolCache.pool = new Pool({ connectionString: url, max: 3 })
    poolCache.ready = null
  }
  return poolCache.pool
}

function toCampaign(row: Record<string, unknown>): ProspectionCampaign {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    status: String(row.status || 'draft') as ProspectionCampaign['status'],
    instance_name: String(row.instance_name || ''),
    rate_limit_count: Number(row.rate_limit_count || 15),
    rate_limit_window_minutes: Number(row.rate_limit_window_minutes || 50),
    min_delay_seconds: Number(row.min_delay_seconds || 160),
    max_delay_seconds: Number(row.max_delay_seconds || 270),
    allowed_start_time: String(row.allowed_start_time || '09:00'),
    allowed_end_time: String(row.allowed_end_time || '20:00'),
    next_send_after: row.next_send_after ? String(row.next_send_after) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function toLead(row: Record<string, unknown>): ProspectionLead {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id || ''),
    name: String(row.name || ''),
    phone_raw: String(row.phone_raw || ''),
    phone_e164: String(row.phone_e164 || ''),
    email: row.email ? String(row.email) : null,
    city: row.city ? String(row.city) : null,
    uf: row.uf ? String(row.uf) : null,
    source_file_name: row.source_file_name ? String(row.source_file_name) : null,
    status: String(row.status || 'imported') as ProspectionLead['status'],
    template_id: row.template_id == null ? null : Number(row.template_id),
    message_preview: row.message_preview ? String(row.message_preview) : null,
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : null,
    sent_at: row.sent_at ? String(row.sent_at) : null,
    responded_at: row.responded_at ? String(row.responded_at) : null,
    responded_positive_at: row.responded_positive_at ? String(row.responded_positive_at) : null,
    last_response_text: row.last_response_text ? String(row.last_response_text) : null,
    last_inbound_message_id: row.last_inbound_message_id ? String(row.last_inbound_message_id) : null,
    last_inbound_at: row.last_inbound_at ? String(row.last_inbound_at) : null,
    welcome_triggered_at: row.welcome_triggered_at ? String(row.welcome_triggered_at) : null,
    welcome_status: row.welcome_status ? String(row.welcome_status) : null,
    install_sent_at: row.install_sent_at ? String(row.install_sent_at) : null,
    install_device: row.install_device ? String(row.install_device) : null,
    install_status: row.install_status ? String(row.install_status) : null,
    active_flow_type: row.active_flow_type ? String(row.active_flow_type) : null,
    send_attempts: Number(row.send_attempts || 0),
    error_message: row.error_message ? String(row.error_message) : null,
    metadata: (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {}) as Record<string, unknown>,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function toTemplate(row: Record<string, unknown>): ProspectionTemplate {
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    body: String(row.body || ''),
    active: Boolean(row.active),
    weight: Number(row.weight || 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function toEvent(row: Record<string, unknown>): ProspectionEvent {
  return {
    id: String(row.id),
    campaign_id: row.campaign_id ? String(row.campaign_id) : null,
    lead_id: row.lead_id ? String(row.lead_id) : null,
    event_type: String(row.event_type || ''),
    message: String(row.message || ''),
    metadata: (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {}) as Record<string, unknown>,
    created_at: String(row.created_at),
  }
}

async function query<T>(text: string, params: unknown[] = []) {
  const client = pool()
  if (!client) throw new Error('PROSPECTION_DATABASE_URL ausente.')
  const result = await client.query(text, params)
  return result.rows as T[]
}

async function isActiveClient(phone: string) {
  const config = getProspectionConfig()
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) return false
  const normalized = normalizePhone(phone)
  if (!normalized) return false
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/clients?select=id,status&phone_e164=eq.${encodeURIComponent(normalized)}&limit=1`, {
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      },
    })
    if (!response.ok) return false
    const rows = await response.json() as Array<{ status?: string | null }>
    const status = String(rows[0]?.status || '').toLowerCase()
    return ['active', 'test_active', 'paid', 'cliente_active'].includes(status)
  } catch {
    return false
  }
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function pick(row: Record<string, unknown>, aliases: string[]) {
  const wanted = aliases.map(normalizeHeader)
  const keys = Object.keys(row).filter((candidate) => wanted.includes(normalizeHeader(candidate)))
  const key = keys.find((candidate) => String(row[candidate] || '').trim()) || keys[0]
  return key ? String(row[key] || '').trim() : ''
}

function emptyImportSummary(imported: number, campaignId: string): ImportSummary {
  return {
    imported,
    valid: 0,
    queued: 0,
    duplicates: 0,
    invalid: 0,
    optOutIgnored: 0,
    alreadySent: 0,
    activeClientsBlocked: 0,
    errors: 0,
    testReimports: 0,
    campaignId,
    details: [],
  }
}

function addImportDetail(
  summary: ImportSummary,
  input: { row: number; name: string; phoneRaw: string; phoneE164: string; status: ProspectionLead['status']; reason: string; queued?: boolean },
) {
  summary.details.push({
    row: input.row,
    name: input.name,
    phoneRaw: input.phoneRaw,
    phoneE164: input.phoneE164,
    status: input.status,
    reason: input.reason,
    queued: Boolean(input.queued),
  })
}

function randomDelaySeconds(campaign: ProspectionCampaign) {
  const min = Math.min(campaign.min_delay_seconds, campaign.max_delay_seconds)
  const max = Math.max(campaign.min_delay_seconds, campaign.max_delay_seconds)
  return Math.floor(min + Math.random() * (max - min + 1))
}

function textHash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24)
}

function inboundBucket(date = new Date()) {
  return Math.floor(date.getTime() / (2 * 60 * 1000))
}

function inboundKey(input: { instanceName: string; messageId?: string | null; phone: string; text: string }) {
  if (input.messageId) return `prospection:inbound:${input.instanceName}:${input.messageId}`
  return `prospection:inbound:${input.instanceName}:${input.phone}:${textHash(input.text.trim().toLowerCase())}:${inboundBucket()}`
}

function flowWindowKey(prefix: 'welcome' | 'install', phone: string, device?: string) {
  const dayBucket = new Date().toISOString().slice(0, 13)
  return prefix === 'install'
    ? `prospection:install:${phone}:${textHash(String(device || '').toLowerCase())}:${dayBucket}`
    : `prospection:welcome:${phone}:${dayBucket}`
}

function isRecent(value: unknown, hours: number) {
  if (!value) return false
  const date = new Date(String(value))
  if (!Number.isFinite(date.getTime())) return false
  return Date.now() - date.getTime() < hours * 60 * 60 * 1000
}

function metadataValue(value: Record<string, unknown>, key: string) {
  return value && typeof value[key] === 'string' ? String(value[key]) : ''
}

function eventForStatus(status: ProspectionCampaign['status']) {
  if (status === 'running') return getProspectionConfig().dryRun || !getProspectionConfig().enabled ? 'CAMPAIGN_STARTED_DRY_RUN' : 'CAMPAIGN_STARTED'
  if (status === 'paused') return 'CAMPAIGN_PAUSED'
  if (status === 'cancelled') return 'CAMPAIGN_CANCELLED'
  if (status === 'completed') return 'QUEUE_EMPTY'
  return `CAMPAIGN_${status.toUpperCase()}`
}

async function getSelectedCampaign(campaignId?: string) {
  if (campaignId) {
    const rows = await query<ProspectionCampaign>(`select * from prospection_campaigns where id=$1 limit 1`, [campaignId])
    return rows[0] ? toCampaign(camel(rows[0])) : null
  }
  const activeRows = await query<ProspectionCampaign>(
    `select * from prospection_campaigns
      where status in ('running','paused','draft')
      order by created_at desc
      limit 10`,
  )
  for (const row of activeRows) {
    const campaign = toCampaign(camel(row))
    if (campaign.status === 'running') {
      const openRows = await query<{ count: string }>(
        `select count(*)::text as count
           from prospection_leads
          where campaign_id=$1 and status in ('queued','scheduled','sending')`,
        [campaign.id],
      )
      if (Number(openRows[0]?.count || 0) === 0) {
        await query(`update prospection_campaigns set status='completed', next_send_after=null, updated_at=now() where id=$1`, [campaign.id])
        continue
      }
    }
    return campaign
  }
  const fallbackRows = await query<ProspectionCampaign>(
    `select * from prospection_campaigns
      where status in ('completed','cancelled')
      order by created_at desc
      limit 1`,
  )
  return fallbackRows[0] ? toCampaign(camel(fallbackRows[0])) : null
}

async function withTx<T>(fn: (client: { query: typeof query }) => Promise<T>) {
  const client = pool()
  if (!client) throw new Error('PROSPECTION_DATABASE_URL ausente.')
  const conn = await client.connect()
  try {
    await conn.query('BEGIN')
    const api: any = { query: async (text: string, params: unknown[] = []) => (await conn.query(text, params)).rows }
    const result = await fn(api)
    await conn.query('COMMIT')
    return result
  } catch (error) {
    await conn.query('ROLLBACK').catch(() => null)
    throw error
  } finally {
    conn.release()
  }
}

async function ensureReady() {
  if (poolCache.ready) return poolCache.ready
  poolCache.ready = (async () => {
    const client = pool()
    if (!client) return
    await client.query('create extension if not exists pgcrypto')
    await client.query(`alter table prospection_leads drop constraint if exists prospection_leads_status_check`)
    await client.query(
      `alter table prospection_leads add constraint prospection_leads_status_check
       check (status in ('imported','queued','scheduled','sending','sent','dry_run_sent','responded','responded_positive','opt_out','invalid_phone','duplicate','error'))`,
    )
    await client.query(`alter table prospection_leads add column if not exists responded_positive_at timestamptz`)
    await client.query(`alter table prospection_leads add column if not exists welcome_triggered_at timestamptz`)
    await client.query(`alter table prospection_leads add column if not exists welcome_status text`)
    await client.query(`alter table prospection_leads add column if not exists active_flow_type text`)
    await client.query(`alter table prospection_leads add column if not exists last_inbound_message_id text`)
    await client.query(`alter table prospection_leads add column if not exists last_inbound_at timestamptz`)
    await client.query(`alter table prospection_leads add column if not exists install_sent_at timestamptz`)
    await client.query(`alter table prospection_leads add column if not exists install_device text`)
    await client.query(`alter table prospection_leads add column if not exists install_status text`)
    await client.query(`alter table prospection_messages add column if not exists idempotency_key text`)
    await client.query(`alter table prospection_events add column if not exists idempotency_key text`)
    await client.query(`create unique index if not exists prospection_messages_idempotency_key_idx on prospection_messages(idempotency_key) where idempotency_key is not null`)
    await client.query(`create unique index if not exists prospection_events_idempotency_key_idx on prospection_events(idempotency_key) where idempotency_key is not null`)
    await client.query(`create index if not exists prospection_events_phone_window_idx on prospection_events((metadata->>'targetPhone'), event_type, created_at desc)`)
    const { rows } = await client.query<{ count: string }>('select count(*)::text as count from prospection_templates')
    if (Number(rows[0]?.count || 0) === 0) {
      await client.query(
        `insert into prospection_templates (id, name, body, active, weight)
         values ${defaultTemplates.map((t) => `(${t.id}, $${t.id * 2 - 1}, $${t.id * 2}, true, ${t.weight})`).join(', ')}
         on conflict (id) do update set name = excluded.name, body = excluded.body, active = true, weight = excluded.weight, updated_at = now()`,
        defaultTemplates.flatMap((template) => [template.name, template.body]),
      )
    }
  })()
  return poolCache.ready
}

export function isEnabled() {
  return Boolean(getProspectionConfig().prospectionDatabaseUrl)
}

export async function createCampaign(input?: Partial<ProspectionCampaign>) {
  await ensureReady()
  const cfg = getProspectionConfig()
  const created = await query<ProspectionCampaign>(
    `insert into prospection_campaigns
      (name, status, instance_name, rate_limit_count, rate_limit_window_minutes, min_delay_seconds, max_delay_seconds, allowed_start_time, allowed_end_time)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     returning *`,
    [
      input?.name || `Campanha ${new Date().toLocaleDateString('pt-BR')}`,
      input?.status || 'draft',
      input?.instance_name || 'centralplay-leads',
      input?.rate_limit_count || cfg.defaultBatchLimit,
      input?.rate_limit_window_minutes || cfg.defaultWindowMinutes,
      input?.min_delay_seconds || cfg.defaultMinDelaySeconds,
      input?.max_delay_seconds || cfg.defaultMaxDelaySeconds,
      input?.allowed_start_time || cfg.allowedStartTime,
      input?.allowed_end_time || cfg.allowedEndTime,
    ],
  )
  return toCampaign(camel(created[0]))
}

export async function getOrCreateDraftCampaign() {
  await ensureReady()
  const rows = await query<ProspectionCampaign>(
    `select * from prospection_campaigns where status in ('draft','paused','running') order by created_at desc limit 1`,
  )
  if (rows[0]) return toCampaign(camel(rows[0]))
  return createCampaign()
}

export async function updateCampaignStatus(campaignId: string, status: ProspectionCampaign['status']) {
  await ensureReady()
  return withTx(async (tx) => {
    const existingRows = await tx.query<ProspectionCampaign>(`select * from prospection_campaigns where id=$1 limit 1 for update`, [campaignId])
    const existing = existingRows[0]
    if (!existing) throw new Error('Campanha nao encontrada.')
    if (status === 'running') {
      const openRows = await tx.query<{ count: string }>(
        `select count(*)::text as count
           from prospection_leads
          where campaign_id=$1 and status in ('queued','scheduled','sending')`,
        [campaignId],
      )
      if (Number(openRows[0]?.count || 0) === 0) status = 'completed'
    }
    const rows = await tx.query<ProspectionCampaign>(
      `update prospection_campaigns set status=$2, updated_at=now() where id=$1 returning *`,
      [campaignId, status],
    )
    const campaign = rows[0]
    if (!campaign) throw new Error('Campanha nao encontrada.')
    if (status === 'running') {
      const staleScheduled = await tx.query<{ id: string }>(
        `select id from prospection_leads
          where campaign_id=$1 and status='scheduled' and scheduled_at <= now()
          order by scheduled_at asc limit 1`,
        [campaignId],
      )
      const queued = staleScheduled[0]
        ? []
        : await tx.query<{ id: string }>(
            `select id from prospection_leads where campaign_id=$1 and status='queued' order by created_at asc limit 1`,
            [campaignId],
          )
      const target = staleScheduled[0] || queued[0]
      if (target) {
        const nextAt = new Date(Date.now() + randomDelaySeconds(campaign) * 1000).toISOString()
        await tx.query(`update prospection_leads set status='scheduled', scheduled_at=$2, updated_at=now() where id=$1`, [target.id, nextAt])
        await tx.query(`update prospection_campaigns set next_send_after=$2, updated_at=now() where id=$1`, [campaignId, nextAt])
        await tx.query(
          `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
           values ($1,$2,'LEAD_SCHEDULED','Lead agendado para simulacao.',$3::jsonb)`,
          [campaignId, target.id, JSON.stringify({ nextSendAt: nextAt })],
        )
        await tx.query(
          `insert into prospection_events (campaign_id,event_type,message,metadata)
           values ($1,'NEXT_SEND_RECALCULATED','Proximo envio recalculado.',$2::jsonb)`,
          [campaignId, JSON.stringify({ nextSendAt: nextAt, reason: existing.status === 'paused' ? 'resume' : 'start' })],
        )
      }
    }
    await tx.query(
      `insert into prospection_events (campaign_id,event_type,message,metadata)
       values ($1,$2,$3,$4::jsonb)`,
      [campaignId, eventForStatus(status), `Campanha alterada para ${status}.`, JSON.stringify({ previousStatus: existing.status, status })],
    )
    const freshRows = await tx.query<ProspectionCampaign>(`select * from prospection_campaigns where id=$1 limit 1`, [campaignId])
    return toCampaign(camel(freshRows[0] || campaign))
  })
}

export async function listTemplates() {
  await ensureReady()
  const rows = await query<ProspectionTemplate>(`select * from prospection_templates order by weight asc, id asc`)
  return rows.map((row) => toTemplate(camel(row)))
}

export async function updateTemplate(templateId: number, patch: Partial<ProspectionTemplate>) {
  await ensureReady()
  const rows = await query<ProspectionTemplate>(
    `update prospection_templates
       set name=coalesce($2,name), body=coalesce($3,body), active=coalesce($4,active), weight=coalesce($5,weight), updated_at=now()
     where id=$1
     returning *`,
    [templateId, patch.name ?? null, patch.body ?? null, patch.active ?? null, patch.weight ?? null],
  )
  if (!rows[0]) throw new Error('Template nao encontrado.')
  return toTemplate(camel(rows[0]))
}

export async function importRows(rows: Array<Record<string, unknown>>, sourceFileName: string, options?: string | ImportRowsOptions): Promise<ImportSummary> {
  await ensureReady()
  const campaignId = typeof options === 'string' ? options : options?.campaignId
  const forceTestReimport = typeof options === 'object' ? Boolean(options.forceTestReimport) : false
  const campaign = campaignId ? (await query<ProspectionCampaign>(`select * from prospection_campaigns where id=$1 limit 1`, [campaignId]))[0] : await getOrCreateDraftCampaign()
  if (!campaign) throw new Error('Campanha nao encontrada.')
  const summary = emptyImportSummary(rows.length, campaign.id)
  const seen = new Set<string>()
  return withTx(async (tx) => {
    for (const [index, row] of rows.entries()) {
      const name = pick(row, ['Nome', 'name', 'cliente', 'contato'])
      const phoneRaw = pick(row, ['Telefone 1', 'Telefone', 'Celular', 'WhatsApp', 'phone'])
      const phone = normalizePhone(phoneRaw)
      const canForceTestReimport = forceTestReimport && authorizedTestReimportPhones.has(phone)
      const base = {
        campaign_id: campaign.id,
        name,
        phone_raw: phoneRaw,
        phone_e164: phone,
        email: pick(row, ['E-mail', 'email']) || null,
        city: pick(row, ['Cidade', 'city']) || null,
        uf: pick(row, ['UF', 'uf']) || null,
        source_file_name: sourceFileName,
        metadata: { raw: row, forceTestReimport: canForceTestReimport || undefined },
      }
      if (!phone) {
        summary.invalid += 1
        await tx.query(
          `insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata)
           values ($1,$2,$3,$4,$5,$6,$7,$8,'invalid_phone',$9,$10::jsonb)`,
          [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone invalido.', JSON.stringify({ raw: row })],
        )
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'invalid_phone', reason: 'Telefone invalido.' })
        continue
      }
      if (seen.has(phone)) {
        summary.duplicates += 1
        await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'duplicate',$9,$10::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone duplicado ou ja importado.', JSON.stringify({ raw: row })])
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'duplicate', reason: 'Telefone duplicado dentro do arquivo.' })
        continue
      }
      const optout = await tx.query<{ id: string }>(`select id from prospection_optouts where phone_e164=$1 limit 1`, [phone])
      if (optout[0]) {
        summary.optOutIgnored += 1
        await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'opt_out',$9,$10::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone em opt-out global.', JSON.stringify({ raw: row })])
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'opt_out', reason: 'Telefone em opt-out global.' })
        continue
      }
      const sent = await tx.query<{ id: string }>(`select m.id from prospection_messages m join prospection_leads l on l.id = m.lead_id where m.direction='outbound' and l.phone_e164=$1 limit 1`, [phone])
      if (sent[0] && !canForceTestReimport) {
        summary.alreadySent += 1
        await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'duplicate',$9,$10::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone ja recebeu abordagem anterior.', JSON.stringify({ raw: row })])
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'duplicate', reason: 'Telefone ja recebeu abordagem anterior.' })
        continue
      }
      const existingLead = await tx.query<{ id: string }>(`select id from prospection_leads where phone_e164=$1 and status not in ('invalid_phone','duplicate') limit 1`, [phone])
      if (existingLead[0] && !canForceTestReimport) {
        summary.duplicates += 1
        await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'duplicate',$9,$10::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone duplicado ou ja importado.', JSON.stringify({ raw: row })])
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'duplicate', reason: 'Telefone duplicado ou ja importado.' })
        continue
      }
      if ((await isActiveClient(phone)) && !canForceTestReimport) {
        summary.activeClientsBlocked += 1
        await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'duplicate',$9,$10::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone ja consta como cliente ativo/teste ativo.', JSON.stringify({ raw: row })])
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'duplicate', reason: 'Telefone ja consta como cliente ativo/teste ativo.' })
        continue
      }
      summary.valid += 1
      summary.queued += 1
      if (canForceTestReimport) summary.testReimports += 1
      seen.add(phone)
      await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'queued',$9::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, JSON.stringify(base.metadata)])
      addImportDetail(summary, {
        row: index + 1,
        name,
        phoneRaw,
        phoneE164: phone,
        status: 'queued',
        reason: canForceTestReimport ? 'Reimportado como teste autorizado.' : 'Adicionado a fila.',
        queued: true,
      })
    }
    await tx.query(`insert into prospection_events (campaign_id,event_type,message,metadata) values ($1,'leads_imported','Arquivo de leads importado.',$2::jsonb)`, [campaign.id, JSON.stringify({ sourceFileName, summary })])
    return summary
  })
}

export async function listLeads(input?: { status?: string; campaignId?: string; page?: number; pageSize?: number }) {
  await ensureReady()
  const page = Math.max(1, input?.page || 1)
  const pageSize = Math.min(100, Math.max(1, input?.pageSize || 50))
  const clauses: string[] = []
  const values: unknown[] = []
  if (input?.status) {
    values.push(input.status)
    clauses.push(`status=$${values.length}`)
  }
  if (input?.campaignId) {
    values.push(input.campaignId)
    clauses.push(`campaign_id=$${values.length}`)
  }
  const where = clauses.length ? `where ${clauses.join(' and ')}` : ''
  const limitParam = values.length + 1
  const offsetParam = values.length + 2
  const rows = await query<ProspectionLead>(
    `select * from prospection_leads ${where} order by created_at desc limit $${limitParam} offset $${offsetParam}`,
    [...values, pageSize, (page - 1) * pageSize],
  )
  const countRows = await query<{ count: string }>(`select count(*)::text as count from prospection_leads ${where}`, values)
  return { items: rows.map((row) => toLead(camel(row))), total: Number(countRows[0]?.count || 0), page, pageSize }
}

export async function getQueueSummary(input?: { campaignId?: string }) {
  await ensureReady()
  const activeCampaign = await getSelectedCampaign(input?.campaignId)
  if (!activeCampaign) return { activeCampaign: null, current: null, upcoming: [], lastSent: null }
  const currentRows = await query<ProspectionLead>(`select * from prospection_leads where campaign_id=$1 and status='sending' order by updated_at desc limit 1`, [activeCampaign.id])
  const upcomingRows = await query<ProspectionLead>(`select * from prospection_leads where campaign_id=$1 and status in ('queued','scheduled') order by coalesce(scheduled_at,created_at) asc limit 3`, [activeCampaign.id])
  const lastRows = await query<ProspectionMessage>(`select m.* from prospection_messages m where m.campaign_id=$1 and m.direction='outbound' and m.type='initial' order by m.created_at desc limit 1`, [activeCampaign.id])
  const lastLeadRows = lastRows[0]
    ? await query<ProspectionLead>(`select * from prospection_leads where id=$1 limit 1`, [lastRows[0].lead_id])
    : []
  return {
    activeCampaign,
    current: currentRows[0] ? toLead(camel(currentRows[0])) : null,
    upcoming: upcomingRows.map((row) => toLead(camel(row))),
    lastSent: lastLeadRows[0] ? toLead(camel(lastLeadRows[0])) : null,
  }
}

export async function getStatus(input?: { campaignId?: string }) {
  await ensureReady()
  const activeCampaign = await getSelectedCampaign(input?.campaignId)
  if (!activeCampaign) {
    return {
      stats: { imported: 0, queued: 0, sentToday: 0, responded: 0, optOut: 0, nextSend: null },
      activeCampaign: null,
    }
  }
  const [statsRows, nextRows] = await Promise.all([
    query<{ imported: string; queued: string; sent_today: string; responded: string; optout: string; next_send: string | null }>(
      `select
        count(*)::text as imported,
        count(*) filter (where status in ('queued','scheduled'))::text as queued,
        count(*) filter (where sent_at::date = current_date)::text as sent_today,
        count(*) filter (where status in ('responded','responded_positive'))::text as responded,
        count(*) filter (where status = 'opt_out')::text as optout,
        min(scheduled_at) filter (where status in ('queued','scheduled'))::text as next_send
       from prospection_leads
       where campaign_id=$1`,
      [activeCampaign.id],
    ),
    query<{ next_send_after: string | null }>(`select next_send_after::text as next_send_after from prospection_campaigns where id=$1 and status='running' limit 1`, [activeCampaign.id]),
  ])
  return {
    stats: {
      imported: Number(statsRows[0]?.imported || 0),
      queued: Number(statsRows[0]?.queued || 0),
      sentToday: Number(statsRows[0]?.sent_today || 0),
      responded: Number(statsRows[0]?.responded || 0),
      optOut: Number(statsRows[0]?.optout || 0),
      nextSend: statsRows[0]?.next_send || nextRows[0]?.next_send_after || null,
    },
    activeCampaign,
  }
}

export async function reserveNextLead(input?: { force?: boolean; campaignId?: string }) {
  await ensureReady()
  return withTx(async (tx) => {
    const campaignRows = input?.campaignId
      ? await tx.query<ProspectionCampaign>(
          `select * from prospection_campaigns where id=$1 and status in ('running','draft','paused') limit 1 for update`,
          [input.campaignId],
        )
      : await tx.query<ProspectionCampaign>(
          `select * from prospection_campaigns
            where status ${input?.force ? "in ('running','draft','paused')" : "= 'running'"}
            order by updated_at desc limit 1 for update`,
        )
    const campaign = campaignRows[0]
    if (!campaign) return { ok: false as const, code: 'NO_RUNNING_CAMPAIGN' as const }
    if (!input?.force && campaign.status !== 'running') return { ok: false as const, code: 'NO_RUNNING_CAMPAIGN' as const }
    const cutoff = new Date(Date.now() - campaign.rate_limit_window_minutes * 60 * 1000).toISOString()
    const rateRows = await tx.query<{ count: string }>(
      `select count(*)::text as count from prospection_messages where campaign_id=$1 and direction='outbound' and type='initial' and created_at >= $2`,
      [campaign.id, cutoff],
    )
    if (Number(rateRows[0]?.count || 0) >= campaign.rate_limit_count) return { ok: false as const, code: 'RATE_LIMITED' as const }
    const leadRows = await tx.query<ProspectionLead>(
      `select * from prospection_leads
       where campaign_id=$1
         and status in ('queued','scheduled')
         and ($2::boolean = true or coalesce(scheduled_at,created_at) <= now())
       order by coalesce(scheduled_at,created_at) asc
       limit 1
       for update skip locked`,
      [campaign.id, Boolean(input?.force)],
    )
    const lead = leadRows[0]
    if (!lead) {
      const openRows = await tx.query<{ count: string }>(
        `select count(*)::text as count
           from prospection_leads
          where campaign_id=$1 and status in ('queued','scheduled','sending')`,
        [campaign.id],
      )
      if (Number(openRows[0]?.count || 0) === 0) {
        await tx.query(`update prospection_campaigns set status='completed', next_send_after=null, updated_at=now() where id=$1`, [campaign.id])
        await tx.query(
          `insert into prospection_events (campaign_id,event_type,message,metadata)
           values ($1,'QUEUE_EMPTY','Fila finalizada sem leads pendentes.','{}'::jsonb)`,
          [campaign.id],
        )
        return { ok: false as const, code: 'QUEUE_EMPTY_COMPLETED' as const }
      }
      return { ok: false as const, code: 'NO_DUE_LEAD' as const }
    }
    await tx.query(
      `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
       values ($1,$2,'NEXT_SEND_DUE','Proximo lead liberado para processamento.',$3::jsonb)`,
      [campaign.id, lead.id, JSON.stringify({ force: Boolean(input?.force), scheduledAt: lead.scheduled_at || null })],
    )
    const templateRows = await tx.query<ProspectionTemplate>(`select * from prospection_templates where active=true order by weight asc, id asc`)
    const templates = templateRows.length ? templateRows : defaultTemplates
    const template = templates[(lead.send_attempts + Number(rateRows[0]?.count || 0)) % templates.length] || templates[0]
    const preview = renderTemplate(template.body, lead.name)
    const nextScheduledAt = new Date(Date.now() + (campaign.min_delay_seconds + Math.floor(Math.random() * (campaign.max_delay_seconds - campaign.min_delay_seconds + 1))) * 1000).toISOString()
    await tx.query(`update prospection_leads set status='sending', template_id=$2, message_preview=$3, send_attempts=send_attempts+1, updated_at=now() where id=$1`, [lead.id, template.id, preview])
    await tx.query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,'LEAD_RESERVED','Lead reservado para simulacao.',$3::jsonb)`, [campaign.id, lead.id, JSON.stringify({ templateId: template.id })])
    if (getProspectionConfig().dryRun || !getProspectionConfig().enabled) {
      await tx.query(
        `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
         values ($1,$2,'LEAD_DRY_RUN_PROCESSING','Lead em processamento simulado.',$3::jsonb)`,
        [campaign.id, lead.id, JSON.stringify({ templateId: template.id, force: Boolean(input?.force) })],
      )
    }
    await tx.query(`update prospection_campaigns set next_send_after=$2, updated_at=now() where id=$1`, [campaign.id, nextScheduledAt])
    return { ok: true as const, campaign: toCampaign(camel(campaign)), lead: toLead(camel({ ...lead, template_id: template.id, message_preview: preview, send_attempts: lead.send_attempts + 1, status: 'sending' })), template }
  })
}

export async function completeSend(input: { campaignId: string; leadId: string; body: string; templateId: number; status: 'sent' | 'dry_run'; evolutionMessageId?: string | null }) {
  await ensureReady()
  return withTx(async (tx) => {
    const now = new Date().toISOString()
    const leadStatus = input.status === 'dry_run' ? 'dry_run_sent' : 'sent'
    await tx.query(`update prospection_leads set status=$3, sent_at=$2, updated_at=$2, error_message=null where id=$1`, [input.leadId, now, leadStatus])
    await tx.query(`insert into prospection_messages (campaign_id,lead_id,direction,type,template_id,body,status,evolution_message_id,error_message) values ($1,$2,'outbound','initial',$3,$4,$5,$6,null)`, [input.campaignId, input.leadId, input.templateId, input.body, input.status, input.evolutionMessageId || null])
    if (input.status === 'dry_run') {
      await tx.query(
        `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
         values ($1,$2,'WORKER_SKIPPED_REAL_DISABLED','Envio real bloqueado; simulacao gravada.',$3::jsonb)`,
        [input.campaignId, input.leadId, JSON.stringify({ dryRun: true, evolutionMessageId: null })],
      )
    }
    const next = await tx.query<ProspectionLead>(`select * from prospection_leads where campaign_id=$1 and status='queued' order by created_at asc limit 1`, [input.campaignId])
    if (next[0]) {
      const campaignRows = await tx.query<ProspectionCampaign>(`select * from prospection_campaigns where id=$1 limit 1`, [input.campaignId])
      const campaign = campaignRows[0]
      const delay = campaign ? campaign.min_delay_seconds + Math.floor(Math.random() * (campaign.max_delay_seconds - campaign.min_delay_seconds + 1)) : 160
      const nextAt = new Date(Date.now() + delay * 1000).toISOString()
      await tx.query(`update prospection_leads set status='scheduled', scheduled_at=$2, updated_at=now() where id=$1`, [next[0].id, nextAt])
      await tx.query(`update prospection_campaigns set next_send_after=$2, updated_at=now() where id=$1`, [input.campaignId, nextAt])
      await tx.query(
        `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
         values ($1,$2,'LEAD_SCHEDULED','Lead agendado para simulacao.',$3::jsonb)`,
        [input.campaignId, next[0].id, JSON.stringify({ nextSendAt: nextAt })],
      )
      await tx.query(
        `insert into prospection_events (campaign_id,event_type,message,metadata)
         values ($1,'NEXT_SEND_RECALCULATED','Proximo envio recalculado.',$2::jsonb)`,
        [input.campaignId, JSON.stringify({ nextSendAt: nextAt, reason: 'after_send' })],
      )
    } else {
      await tx.query(`update prospection_campaigns set next_send_after=null, status=case when not exists (select 1 from prospection_leads where campaign_id=$1 and status in ('queued','scheduled','sending')) then 'completed' else status end, updated_at=now() where id=$1`, [input.campaignId])
      await tx.query(
        `insert into prospection_events (campaign_id,event_type,message,metadata)
         values ($1,'QUEUE_EMPTY','Fila finalizada sem leads pendentes.','{}'::jsonb)`,
        [input.campaignId],
      )
      await tx.query(
        `insert into prospection_events (campaign_id,event_type,message,metadata)
         values ($1,'CAMPAIGN_COMPLETED','Campanha finalizada apos processar a fila.','{}'::jsonb)`,
        [input.campaignId],
      )
    }
    await tx.query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,$3,'Abordagem inicial registrada.',$4::jsonb)`, [input.campaignId, input.leadId, input.status === 'dry_run' ? 'LEAD_DRY_RUN_SENT' : 'LEAD_SENT', JSON.stringify({ messageId: input.evolutionMessageId || null })])
    const leadRows = await tx.query<ProspectionLead>(`select * from prospection_leads where id=$1 limit 1`, [input.leadId])
    const campaignRows = await tx.query<ProspectionCampaign>(`select * from prospection_campaigns where id=$1 limit 1`, [input.campaignId])
    return { lead: toLead(camel(leadRows[0])), campaign: toCampaign(camel(campaignRows[0])), message: { status: input.status, body: input.body, template_id: input.templateId } }
  })
}

export async function failSend(input: { campaignId: string; leadId: string; error: string }) {
  await ensureReady()
  await query(`update prospection_leads set status='error', error_message=$2, updated_at=now() where id=$1`, [input.leadId, input.error])
  await query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,'send_error','Falha ao enviar abordagem.',$3::jsonb)`, [input.campaignId, input.leadId, JSON.stringify({ error: input.error })])
  await query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,'WORKER_ERROR','Erro no processamento do worker.',$3::jsonb)`, [input.campaignId, input.leadId, JSON.stringify({ error: input.error })])
  const rows = await query<ProspectionLead>(`select * from prospection_leads where id=$1 limit 1`, [input.leadId])
  return toLead(camel(rows[0]))
}

export async function recordProspectionEvent(input: { eventType: string; message: string; phone?: string | null; instanceName?: string | null; messageId?: string | null; metadata?: Record<string, unknown>; idempotencyKey?: string | null }) {
  await ensureReady()
  const phone = input.phone ? normalizePhone(input.phone) : ''
  await query(
    `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata,idempotency_key)
     values (null,null,$1,$2,$3::jsonb,$4)
     on conflict (idempotency_key) where idempotency_key is not null do nothing`,
    [
      input.eventType,
      input.message,
      JSON.stringify({
        ...(input.metadata || {}),
        targetPhone: phone || null,
        instanceName: input.instanceName || null,
        messageId: input.messageId || null,
      }),
      input.idempotencyKey || null,
    ],
  )
}

export async function recordFlowResult(input: { flow: 'welcome' | 'install'; phone: string; leadId?: string | null; campaignId?: string | null; device?: string | null; ok: boolean; code: string; metadata?: Record<string, unknown> }) {
  await ensureReady()
  const phone = normalizePhone(input.phone)
  if (!phone) return
  const isDryRun = input.code === 'WELCOME_DRY_RUN' || input.code === 'INSTALL_DRY_RUN'
  const eventType = input.code === 'PROSPECTION_BLOCKED_NOT_ALLOWLISTED'
    ? 'PROSPECTION_BLOCKED_NOT_ALLOWLISTED'
    : input.code === 'PROSPECTION_PANEL2_TRIGGER_DISABLED'
    ? 'PROSPECTION_PANEL2_TRIGGER_DISABLED'
    : isDryRun
    ? input.flow === 'welcome' ? 'WELCOME_DRY_RUN' : 'INSTALL_DRY_RUN'
    : input.flow === 'welcome'
    ? input.ok ? 'WELCOME_SENT' : 'WELCOME_FAILED'
    : input.ok ? 'INSTALL_SENT' : 'INSTALL_FAILED'
  await withTx(async (tx) => {
    const leadRows = input.leadId
      ? await tx.query<ProspectionLead>(`select * from prospection_leads where id=$1 limit 1 for update`, [input.leadId])
      : await tx.query<ProspectionLead>(`select * from prospection_leads where phone_e164=$1 and status not in ('duplicate','invalid_phone') order by created_at desc limit 1 for update`, [phone])
    const lead = leadRows[0]
    if (lead) {
      if (input.flow === 'welcome') {
        await tx.query(
          `update prospection_leads
              set welcome_status=$2,
                  active_flow_type=case when $2='sent' then 'welcome' else active_flow_type end,
                  updated_at=now()
            where id=$1`,
          [lead.id, isDryRun ? 'pending' : input.ok ? 'sent' : 'error'],
        )
      } else {
        await tx.query(
          `update prospection_leads
              set install_status=$2,
                  active_flow_type='install',
                  updated_at=now()
            where id=$1`,
          [lead.id, isDryRun ? 'pending' : input.ok ? 'sent' : 'error'],
        )
      }
    }
    await tx.query(
      `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
       values ($1,$2,$3,$4,$5::jsonb)`,
      [
        input.campaignId || lead?.campaign_id || null,
        input.leadId || lead?.id || null,
        eventType,
        isDryRun ? 'Flow de prospeccao simulado.' : input.ok ? 'Flow de prospeccao enviado.' : 'Falha ao chamar flow de prospeccao.',
        JSON.stringify({ ...(input.metadata || {}), targetPhone: phone, flow: input.flow, device: input.device || null, code: input.code }),
      ],
    )
  })
}

export async function recordInbound(input: { phone: string; text: string; classification: string; device?: string; leadName?: string; messageId?: string | null; instanceName?: string | null }) {
  await ensureReady()
  const phone = normalizePhone(input.phone)
  if (!phone) throw new Error('Telefone inbound invalido.')
  const instanceName = String(input.instanceName || getProspectionConfig().evolutionInstance || 'unknown')
  const key = inboundKey({ instanceName, messageId: input.messageId || null, phone, text: input.text })
  const normalizedTextHash = textHash(input.text.trim().toLowerCase())
  return withTx(async (tx) => {
    const receivedRows = await tx.query<{ id: string }>(
      `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata,idempotency_key)
       values (null,null,'INBOUND_RECEIVED','Mensagem inbound recebida.',$1::jsonb,$2)
       on conflict (idempotency_key) where idempotency_key is not null do nothing
       returning id`,
      [JSON.stringify({ targetPhone: phone, instanceName, messageId: input.messageId || null, textHash: normalizedTextHash, classification: input.classification }), key],
    )
    if (!receivedRows[0]) {
      await tx.query(
        `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
         values (null,null,'INBOUND_DUPLICATE_IGNORED','Mensagem inbound duplicada ignorada.',$1::jsonb)`,
        [JSON.stringify({ targetPhone: phone, instanceName, messageId: input.messageId || null, idempotencyKey: key })],
      )
      return { lead: null, duplicate: true, action: { type: 'none', code: 'INBOUND_DUPLICATE_IGNORED' } }
    }

    const lockRows = await tx.query<{ locked: boolean }>(`select pg_try_advisory_xact_lock(hashtext($1)) as locked`, [`prospection:phone-lock:${phone}`])
    if (!lockRows[0]?.locked) {
      await tx.query(
        `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
         values (null,null,'PROSPECTION_SKIPPED_LOCKED','Inbound ignorado porque o telefone ja esta em processamento.',$1::jsonb)`,
        [JSON.stringify({ targetPhone: phone, instanceName, messageId: input.messageId || null })],
      )
      return { lead: null, locked: true, action: { type: 'none', code: 'PROSPECTION_SKIPPED_LOCKED' } }
    }
    await tx.query(
      `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
       values (null,null,'INBOUND_LOCK_ACQUIRED','Lock por telefone adquirido.',$1::jsonb)`,
      [JSON.stringify({ targetPhone: phone, instanceName, lockKey: `prospection:phone-lock:${phone}` })],
    )

    const leadRows = await tx.query<ProspectionLead>(
      `select * from prospection_leads where phone_e164=$1 and status not in ('duplicate','invalid_phone') order by created_at desc limit 1 for update`,
      [phone],
    )
    const lead = leadRows[0]
    const now = new Date().toISOString()
    if (lead) {
      const nextStatus = input.classification === 'positive' ? 'responded_positive' : input.classification === 'opt_out' ? 'opt_out' : 'responded'
      await tx.query(
        `update prospection_leads
            set last_response_text=$2,
                responded_at=$3,
                responded_positive_at=case when $5 then coalesce(responded_positive_at,$3) else responded_positive_at end,
                last_inbound_message_id=$6,
                last_inbound_at=$3,
                updated_at=$3,
                status=$4
          where id=$1`,
        [lead.id, input.text, now, nextStatus, input.classification === 'positive', input.messageId || null],
      )
    }
    await tx.query(
      `insert into prospection_messages (campaign_id,lead_id,direction,type,body,status,evolution_message_id,error_message,idempotency_key)
       values ($1,$2,'inbound','manual',$3,$4,$5,null,$6)
       on conflict (idempotency_key) where idempotency_key is not null do nothing`,
      [lead?.campaign_id || null, lead?.id || null, input.text, input.classification, input.messageId || null, key],
    )
    if (input.classification === 'opt_out') {
      await tx.query(`insert into prospection_optouts (phone_e164, reason) values ($1,$2) on conflict (phone_e164) do update set reason=excluded.reason`, [phone, input.text])
    }
    await tx.query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,$3,'Resposta recebida.',$4::jsonb)`, [lead?.campaign_id || null, lead?.id || null, `INBOUND_${String(input.classification).toUpperCase()}`, JSON.stringify({ targetPhone: phone, device: input.device || null, messageId: input.messageId || null })])

    const repeatRows = await tx.query<{ count: string }>(
      `select count(*)::text as count
         from prospection_events
        where event_type='INBOUND_RECEIVED'
          and metadata->>'targetPhone'=$1
          and metadata->>'textHash'=$2
          and created_at >= now() - interval '2 minutes'`,
      [phone, normalizedTextHash],
    )
    if (Number(repeatRows[0]?.count || 0) > 3) {
      if (lead?.campaign_id) {
        await tx.query(`update prospection_campaigns set status='paused', next_send_after=null, updated_at=now() where id=$1 and status='running'`, [lead.campaign_id])
      }
      await tx.query(
        `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
         values ($1,$2,'PROSPECTION_CIRCUIT_BREAKER_TRIGGERED','Inbound repetido em janela curta; campanha pausada preventivamente.',$3::jsonb)`,
        [lead?.campaign_id || null, lead?.id || null, JSON.stringify({ targetPhone: phone, reason: 'three_equal_inbounds_in_2_minutes', textHash: normalizedTextHash })],
      )
      await tx.query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,'INBOUND_LOCK_RELEASED','Lock por telefone liberado ao finalizar transacao.',$3::jsonb)`, [lead?.campaign_id || null, lead?.id || null, JSON.stringify({ targetPhone: phone })])
      return { lead: lead ? toLead(camel(lead)) : null, action: { type: 'none', code: 'PROSPECTION_CIRCUIT_BREAKER_TRIGGERED' } }
    }

    let action: Record<string, unknown> = { type: 'none', code: 'NO_FLOW_TRIGGERED' }
    if (input.classification === 'positive') {
      const recentWelcomeRows = await tx.query<{ count: string }>(
        `select count(*)::text as count
           from prospection_events
          where event_type in ('WELCOME_TRIGGERED','WELCOME_SENT')
            and metadata->>'targetPhone'=$1
            and created_at >= now() - interval '24 hours'`,
        [phone],
      )
      const recentWelcome = isRecent(lead?.welcome_triggered_at, 24) || Number(recentWelcomeRows[0]?.count || 0) > 0
      if (recentWelcome) {
        await tx.query(
          `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
           values ($1,$2,'PROSPECTION_WELCOME_SKIPPED_ALREADY_SENT','Welcome ja reservado/enviado nas ultimas 24h.',$3::jsonb)`,
          [lead?.campaign_id || null, lead?.id || null, JSON.stringify({ targetPhone: phone, welcomeTriggeredAt: lead?.welcome_triggered_at || null })],
        )
        action = { type: 'none', code: 'PROSPECTION_WELCOME_SKIPPED_ALREADY_SENT' }
      } else {
        const attemptsRows = await tx.query<{ count: string }>(
          `select count(*)::text as count
             from prospection_events
            where event_type='WELCOME_TRIGGERED'
              and metadata->>'targetPhone'=$1
              and created_at >= now() - interval '10 minutes'`,
          [phone],
        )
        if (Number(attemptsRows[0]?.count || 0) > 1) {
          if (lead?.campaign_id) {
            await tx.query(`update prospection_campaigns set status='paused', next_send_after=null, updated_at=now() where id=$1 and status='running'`, [lead.campaign_id])
          }
          await tx.query(
            `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
             values ($1,$2,'PROSPECTION_CIRCUIT_BREAKER_TRIGGERED','Mais de uma tentativa de welcome em 10 minutos.',$3::jsonb)`,
            [lead?.campaign_id || null, lead?.id || null, JSON.stringify({ targetPhone: phone, reason: 'welcome_attempts_10m', attempts: Number(attemptsRows[0]?.count || 0) })],
          )
          action = { type: 'none', code: 'PROSPECTION_CIRCUIT_BREAKER_TRIGGERED' }
        } else {
          if (lead) {
            await tx.query(
              `update prospection_leads
                  set welcome_triggered_at=$2,
                      welcome_status='pending',
                      active_flow_type='welcome',
                      updated_at=$2
                where id=$1`,
              [lead.id, now],
            )
          }
          const welcomeKey = `prospection:welcome:${phone}`
          await tx.query(
            `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata,idempotency_key)
             values ($1,$2,'WELCOME_TRIGGERED','Welcome reservado para envio.',$3::jsonb,$4)
             on conflict (idempotency_key) where idempotency_key is not null do nothing`,
            [lead?.campaign_id || null, lead?.id || null, JSON.stringify({ targetPhone: phone, instanceName, idempotencyKey: welcomeKey }), flowWindowKey('welcome', phone)],
          )
          action = { type: 'welcome', code: 'WELCOME_TRIGGERED', phone, name: lead?.name || input.leadName || '', idempotencyKey: welcomeKey, leadId: lead?.id || null, campaignId: lead?.campaign_id || null, instanceName }
        }
      }
    } else if (input.classification === 'device' && input.device) {
      const recentInstallRows = await tx.query<{ count: string }>(
        `select count(*)::text as count
           from prospection_events
          where event_type in ('INSTALL_TRIGGERED','INSTALL_SENT')
            and metadata->>'targetPhone'=$1
            and metadata->>'device'=$2
            and created_at >= now() - interval '24 hours'`,
        [phone, input.device],
      )
      const recentInstall = (
        isRecent(lead?.install_sent_at, 24) &&
        String(lead?.install_device || '') === input.device
      ) || Number(recentInstallRows[0]?.count || 0) > 0
      if (recentInstall) {
        await tx.query(
          `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata)
           values ($1,$2,'INSTALL_SKIPPED_ALREADY_SENT','Install ja reservado/enviado para este aparelho nas ultimas 24h.',$3::jsonb)`,
          [lead?.campaign_id || null, lead?.id || null, JSON.stringify({ targetPhone: phone, device: input.device })],
        )
        action = { type: 'none', code: 'INSTALL_SKIPPED_ALREADY_SENT', device: input.device }
      } else {
        const installKey = `prospection:install:${phone}:${String(input.device).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        if (lead) {
          await tx.query(
            `update prospection_leads
                set install_sent_at=$2,
                    install_device=$3,
                    install_status='pending',
                    active_flow_type='install',
                    welcome_status=case when welcome_status='pending' then 'cancelled' else welcome_status end,
                    updated_at=$2
              where id=$1`,
            [lead.id, now, input.device],
          )
        }
        await tx.query(
          `insert into prospection_events (campaign_id,lead_id,event_type,message,metadata,idempotency_key)
           values ($1,$2,'INSTALL_TRIGGERED','Install reservado para envio.',$3::jsonb,$4)
           on conflict (idempotency_key) where idempotency_key is not null do nothing`,
          [lead?.campaign_id || null, lead?.id || null, JSON.stringify({ targetPhone: phone, instanceName, device: input.device, idempotencyKey: installKey, cancelledWelcome: true }), flowWindowKey('install', phone, input.device)],
        )
        action = { type: 'install', code: 'INSTALL_TRIGGERED', phone, name: lead?.name || input.leadName || '', device: input.device, idempotencyKey: installKey, leadId: lead?.id || null, campaignId: lead?.campaign_id || null, instanceName }
      }
    }

    await tx.query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,'INBOUND_LOCK_RELEASED','Lock por telefone liberado ao finalizar transacao.',$3::jsonb)`, [lead?.campaign_id || null, lead?.id || null, JSON.stringify({ targetPhone: phone })])
    const rows = lead ? await tx.query<ProspectionLead>(`select * from prospection_leads where id=$1 limit 1`, [lead.id]) : []
    return { lead: rows[0] ? toLead(camel(rows[0])) : null, action }
  })
}

export async function authorizeRealRecipient(input: { phone: string; flow?: string; source?: string }) {
  await ensureReady()
  const config = getProspectionConfig()
  const phone = normalizePhone(input.phone)
  if (!phone) return { ok: false, allowed: false, code: 'INVALID_PHONE', reason: 'Telefone invalido.' }
  if (config.connectedInstancePhone && phone === config.connectedInstancePhone) {
    return { ok: false, allowed: false, code: 'PROSPECTION_BLOCKED_SELF_TARGET', reason: 'Telefone da propria instancia.' }
  }
  const rows = await query<{
    lead_id: string
    lead_status: string
    campaign_id: string
    campaign_name: string
    campaign_status: string
    instance_name: string
    optout_id: string | null
  }>(
    `select
        l.id as lead_id,
        l.status as lead_status,
        c.id as campaign_id,
        c.name as campaign_name,
        c.status as campaign_status,
        c.instance_name as instance_name,
        o.id as optout_id
       from prospection_leads l
       join prospection_campaigns c on c.id = l.campaign_id
       left join prospection_optouts o on o.phone_e164 = l.phone_e164
      where l.phone_e164=$1
        and l.status not in ('duplicate','invalid_phone','opt_out')
      order by l.created_at desc
      limit 1`,
    [phone],
  )
  const row = rows[0]
  if (!row) return { ok: false, allowed: false, code: 'PROSPECTION_BLOCKED_NOT_IMPORTED', reason: 'Telefone nao existe em lote importado valido.' }
  if (row.optout_id) return { ok: false, allowed: false, code: 'PROSPECTION_BLOCKED_OPTOUT', reason: 'Telefone em opt-out.' }
  if (row.instance_name !== config.evolutionInstance) {
    return {
      ok: false,
      allowed: false,
      code: 'PROSPECTION_BLOCKED_WRONG_INSTANCE',
      reason: 'Campanha usa instancia diferente da prospeccao.',
      phone,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      leadId: row.lead_id,
      instanceName: row.instance_name,
      expectedInstance: config.evolutionInstance,
    }
  }
  return {
    ok: true,
    allowed: true,
    code: 'PROSPECTION_RECIPIENT_AUTHORIZED',
    phone,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    campaignStatus: row.campaign_status,
    leadId: row.lead_id,
    leadStatus: row.lead_status,
    instanceName: row.instance_name,
    flow: input.flow || null,
    source: input.source || null,
  }
}

export async function cleanupTestDryRunData() {
  await ensureReady()
  return withTx(async (tx) => {
    const campaignRows = await tx.query<{ id: string }>(
      `select distinct c.id
         from prospection_campaigns c
         left join prospection_events e on e.campaign_id = c.id
         left join prospection_messages m on m.campaign_id = c.id
        where lower(c.name) like any (array['%teste%','%test%','%dry-run%','%dryrun%','%mock%','%sample%'])
           or e.event_type like '%dry_run%'
           or e.metadata::text ilike any (array['%dryrun%','%dry-run%','%mock%','%sample%','%leads_teste%'])
           or m.status = 'dry_run'`,
    )
    const ids = campaignRows.map((row) => row.id)
    if (!ids.length) return { campaigns: 0, leads: 0, messages: 0, events: 0, optouts: 0 }
    const events = await tx.query<{ count: string }>(`delete from prospection_events where campaign_id = any($1::uuid[]) returning 1`, [ids])
    const messages = await tx.query<{ count: string }>(`delete from prospection_messages where campaign_id = any($1::uuid[]) returning 1`, [ids])
    const leads = await tx.query<{ count: string }>(`delete from prospection_leads where campaign_id = any($1::uuid[]) returning 1`, [ids])
    const campaigns = await tx.query<{ count: string }>(`delete from prospection_campaigns where id = any($1::uuid[]) returning 1`, [ids])
    return {
      campaigns: campaigns.length,
      leads: leads.length,
      messages: messages.length,
      events: events.length,
      optouts: 0,
    }
  })
}

export async function getDbSnapshot() {
  await ensureReady()
  const [campaigns, leads, messages, optouts, templates, events] = await Promise.all([
    query<ProspectionCampaign>(`select * from prospection_campaigns order by created_at desc`),
    query<ProspectionLead>(`select * from prospection_leads order by created_at desc`),
    query<ProspectionMessage>(`select * from prospection_messages order by created_at desc`),
    query<{ id: string; phone_e164: string; reason: string; created_at: string }>(`select * from prospection_optouts order by created_at desc`),
    query<ProspectionTemplate>(`select * from prospection_templates order by id asc`),
    query<ProspectionEvent>(`select * from prospection_events order by created_at desc`),
  ])
  return { campaigns, leads, messages, optouts, templates, events }
}
