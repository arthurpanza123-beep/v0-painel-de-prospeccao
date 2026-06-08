import { Pool } from 'pg'
import { getProspectionConfig } from './config'
import { renderTemplate, defaultTemplates } from './templates'
import { normalizePhone } from './phone'
import type {
  ImportSummary,
  ProspectionCampaign,
  ProspectionEvent,
  ProspectionLead,
  ProspectionMessage,
  ProspectionTemplate,
} from './types'

const camel = (row: any): Record<string, unknown> => row

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
    last_response_text: row.last_response_text ? String(row.last_response_text) : null,
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
    const rows = await tx.query<ProspectionCampaign>(
      `update prospection_campaigns set status=$2, updated_at=now() where id=$1 returning *`,
      [campaignId, status],
    )
    const campaign = rows[0]
    if (!campaign) throw new Error('Campanha nao encontrada.')
    if (status === 'running') {
      const queued = await tx.query<{ id: string }>(
        `select id from prospection_leads where campaign_id=$1 and status='queued' order by created_at asc limit 1`,
        [campaignId],
      )
      if (queued[0]) {
        await tx.query(`update prospection_leads set status='scheduled', scheduled_at=now(), updated_at=now() where id=$1`, [queued[0].id])
      }
    }
    return toCampaign(camel(campaign))
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

export async function importRows(rows: Array<Record<string, unknown>>, sourceFileName: string, campaignId?: string): Promise<ImportSummary> {
  await ensureReady()
  const campaign = campaignId ? (await query<ProspectionCampaign>(`select * from prospection_campaigns where id=$1 limit 1`, [campaignId]))[0] : await getOrCreateDraftCampaign()
  if (!campaign) throw new Error('Campanha nao encontrada.')
  const summary: ImportSummary = { imported: rows.length, valid: 0, queued: 0, duplicates: 0, invalid: 0, optOutIgnored: 0, alreadySent: 0, activeClientsBlocked: 0, campaignId: campaign.id }
  const seen = new Set<string>()
  return withTx(async (tx) => {
    for (const row of rows) {
      const pick = (aliases: string[]) => {
        const wanted = aliases.map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''))
        const keys = Object.keys(row).filter((candidate) => wanted.includes(candidate.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')))
        const key = keys.find((candidate) => String(row[candidate] || '').trim()) || keys[0]
        return key ? String(row[key] || '').trim() : ''
      }
      const name = pick(['Nome', 'name', 'cliente', 'contato'])
      const phoneRaw = pick(['Telefone 1', 'Telefone', 'Celular', 'WhatsApp', 'phone'])
      const phone = normalizePhone(phoneRaw)
      const base = {
        campaign_id: campaign.id,
        name,
        phone_raw: phoneRaw,
        phone_e164: phone,
        email: pick(['E-mail', 'email']) || null,
        city: pick(['Cidade', 'city']) || null,
        uf: pick(['UF', 'uf']) || null,
        source_file_name: sourceFileName,
        metadata: { raw: row },
      }
      const payload = { ...base, status: 'imported', template_id: null, message_preview: null, scheduled_at: null, sent_at: null, responded_at: null, last_response_text: null, send_attempts: 0, error_message: null }
      if (!phone) {
        summary.invalid += 1
        await tx.query(
          `insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata)
           values ($1,$2,$3,$4,$5,$6,$7,$8,'invalid_phone',$9,$10::jsonb)`,
          [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone invalido.', JSON.stringify({ raw: row })],
        )
        continue
      }
      if (seen.has(phone)) {
        summary.duplicates += 1
        await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'duplicate',$9,$10::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone duplicado ou ja importado.', JSON.stringify({ raw: row })])
        continue
      }
      const optout = await tx.query<{ id: string }>(`select id from prospection_optouts where phone_e164=$1 limit 1`, [phone])
      if (optout[0]) {
        summary.optOutIgnored += 1
        await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'opt_out',$9,$10::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone em opt-out global.', JSON.stringify({ raw: row })])
        continue
      }
      const existingLead = await tx.query<{ id: string }>(`select id from prospection_leads where phone_e164=$1 and status not in ('invalid_phone','duplicate') limit 1`, [phone])
      if (existingLead[0]) {
        summary.duplicates += 1
        await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'duplicate',$9,$10::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone duplicado ou ja importado.', JSON.stringify({ raw: row })])
        continue
      }
      const sent = await tx.query<{ id: string }>(`select m.id from prospection_messages m join prospection_leads l on l.id = m.lead_id where m.direction='outbound' and l.phone_e164=$1 limit 1`, [phone])
      if (sent[0]) {
        summary.alreadySent += 1
        await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'duplicate',$9,$10::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone ja recebeu abordagem anterior.', JSON.stringify({ raw: row })])
        continue
      }
      if (await isActiveClient(phone)) {
        summary.activeClientsBlocked += 1
        await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,error_message,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'duplicate',$9,$10::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, 'Telefone ja consta como cliente ativo/teste ativo.', JSON.stringify({ raw: row })])
        continue
      }
      summary.valid += 1
      summary.queued += 1
      seen.add(phone)
      await tx.query(`insert into prospection_leads (campaign_id,name,phone_raw,phone_e164,email,city,uf,source_file_name,status,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,'queued',$9::jsonb)`, [campaign.id, name, phoneRaw, phone, base.email, base.city, base.uf, sourceFileName, JSON.stringify({ raw: row })])
    }
    await tx.query(`insert into prospection_events (campaign_id,event_type,message,metadata) values ($1,'leads_imported','Arquivo de leads importado.',$2::jsonb)`, [campaign.id, JSON.stringify({ sourceFileName, summary })])
    return summary
  })
}

export async function listLeads(input?: { status?: string; page?: number; pageSize?: number }) {
  await ensureReady()
  const page = Math.max(1, input?.page || 1)
  const pageSize = Math.min(100, Math.max(1, input?.pageSize || 50))
  const where = input?.status ? 'where status=$1' : ''
  const params = input?.status ? [input.status, pageSize, (page - 1) * pageSize] : [pageSize, (page - 1) * pageSize]
  const rows = await query<ProspectionLead>(
    `select * from prospection_leads ${where} order by created_at desc limit $${input?.status ? 2 : 1} offset $${input?.status ? 3 : 2}`,
    params,
  )
  const countRows = await query<{ count: string }>(`select count(*)::text as count from prospection_leads ${where}`, input?.status ? [input.status] : [])
  return { items: rows.map((row) => toLead(camel(row))), total: Number(countRows[0]?.count || 0), page, pageSize }
}

export async function getQueueSummary() {
  await ensureReady()
  const campaigns = await query<ProspectionCampaign>(`select * from prospection_campaigns where status in ('running','paused','draft') order by created_at desc limit 1`)
  const currentRows = await query<ProspectionLead>(`select * from prospection_leads where status='sending' order by updated_at desc limit 1`)
  const upcomingRows = await query<ProspectionLead>(`select * from prospection_leads where status in ('queued','scheduled') order by coalesce(scheduled_at,created_at) asc limit 3`)
  const lastRows = await query<ProspectionMessage>(`select m.* from prospection_messages m where m.direction='outbound' and m.type='initial' order by m.created_at desc limit 1`)
  const lastLeadRows = lastRows[0]
    ? await query<ProspectionLead>(`select * from prospection_leads where id=$1 limit 1`, [lastRows[0].lead_id])
    : []
  return {
    activeCampaign: campaigns[0] ? toCampaign(camel(campaigns[0])) : null,
    current: currentRows[0] ? toLead(camel(currentRows[0])) : null,
    upcoming: upcomingRows.map((row) => toLead(camel(row))),
    lastSent: lastLeadRows[0] ? toLead(camel(lastLeadRows[0])) : null,
  }
}

export async function getStatus() {
  await ensureReady()
  const [campaignRows, statsRows, nextRows] = await Promise.all([
    query<ProspectionCampaign>(`select * from prospection_campaigns where status in ('running','paused','draft') order by created_at desc limit 1`),
    query<{ imported: string; queued: string; sent_today: string; responded: string; optout: string; next_send: string | null }>(
      `select
        count(*)::text as imported,
        count(*) filter (where status in ('queued','scheduled'))::text as queued,
        count(*) filter (where sent_at::date = current_date)::text as sent_today,
        count(*) filter (where status in ('responded','responded_positive'))::text as responded,
        count(*) filter (where status = 'opt_out')::text as optout,
        min(scheduled_at) filter (where status in ('queued','scheduled'))::text as next_send
       from prospection_leads`,
    ),
    query<{ next_send_after: string | null }>(`select next_send_after::text as next_send_after from prospection_campaigns where status='running' order by updated_at desc limit 1`),
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
    activeCampaign: campaignRows[0] ? toCampaign(camel(campaignRows[0])) : null,
  }
}

export async function reserveNextLead() {
  await ensureReady()
  return withTx(async (tx) => {
    const campaignRows = await tx.query<ProspectionCampaign>(`select * from prospection_campaigns where status='running' order by updated_at desc limit 1`)
    const campaign = campaignRows[0]
    if (!campaign) return { ok: false as const, code: 'NO_RUNNING_CAMPAIGN' as const }
    const cutoff = new Date(Date.now() - campaign.rate_limit_window_minutes * 60 * 1000).toISOString()
    const rateRows = await tx.query<{ count: string }>(
      `select count(*)::text as count from prospection_messages where campaign_id=$1 and direction='outbound' and type='initial' and created_at >= $2`,
      [campaign.id, cutoff],
    )
    if (Number(rateRows[0]?.count || 0) >= campaign.rate_limit_count) return { ok: false as const, code: 'RATE_LIMITED' as const }
    const leadRows = await tx.query<ProspectionLead>(
      `select * from prospection_leads
       where campaign_id=$1 and status in ('queued','scheduled') and coalesce(scheduled_at,created_at) <= now()
       order by coalesce(scheduled_at,created_at) asc
       limit 1
       for update skip locked`,
      [campaign.id],
    )
    const lead = leadRows[0]
    if (!lead) return { ok: false as const, code: 'NO_DUE_LEAD' as const }
    const templateRows = await tx.query<ProspectionTemplate>(`select * from prospection_templates where active=true order by weight asc, id asc`)
    const templates = templateRows.length ? templateRows : defaultTemplates
    const template = templates[(lead.send_attempts + Number(rateRows[0]?.count || 0)) % templates.length] || templates[0]
    const preview = renderTemplate(template.body, lead.name)
    const nextScheduledAt = new Date(Date.now() + (campaign.min_delay_seconds + Math.floor(Math.random() * (campaign.max_delay_seconds - campaign.min_delay_seconds + 1))) * 1000).toISOString()
    await tx.query(`update prospection_leads set status='sending', template_id=$2, message_preview=$3, send_attempts=send_attempts+1, updated_at=now() where id=$1`, [lead.id, template.id, preview])
    await tx.query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,'lead_reserved','Lead reservado para envio.',$3::jsonb)`, [campaign.id, lead.id, JSON.stringify({ templateId: template.id })])
    await tx.query(`update prospection_campaigns set next_send_after=$2, updated_at=now() where id=$1`, [campaign.id, nextScheduledAt])
    return { ok: true as const, campaign: toCampaign(camel(campaign)), lead: toLead(camel({ ...lead, template_id: template.id, message_preview: preview, send_attempts: lead.send_attempts + 1, status: 'sending' })), template }
  })
}

export async function completeSend(input: { campaignId: string; leadId: string; body: string; templateId: number; status: 'sent' | 'dry_run'; evolutionMessageId?: string | null }) {
  await ensureReady()
  return withTx(async (tx) => {
    const now = new Date().toISOString()
    await tx.query(`update prospection_leads set status='sent', sent_at=$2, updated_at=$2, error_message=null where id=$1`, [input.leadId, now])
    await tx.query(`insert into prospection_messages (campaign_id,lead_id,direction,type,template_id,body,status,evolution_message_id,error_message) values ($1,$2,'outbound','initial',$3,$4,$5,$6,null)`, [input.campaignId, input.leadId, input.templateId, input.body, input.status, input.evolutionMessageId || null])
    const next = await tx.query<ProspectionLead>(`select * from prospection_leads where campaign_id=$1 and status='queued' order by created_at asc limit 1`, [input.campaignId])
    if (next[0]) {
      const campaignRows = await tx.query<ProspectionCampaign>(`select * from prospection_campaigns where id=$1 limit 1`, [input.campaignId])
      const campaign = campaignRows[0]
      const delay = campaign ? campaign.min_delay_seconds + Math.floor(Math.random() * (campaign.max_delay_seconds - campaign.min_delay_seconds + 1)) : 160
      const nextAt = new Date(Date.now() + delay * 1000).toISOString()
      await tx.query(`update prospection_leads set status='scheduled', scheduled_at=$2, updated_at=now() where id=$1`, [next[0].id, nextAt])
      await tx.query(`update prospection_campaigns set next_send_after=$2, updated_at=now() where id=$1`, [input.campaignId, nextAt])
    } else {
      await tx.query(`update prospection_campaigns set next_send_after=null, status=case when not exists (select 1 from prospection_leads where campaign_id=$1 and status in ('queued','scheduled','sending')) then 'completed' else status end, updated_at=now() where id=$1`, [input.campaignId])
    }
    await tx.query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,$3,'Abordagem inicial registrada.',$4::jsonb)`, [input.campaignId, input.leadId, input.status === 'dry_run' ? 'send_dry_run' : 'send_sent', JSON.stringify({ messageId: input.evolutionMessageId || null })])
    const leadRows = await tx.query<ProspectionLead>(`select * from prospection_leads where id=$1 limit 1`, [input.leadId])
    const campaignRows = await tx.query<ProspectionCampaign>(`select * from prospection_campaigns where id=$1 limit 1`, [input.campaignId])
    return { lead: toLead(camel(leadRows[0])), campaign: toCampaign(camel(campaignRows[0])), message: { status: input.status, body: input.body, template_id: input.templateId } }
  })
}

export async function failSend(input: { campaignId: string; leadId: string; error: string }) {
  await ensureReady()
  await query(`update prospection_leads set status='error', error_message=$2, updated_at=now() where id=$1`, [input.leadId, input.error])
  await query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,'send_error','Falha ao enviar abordagem.',$3::jsonb)`, [input.campaignId, input.leadId, JSON.stringify({ error: input.error })])
  const rows = await query<ProspectionLead>(`select * from prospection_leads where id=$1 limit 1`, [input.leadId])
  return toLead(camel(rows[0]))
}

export async function recordInbound(input: { phone: string; text: string; classification: string; device?: string; leadName?: string; messageId?: string | null }) {
  await ensureReady()
  const phone = normalizePhone(input.phone)
  if (!phone) throw new Error('Telefone inbound invalido.')
  return withTx(async (tx) => {
    if (input.messageId) {
      const duplicateRows = await tx.query<{ id: string }>(`select id from prospection_messages where direction='inbound' and evolution_message_id=$1 limit 1`, [input.messageId])
      if (duplicateRows[0]) {
        await tx.query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values (null,null,'inbound_duplicate','Mensagem inbound duplicada ignorada.',$1::jsonb)`, [JSON.stringify({ phone, messageId: input.messageId })])
        return { lead: null, duplicate: true }
      }
    }
    const leadRows = await tx.query<ProspectionLead>(
      `select * from prospection_leads where phone_e164=$1 and status not in ('duplicate','invalid_phone') order by created_at desc limit 1`,
      [phone],
    )
    const lead = leadRows[0]
    const now = new Date().toISOString()
    if (lead) {
      const nextStatus = input.classification === 'positive' ? 'responded_positive' : input.classification === 'opt_out' ? 'opt_out' : 'responded'
      await tx.query(`update prospection_leads set last_response_text=$2, responded_at=$3, updated_at=$3, status=$4 where id=$1`, [lead.id, input.text, now, nextStatus])
    }
    await tx.query(`insert into prospection_messages (campaign_id,lead_id,direction,type,body,status,evolution_message_id,error_message) values ($1,$2,'inbound','manual',$3,$4,$5,null)`, [lead?.campaign_id || null, lead?.id || null, input.text, input.classification, input.messageId || null])
    if (input.classification === 'opt_out') {
      await tx.query(`insert into prospection_optouts (phone_e164, reason) values ($1,$2) on conflict (phone_e164) do update set reason=excluded.reason`, [phone, input.text])
    }
    await tx.query(`insert into prospection_events (campaign_id,lead_id,event_type,message,metadata) values ($1,$2,$3,'Resposta recebida.',$4::jsonb)`, [lead?.campaign_id || null, lead?.id || null, `inbound_${input.classification}`, JSON.stringify({ device: input.device || null })])
    const rows = lead ? await tx.query<ProspectionLead>(`select * from prospection_leads where id=$1 limit 1`, [lead.id]) : []
    return { lead: rows[0] ? toLead(camel(rows[0])) : null }
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
