import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getProspectionConfig } from './config'
import { normalizePhone } from './phone'
import { defaultTemplates, renderTemplate } from './templates'
import type {
  ImportSummary,
  LeadStatus,
  ProspectionCampaign,
  ProspectionDb,
  ProspectionEvent,
  ProspectionLead,
  ProspectionMessage,
  ProspectionOptout,
  ProspectionTemplate,
} from './types'

const emptyDb = (): ProspectionDb => ({
  campaigns: [],
  leads: [],
  messages: [],
  optouts: [],
  templates: defaultTemplates,
  events: [],
})

const id = () => crypto.randomUUID()
const now = () => new Date().toISOString()

function storagePath() {
  const configured = getProspectionConfig().storageFile
  return path.isAbsolute(configured) ? configured : path.join(/* turbopackIgnore: true */ process.cwd(), configured)
}

async function ensureStorage() {
  const file = storagePath()
  await fs.mkdir(path.dirname(file), { recursive: true })
  try {
    await fs.access(file)
  } catch {
    await fs.writeFile(file, JSON.stringify(emptyDb(), null, 2), { mode: 0o600 })
  }
}

async function readDb(): Promise<ProspectionDb> {
  await ensureStorage()
  const raw = await fs.readFile(storagePath(), 'utf8')
  const parsed = JSON.parse(raw) as Partial<ProspectionDb>
  return {
    campaigns: parsed.campaigns || [],
    leads: parsed.leads || [],
    messages: parsed.messages || [],
    optouts: parsed.optouts || [],
    templates: parsed.templates?.length ? parsed.templates : defaultTemplates,
    events: parsed.events || [],
  }
}

async function writeDb(db: ProspectionDb) {
  await ensureStorage()
  await fs.writeFile(storagePath(), JSON.stringify(db, null, 2), { mode: 0o600 })
}

async function withLock<T>(fn: (db: ProspectionDb) => Promise<T>) {
  const lockFile = `${storagePath()}.lock`
  await fs.mkdir(path.dirname(lockFile), { recursive: true })
  let handle: fs.FileHandle | null = null
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      handle = await fs.open(lockFile, 'wx')
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  if (!handle) throw new Error('Nao foi possivel obter lock da prospeccao.')
  try {
    const db = await readDb()
    const result = await fn(db)
    await writeDb(db)
    return result
  } finally {
    await handle.close().catch(() => null)
    await fs.unlink(lockFile).catch(() => null)
  }
}

export async function getDbSnapshot() {
  return readDb()
}

export async function createCampaign(input?: Partial<ProspectionCampaign>) {
  const config = getProspectionConfig()
  return withLock(async (db) => {
    const timestamp = now()
    const campaign: ProspectionCampaign = {
      id: id(),
      name: input?.name || `Campanha ${new Date().toLocaleDateString('pt-BR')}`,
      status: input?.status || 'draft',
      instance_name: input?.instance_name || config.evolutionInstance,
      rate_limit_count: input?.rate_limit_count || config.defaultBatchLimit,
      rate_limit_window_minutes: input?.rate_limit_window_minutes || config.defaultWindowMinutes,
      min_delay_seconds: input?.min_delay_seconds || config.defaultMinDelaySeconds,
      max_delay_seconds: input?.max_delay_seconds || config.defaultMaxDelaySeconds,
      allowed_start_time: input?.allowed_start_time || config.allowedStartTime,
      allowed_end_time: input?.allowed_end_time || config.allowedEndTime,
      next_send_after: input?.next_send_after || null,
      created_at: timestamp,
      updated_at: timestamp,
    }
    db.campaigns.unshift(campaign)
    event(db, { campaign_id: campaign.id, event_type: 'campaign_created', message: 'Campanha criada.', metadata: {} })
    return campaign
  })
}

export async function getOrCreateDraftCampaign() {
  const db = await readDb()
  const existing = db.campaigns.find((campaign) => ['draft', 'paused', 'running'].includes(campaign.status))
  if (existing) return existing
  return createCampaign()
}

export async function updateCampaignStatus(campaignId: string, status: ProspectionCampaign['status']) {
  return withLock(async (db) => {
    const campaign = db.campaigns.find((item) => item.id === campaignId)
    if (!campaign) throw new Error('Campanha nao encontrada.')
    campaign.status = status
    campaign.updated_at = now()
    if (status === 'running') {
      const firstQueued = db.leads.find((lead) => lead.campaign_id === campaignId && lead.status === 'queued')
      if (firstQueued && !firstQueued.scheduled_at) {
        firstQueued.status = 'scheduled'
        firstQueued.scheduled_at = now()
        firstQueued.updated_at = now()
      }
    }
    event(db, { campaign_id: campaign.id, event_type: `campaign_${status}`, message: `Campanha alterada para ${status}.`, metadata: {} })
    return campaign
  })
}

export async function listTemplates() {
  const db = await readDb()
  return db.templates.sort((a, b) => a.weight - b.weight)
}

export async function updateTemplate(templateId: number, patch: Partial<ProspectionTemplate>) {
  return withLock(async (db) => {
    const template = db.templates.find((item) => item.id === templateId)
    if (!template) throw new Error('Template nao encontrado.')
    Object.assign(template, patch, { updated_at: now() })
    event(db, { event_type: 'template_updated', message: `Template ${templateId} atualizado.`, metadata: { templateId } })
    return template
  })
}

function event(db: ProspectionDb, input: Omit<ProspectionEvent, 'id' | 'created_at'>) {
  db.events.unshift({ id: id(), created_at: now(), ...input })
}

export async function isActiveClient(phone: string) {
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

export async function importRows(rows: Array<Record<string, unknown>>, sourceFileName: string, campaignId?: string): Promise<ImportSummary> {
  const campaign = campaignId ? (await readDb()).campaigns.find((item) => item.id === campaignId) : await getOrCreateDraftCampaign()
  if (!campaign) throw new Error('Campanha nao encontrada.')

  const activeChecks = new Map<string, boolean>()
  const activeClient = async (phone: string) => {
    if (!activeChecks.has(phone)) activeChecks.set(phone, await isActiveClient(phone))
    return activeChecks.get(phone) || false
  }

  return withLock(async (db) => {
    const summary: ImportSummary = {
      imported: rows.length,
      valid: 0,
      queued: 0,
      duplicates: 0,
      invalid: 0,
      optOutIgnored: 0,
      alreadySent: 0,
      activeClientsBlocked: 0,
      campaignId: campaign.id,
    }
    const seenInFile = new Set<string>()
    for (const row of rows) {
      const name = pick(row, ['Nome', 'name', 'cliente', 'contato'])
      const phoneRaw = pick(row, ['Telefone 1', 'Telefone', 'Celular', 'WhatsApp', 'phone'])
      const phone = normalizePhone(phoneRaw)
      const base = baseLead(campaign.id, name, phoneRaw, phone, sourceFileName, row)
      if (!phone) {
        base.status = 'invalid_phone'
        base.error_message = 'Telefone invalido.'
        summary.invalid += 1
      } else if (seenInFile.has(phone) || db.leads.some((lead) => lead.phone_e164 === phone && !['invalid_phone', 'duplicate'].includes(lead.status))) {
        base.status = 'duplicate'
        base.error_message = 'Telefone duplicado ou ja importado.'
        summary.duplicates += 1
      } else if (db.optouts.some((optout) => optout.phone_e164 === phone)) {
        base.status = 'opt_out'
        base.error_message = 'Telefone em opt-out global.'
        summary.optOutIgnored += 1
      } else if (db.messages.some((message) => message.direction === 'outbound' && db.leads.find((lead) => lead.id === message.lead_id)?.phone_e164 === phone)) {
        base.status = 'duplicate'
        base.error_message = 'Telefone ja recebeu abordagem anterior.'
        summary.alreadySent += 1
      } else if (await activeClient(phone)) {
        base.status = 'duplicate'
        base.error_message = 'Telefone ja consta como cliente ativo/teste ativo.'
        summary.activeClientsBlocked += 1
      } else {
        base.status = 'queued'
        summary.valid += 1
        summary.queued += 1
      }
      seenInFile.add(phone)
      db.leads.unshift(base)
    }
    event(db, { campaign_id: campaign.id, event_type: 'leads_imported', message: 'Arquivo de leads importado.', metadata: { sourceFileName, summary } })
    return summary
  })
}

function baseLead(campaignId: string, name: string, phoneRaw: string, phone: string, sourceFileName: string, row: Record<string, unknown>): ProspectionLead {
  const timestamp = now()
  return {
    id: id(),
    campaign_id: campaignId,
    name,
    phone_raw: phoneRaw,
    phone_e164: phone,
    email: pick(row, ['E-mail', 'email']),
    city: pick(row, ['Cidade', 'city']),
    uf: pick(row, ['UF', 'uf']),
    source_file_name: sourceFileName,
    status: 'imported',
    template_id: null,
    message_preview: null,
    scheduled_at: null,
    sent_at: null,
    responded_at: null,
    last_response_text: null,
    send_attempts: 0,
    error_message: null,
    metadata: { raw: row },
    created_at: timestamp,
    updated_at: timestamp,
  }
}

export async function listLeads(input?: { status?: string; page?: number; pageSize?: number }) {
  const db = await readDb()
  const page = Math.max(1, input?.page || 1)
  const pageSize = Math.min(100, Math.max(1, input?.pageSize || 50))
  const filtered = input?.status ? db.leads.filter((lead) => lead.status === input.status) : db.leads
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
  }
}

export async function getQueueSummary() {
  const db = await readDb()
  const activeCampaign = db.campaigns.find((campaign) => ['running', 'paused', 'draft'].includes(campaign.status)) || null
  const current = db.leads.find((lead) => lead.status === 'sending') || null
  const upcoming = db.leads
    .filter((lead) => ['queued', 'scheduled'].includes(lead.status))
    .sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')))
    .slice(0, 3)
  const lastOutbound = db.messages
    .filter((message) => message.direction === 'outbound' && message.type === 'initial')
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
  const lastSent = lastOutbound ? db.leads.find((lead) => lead.id === lastOutbound.lead_id) || null : null
  return { activeCampaign, current, upcoming, lastSent }
}

export async function getStatus() {
  const db = await readDb()
  const activeCampaign = db.campaigns.find((campaign) => ['running', 'paused', 'draft'].includes(campaign.status)) || null
  const today = new Date().toISOString().slice(0, 10)
  const stats = {
    imported: db.leads.length,
    queued: db.leads.filter((lead) => ['queued', 'scheduled'].includes(lead.status)).length,
    sentToday: db.leads.filter((lead) => lead.sent_at?.startsWith(today)).length,
    responded: db.leads.filter((lead) => ['responded', 'responded_positive'].includes(lead.status)).length,
    optOut: db.leads.filter((lead) => lead.status === 'opt_out').length,
    nextSend: db.leads
      .filter((lead) => ['scheduled', 'queued'].includes(lead.status))
      .sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')))[0]?.scheduled_at || null,
  }
  return { stats, activeCampaign, flags: getProspectionConfig() }
}

export function secondsUntilNext(dateIso?: string | null) {
  if (!dateIso) return null
  const diff = Math.ceil((new Date(dateIso).getTime() - Date.now()) / 1000)
  return Math.max(0, diff)
}

function randomDelaySeconds(campaign: ProspectionCampaign) {
  const min = Math.min(campaign.min_delay_seconds, campaign.max_delay_seconds)
  const max = Math.max(campaign.min_delay_seconds, campaign.max_delay_seconds)
  return Math.floor(min + Math.random() * (max - min + 1))
}

function isWithinAllowedWindow(campaign: ProspectionCampaign, date = new Date()) {
  const current = date.toTimeString().slice(0, 5)
  return current >= campaign.allowed_start_time && current <= campaign.allowed_end_time
}

export async function reserveNextLead() {
  return withLock(async (db) => {
    const campaign = db.campaigns.find((item) => item.status === 'running')
    if (!campaign) return { ok: false, code: 'NO_RUNNING_CAMPAIGN' as const }
    if (!isWithinAllowedWindow(campaign)) return { ok: false, code: 'OUTSIDE_ALLOWED_WINDOW' as const }

    const cutoff = new Date(Date.now() - campaign.rate_limit_window_minutes * 60 * 1000).toISOString()
    const sentInWindow = db.messages.filter((message) =>
      message.campaign_id === campaign.id &&
      message.direction === 'outbound' &&
      message.type === 'initial' &&
      message.created_at >= cutoff
    ).length
    if (sentInWindow >= campaign.rate_limit_count) return { ok: false, code: 'RATE_LIMITED' as const }

    const staleCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    for (const lead of db.leads.filter((item) => item.status === 'sending' && item.updated_at < staleCutoff)) {
      lead.status = 'scheduled'
      lead.error_message = 'Envio anterior expirou e foi liberado.'
      lead.updated_at = now()
    }

    const dueLead = db.leads
      .filter((lead) => lead.campaign_id === campaign.id && ['queued', 'scheduled'].includes(lead.status as LeadStatus))
      .sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')))
      .find((lead) => !lead.scheduled_at || new Date(lead.scheduled_at).getTime() <= Date.now())
    if (!dueLead) return { ok: false, code: 'NO_DUE_LEAD' as const }
    if (db.optouts.some((optout) => optout.phone_e164 === dueLead.phone_e164)) {
      dueLead.status = 'opt_out'
      dueLead.updated_at = now()
      return { ok: false, code: 'LEAD_OPT_OUT' as const }
    }
    const templatePool = db.templates.filter((template) => template.active)
    const template = templatePool[(dueLead.send_attempts + db.messages.length) % templatePool.length] || defaultTemplates[0]
    dueLead.status = 'sending'
    dueLead.template_id = template.id
    dueLead.message_preview = renderTemplate(template.body, dueLead.name)
    dueLead.send_attempts += 1
    dueLead.updated_at = now()
    event(db, { campaign_id: campaign.id, lead_id: dueLead.id, event_type: 'lead_reserved', message: 'Lead reservado para envio.', metadata: { templateId: template.id } })
    return { ok: true, campaign, lead: dueLead, template }
  })
}

export async function completeSend(input: {
  campaignId: string
  leadId: string
  body: string
  templateId: number
  status: 'sent' | 'dry_run'
  evolutionMessageId?: string | null
}) {
  return withLock(async (db) => {
    const lead = db.leads.find((item) => item.id === input.leadId)
    const campaign = db.campaigns.find((item) => item.id === input.campaignId)
    if (!lead || !campaign) throw new Error('Lead/campanha nao encontrado.')
    const timestamp = now()
    lead.status = 'sent'
    lead.sent_at = timestamp
    lead.updated_at = timestamp
    lead.error_message = null
    const message: ProspectionMessage = {
      id: id(),
      campaign_id: campaign.id,
      lead_id: lead.id,
      direction: 'outbound',
      type: 'initial',
      template_id: input.templateId,
      body: input.body,
      status: input.status,
      evolution_message_id: input.evolutionMessageId || null,
      error_message: null,
      created_at: timestamp,
    }
    db.messages.unshift(message)
    const nextLead = db.leads.find((item) => item.campaign_id === campaign.id && item.status === 'queued')
    if (nextLead) {
      nextLead.status = 'scheduled'
      nextLead.scheduled_at = new Date(Date.now() + randomDelaySeconds(campaign) * 1000).toISOString()
      nextLead.updated_at = timestamp
      campaign.next_send_after = nextLead.scheduled_at
    } else {
      campaign.next_send_after = null
      if (!db.leads.some((item) => item.campaign_id === campaign.id && ['queued', 'scheduled', 'sending'].includes(item.status))) {
        campaign.status = 'completed'
      }
    }
    campaign.updated_at = timestamp
    event(db, { campaign_id: campaign.id, lead_id: lead.id, event_type: input.status === 'dry_run' ? 'send_dry_run' : 'send_sent', message: 'Abordagem inicial registrada.', metadata: { messageId: message.id } })
    return { lead, message, campaign }
  })
}

export async function failSend(input: { campaignId: string; leadId: string; error: string }) {
  return withLock(async (db) => {
    const lead = db.leads.find((item) => item.id === input.leadId)
    if (!lead) throw new Error('Lead nao encontrado.')
    lead.status = 'error'
    lead.error_message = input.error
    lead.updated_at = now()
    event(db, { campaign_id: input.campaignId, lead_id: input.leadId, event_type: 'send_error', message: 'Falha ao enviar abordagem.', metadata: { error: input.error } })
    return lead
  })
}

export async function recordInbound(input: { phone: string; text: string; classification: string; device?: string; leadName?: string }) {
  const phone = normalizePhone(input.phone)
  if (!phone) throw new Error('Telefone inbound invalido.')
  return withLock(async (db) => {
    const lead = db.leads
      .filter((item) => item.phone_e164 === phone)
      .sort((a, b) => {
        const score = (status: LeadStatus) => ['duplicate', 'invalid_phone'].includes(status) ? 1 : 0
        return score(a.status) - score(b.status) || String(b.created_at).localeCompare(String(a.created_at))
      })[0]
    const timestamp = now()
    if (lead) {
      lead.last_response_text = input.text
      lead.responded_at = timestamp
      lead.updated_at = timestamp
      lead.status = input.classification === 'positive' ? 'responded_positive' : input.classification === 'opt_out' ? 'opt_out' : 'responded'
    }
    const message: ProspectionMessage = {
      id: id(),
      campaign_id: lead?.campaign_id || null,
      lead_id: lead?.id || null,
      direction: 'inbound',
      type: 'manual',
      template_id: null,
      body: input.text,
      status: input.classification,
      evolution_message_id: null,
      error_message: null,
      created_at: timestamp,
    }
    db.messages.unshift(message)
    if (input.classification === 'opt_out' && !db.optouts.some((optout) => optout.phone_e164 === phone)) {
      const optout: ProspectionOptout = { id: id(), phone_e164: phone, reason: input.text, created_at: timestamp }
      db.optouts.unshift(optout)
    }
    event(db, { campaign_id: lead?.campaign_id || null, lead_id: lead?.id || null, event_type: `inbound_${input.classification}`, message: 'Resposta recebida.', metadata: { device: input.device || null } })
    return { lead, message }
  })
}
