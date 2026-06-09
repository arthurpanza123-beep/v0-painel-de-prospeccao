import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getProspectionConfig } from './config'
import * as postgresBackend from './postgres-backend'
import { normalizePhone } from './phone'
import { defaultTemplates, renderTemplate } from './templates'
import type {
  ImportSummary,
  ImportRowsOptions,
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
const authorizedTestReimportPhones = new Set(['5522988473304', '5522988345946'])

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
  if (postgresBackend.isEnabled()) return postgresBackend.getDbSnapshot()
  return readDb()
}

export async function createCampaign(input?: Partial<ProspectionCampaign>) {
  if (postgresBackend.isEnabled()) return postgresBackend.createCampaign(input)
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
  if (postgresBackend.isEnabled()) return postgresBackend.getOrCreateDraftCampaign()
  const db = await readDb()
  const existing = db.campaigns.find((campaign) => ['draft', 'paused', 'running'].includes(campaign.status))
  if (existing) return existing
  return createCampaign()
}

export async function updateCampaignStatus(campaignId: string, status: ProspectionCampaign['status']) {
  if (postgresBackend.isEnabled()) return postgresBackend.updateCampaignStatus(campaignId, status)
  return withLock(async (db) => {
    const campaign = db.campaigns.find((item) => item.id === campaignId)
    if (!campaign) throw new Error('Campanha nao encontrada.')
    const previousStatus = campaign.status
    if (status === 'running' && !db.leads.some((lead) => lead.campaign_id === campaignId && ['queued', 'scheduled', 'sending'].includes(lead.status))) {
      status = 'completed'
    }
    campaign.status = status
    campaign.updated_at = now()
    if (status === 'running') {
      const staleScheduled = db.leads
        .filter((lead) => lead.campaign_id === campaignId && lead.status === 'scheduled' && (!lead.scheduled_at || new Date(lead.scheduled_at).getTime() <= Date.now()))
        .sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')))[0]
      const firstQueued = staleScheduled || db.leads.find((lead) => lead.campaign_id === campaignId && lead.status === 'queued')
      if (firstQueued) {
        const nextAt = new Date(Date.now() + randomDelaySeconds(campaign) * 1000).toISOString()
        firstQueued.status = 'scheduled'
        firstQueued.scheduled_at = nextAt
        firstQueued.updated_at = now()
        campaign.next_send_after = nextAt
        event(db, { campaign_id: campaign.id, lead_id: firstQueued.id, event_type: 'LEAD_SCHEDULED', message: 'Lead agendado para simulacao.', metadata: { nextSendAt: nextAt } })
        event(db, { campaign_id: campaign.id, event_type: 'NEXT_SEND_RECALCULATED', message: 'Proximo envio recalculado.', metadata: { nextSendAt: nextAt, reason: previousStatus === 'paused' ? 'resume' : 'start' } })
      }
    }
    const eventType = status === 'running'
      ? getProspectionConfig().dryRun || !getProspectionConfig().enabled ? 'CAMPAIGN_STARTED_DRY_RUN' : 'CAMPAIGN_STARTED'
      : status === 'paused'
      ? 'CAMPAIGN_PAUSED'
      : status === 'cancelled'
      ? 'CAMPAIGN_CANCELLED'
      : status === 'completed'
      ? 'QUEUE_EMPTY'
      : `CAMPAIGN_${status.toUpperCase()}`
    event(db, { campaign_id: campaign.id, event_type: eventType, message: `Campanha alterada para ${status}.`, metadata: { previousStatus, status } })
    return campaign
  })
}

export async function listTemplates() {
  if (postgresBackend.isEnabled()) return postgresBackend.listTemplates()
  const db = await readDb()
  return db.templates.sort((a, b) => a.weight - b.weight)
}

export async function updateTemplate(templateId: number, patch: Partial<ProspectionTemplate>) {
  if (postgresBackend.isEnabled()) return postgresBackend.updateTemplate(templateId, patch)
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
  input: { row: number; name: string; phoneRaw: string; phoneE164: string; status: LeadStatus; reason: string; queued?: boolean },
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

export async function importRows(rows: Array<Record<string, unknown>>, sourceFileName: string, options?: string | ImportRowsOptions): Promise<ImportSummary> {
  if (postgresBackend.isEnabled()) return postgresBackend.importRows(rows, sourceFileName, options)
  const campaignId = typeof options === 'string' ? options : options?.campaignId
  const forceTestReimport = typeof options === 'object' ? Boolean(options.forceTestReimport) : false
  const campaign = campaignId ? (await readDb()).campaigns.find((item) => item.id === campaignId) : await getOrCreateDraftCampaign()
  if (!campaign) throw new Error('Campanha nao encontrada.')

  const activeChecks = new Map<string, boolean>()
  const activeClient = async (phone: string) => {
    if (!activeChecks.has(phone)) activeChecks.set(phone, await isActiveClient(phone))
    return activeChecks.get(phone) || false
  }

  return withLock(async (db) => {
    const summary = emptyImportSummary(rows.length, campaign.id)
    const seenInFile = new Set<string>()
    for (const [index, row] of rows.entries()) {
      const name = pick(row, ['Nome', 'name', 'cliente', 'contato'])
      const phoneRaw = pick(row, ['Telefone 1', 'Telefone', 'Celular', 'WhatsApp', 'phone'])
      const phone = normalizePhone(phoneRaw)
      const canForceTestReimport = forceTestReimport && authorizedTestReimportPhones.has(phone)
      const base = baseLead(campaign.id, name, phoneRaw, phone, sourceFileName, row)
      if (canForceTestReimport) base.metadata.forceTestReimport = true
      if (!phone) {
        base.status = 'invalid_phone'
        base.error_message = 'Telefone invalido.'
        summary.invalid += 1
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'invalid_phone', reason: base.error_message })
      } else if (seenInFile.has(phone)) {
        base.status = 'duplicate'
        base.error_message = 'Telefone duplicado ou ja importado.'
        summary.duplicates += 1
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'duplicate', reason: 'Telefone duplicado dentro do arquivo.' })
      } else if (db.optouts.some((optout) => optout.phone_e164 === phone)) {
        base.status = 'opt_out'
        base.error_message = 'Telefone em opt-out global.'
        summary.optOutIgnored += 1
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'opt_out', reason: base.error_message })
      } else if (db.messages.some((message) => message.direction === 'outbound' && db.leads.find((lead) => lead.id === message.lead_id)?.phone_e164 === phone) && !canForceTestReimport) {
        base.status = 'duplicate'
        base.error_message = 'Telefone ja recebeu abordagem anterior.'
        summary.alreadySent += 1
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'duplicate', reason: base.error_message })
      } else if (db.leads.some((lead) => lead.phone_e164 === phone && !['invalid_phone', 'duplicate'].includes(lead.status)) && !canForceTestReimport) {
        base.status = 'duplicate'
        base.error_message = 'Telefone duplicado ou ja importado.'
        summary.duplicates += 1
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'duplicate', reason: base.error_message })
      } else if ((await activeClient(phone)) && !canForceTestReimport) {
        base.status = 'duplicate'
        base.error_message = 'Telefone ja consta como cliente ativo/teste ativo.'
        summary.activeClientsBlocked += 1
        addImportDetail(summary, { row: index + 1, name, phoneRaw, phoneE164: phone, status: 'duplicate', reason: base.error_message })
      } else {
        base.status = 'queued'
        summary.valid += 1
        summary.queued += 1
        if (canForceTestReimport) summary.testReimports += 1
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

function selectedCampaign(db: ProspectionDb, campaignId?: string) {
  if (campaignId) return db.campaigns.find((campaign) => campaign.id === campaignId) || null
  for (const campaign of db.campaigns.filter((item) => ['running', 'paused', 'draft'].includes(item.status))) {
    if (campaign.status === 'running' && !db.leads.some((lead) => lead.campaign_id === campaign.id && ['queued', 'scheduled', 'sending'].includes(lead.status))) {
      campaign.status = 'completed'
      campaign.next_send_after = null
      campaign.updated_at = now()
      continue
    }
    return campaign
  }
  return db.campaigns.find((campaign) => ['completed', 'cancelled'].includes(campaign.status)) || null
}

export async function listLeads(input?: { status?: string; campaignId?: string; page?: number; pageSize?: number }) {
  if (postgresBackend.isEnabled()) return postgresBackend.listLeads(input)
  const db = await readDb()
  const page = Math.max(1, input?.page || 1)
  const pageSize = Math.min(100, Math.max(1, input?.pageSize || 50))
  const filtered = db.leads.filter((lead) =>
    (!input?.status || lead.status === input.status) &&
    (!input?.campaignId || lead.campaign_id === input.campaignId)
  )
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
  }
}

export async function getQueueSummary(input?: { campaignId?: string }) {
  if (postgresBackend.isEnabled()) return postgresBackend.getQueueSummary(input)
  const db = await readDb()
  const activeCampaign = selectedCampaign(db, input?.campaignId)
  if (!activeCampaign) return { activeCampaign: null, current: null, upcoming: [], lastSent: null }
  const current = db.leads.find((lead) => lead.campaign_id === activeCampaign.id && lead.status === 'sending') || null
  const upcoming = db.leads
    .filter((lead) => lead.campaign_id === activeCampaign.id && ['queued', 'scheduled'].includes(lead.status))
    .sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')))
    .slice(0, 3)
  const lastOutbound = db.messages
    .filter((message) => message.campaign_id === activeCampaign.id && message.direction === 'outbound' && message.type === 'initial')
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
  const lastSent = lastOutbound ? db.leads.find((lead) => lead.id === lastOutbound.lead_id) || null : null
  return { activeCampaign, current, upcoming, lastSent }
}

export async function getStatus(input?: { campaignId?: string }) {
  if (postgresBackend.isEnabled()) return postgresBackend.getStatus(input)
  const db = await readDb()
  const activeCampaign = selectedCampaign(db, input?.campaignId)
  if (!activeCampaign) {
    return {
      stats: { imported: 0, queued: 0, sentToday: 0, responded: 0, optOut: 0, nextSend: null },
      activeCampaign: null,
      flags: getProspectionConfig(),
    }
  }
  const campaignLeads = db.leads.filter((lead) => lead.campaign_id === activeCampaign.id)
  const today = new Date().toISOString().slice(0, 10)
  const stats = {
    imported: campaignLeads.length,
    queued: campaignLeads.filter((lead) => ['queued', 'scheduled'].includes(lead.status)).length,
    sentToday: campaignLeads.filter((lead) => lead.sent_at?.startsWith(today)).length,
    responded: campaignLeads.filter((lead) => ['responded', 'responded_positive', 'wrong_number'].includes(lead.status)).length,
    optOut: campaignLeads.filter((lead) => lead.status === 'opt_out').length,
    wrongNumber: campaignLeads.filter((lead) => lead.status === 'wrong_number').length,
    nextSend: campaignLeads
      .filter((lead) => ['scheduled', 'queued'].includes(lead.status) && lead.scheduled_at)
      .sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')))[0]?.scheduled_at || activeCampaign.next_send_after || null,
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

export async function reserveNextLead(input?: { force?: boolean; campaignId?: string }) {
  if (postgresBackend.isEnabled()) return postgresBackend.reserveNextLead(input)
  return withLock(async (db) => {
    const campaign = input?.campaignId
      ? db.campaigns.find((item) => item.id === input.campaignId && ['running', 'draft', 'paused'].includes(item.status))
      : db.campaigns.find((item) => input?.force ? ['running', 'draft', 'paused'].includes(item.status) : item.status === 'running')
    if (!campaign) return { ok: false, code: 'NO_RUNNING_CAMPAIGN' as const }
    if (!input?.force && campaign.status !== 'running') return { ok: false, code: 'NO_RUNNING_CAMPAIGN' as const }
    if (!input?.force && !isWithinAllowedWindow(campaign)) return { ok: false, code: 'OUTSIDE_ALLOWED_WINDOW' as const }

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
      .find((lead) => input?.force || !lead.scheduled_at || new Date(lead.scheduled_at).getTime() <= Date.now())
    if (!dueLead) {
      if (!db.leads.some((lead) => lead.campaign_id === campaign.id && ['queued', 'scheduled', 'sending'].includes(lead.status))) {
        campaign.status = 'completed'
        campaign.next_send_after = null
        campaign.updated_at = now()
        event(db, { campaign_id: campaign.id, event_type: 'QUEUE_EMPTY', message: 'Campanha finalizada por fila vazia.', metadata: {} })
        return { ok: false, code: 'QUEUE_EMPTY_COMPLETED' as const }
      }
      return { ok: false, code: 'NO_DUE_LEAD' as const }
    }
    event(db, { campaign_id: campaign.id, lead_id: dueLead.id, event_type: 'NEXT_SEND_DUE', message: 'Proximo lead liberado para processamento.', metadata: { force: Boolean(input?.force), scheduledAt: dueLead.scheduled_at || null } })
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
    event(db, { campaign_id: campaign.id, lead_id: dueLead.id, event_type: 'LEAD_RESERVED', message: 'Lead reservado para simulacao.', metadata: { templateId: template.id } })
    if (getProspectionConfig().dryRun || !getProspectionConfig().enabled) {
      event(db, { campaign_id: campaign.id, lead_id: dueLead.id, event_type: 'LEAD_DRY_RUN_PROCESSING', message: 'Lead em processamento simulado.', metadata: { templateId: template.id, force: Boolean(input?.force) } })
    }
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
  if (postgresBackend.isEnabled()) return postgresBackend.completeSend(input)
  return withLock(async (db) => {
    const lead = db.leads.find((item) => item.id === input.leadId)
    const campaign = db.campaigns.find((item) => item.id === input.campaignId)
    if (!lead || !campaign) throw new Error('Lead/campanha nao encontrado.')
    const timestamp = now()
    lead.status = input.status === 'dry_run' ? 'dry_run_sent' : 'sent'
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
    if (input.status === 'dry_run') {
      event(db, { campaign_id: campaign.id, lead_id: lead.id, event_type: 'WORKER_SKIPPED_REAL_DISABLED', message: 'Envio real bloqueado; simulacao gravada.', metadata: { dryRun: true, evolutionMessageId: null } })
    }
    const nextLead = db.leads
      .filter((item) => item.campaign_id === campaign.id && ['queued', 'scheduled'].includes(item.status))
      .sort((a, b) => String(a.scheduled_at || a.created_at).localeCompare(String(b.scheduled_at || b.created_at)))[0]
    if (nextLead) {
      nextLead.status = 'scheduled'
      nextLead.scheduled_at = new Date(Date.now() + randomDelaySeconds(campaign) * 1000).toISOString()
      nextLead.updated_at = timestamp
      campaign.next_send_after = nextLead.scheduled_at
      event(db, { campaign_id: campaign.id, lead_id: nextLead.id, event_type: 'LEAD_SCHEDULED', message: 'Lead agendado para simulacao.', metadata: { nextSendAt: nextLead.scheduled_at } })
      event(db, { campaign_id: campaign.id, event_type: 'NEXT_SEND_RECALCULATED', message: 'Proximo envio recalculado.', metadata: { nextSendAt: nextLead.scheduled_at, reason: 'after_send' } })
    } else {
      campaign.next_send_after = null
      if (!db.leads.some((item) => item.campaign_id === campaign.id && ['queued', 'scheduled', 'sending'].includes(item.status))) {
        campaign.status = 'completed'
        event(db, { campaign_id: campaign.id, event_type: 'QUEUE_EMPTY', message: 'Fila finalizada sem leads pendentes.', metadata: {} })
        event(db, { campaign_id: campaign.id, event_type: 'CAMPAIGN_COMPLETED', message: 'Campanha finalizada apos processar a fila.', metadata: {} })
      }
    }
    campaign.updated_at = timestamp
    event(db, { campaign_id: campaign.id, lead_id: lead.id, event_type: input.status === 'dry_run' ? 'LEAD_DRY_RUN_SENT' : 'LEAD_SENT', message: 'Abordagem inicial registrada.', metadata: { messageId: message.id } })
    return { lead, message, campaign }
  })
}

export async function failSend(input: { campaignId: string; leadId: string; error: string }) {
  if (postgresBackend.isEnabled()) return postgresBackend.failSend(input)
  return withLock(async (db) => {
    const lead = db.leads.find((item) => item.id === input.leadId)
    if (!lead) throw new Error('Lead nao encontrado.')
    lead.status = 'error'
    lead.error_message = input.error
    lead.updated_at = now()
    event(db, { campaign_id: input.campaignId, lead_id: input.leadId, event_type: 'send_error', message: 'Falha ao enviar abordagem.', metadata: { error: input.error } })
    event(db, { campaign_id: input.campaignId, lead_id: input.leadId, event_type: 'WORKER_ERROR', message: 'Erro no processamento do worker.', metadata: { error: input.error } })
    return lead
  })
}

export async function recordProspectionEvent(input: { eventType: string; message: string; phone?: string | null; instanceName?: string | null; messageId?: string | null; metadata?: Record<string, unknown>; idempotencyKey?: string | null }) {
  if (postgresBackend.isEnabled()) return postgresBackend.recordProspectionEvent(input)
  return withLock(async (db) => {
    event(db, {
      campaign_id: null,
      lead_id: null,
      event_type: input.eventType,
      message: input.message,
      metadata: {
        ...(input.metadata || {}),
        targetPhone: input.phone ? normalizePhone(input.phone) : null,
        instanceName: input.instanceName || null,
        messageId: input.messageId || null,
        idempotencyKey: input.idempotencyKey || null,
      },
    })
    return { ok: true }
  })
}

export async function recordFlowResult(input: { flow: 'welcome' | 'install'; phone: string; leadId?: string | null; campaignId?: string | null; device?: string | null; ok: boolean; code: string; metadata?: Record<string, unknown> }) {
  if (postgresBackend.isEnabled()) return postgresBackend.recordFlowResult(input)
  return withLock(async (db) => {
    const phone = normalizePhone(input.phone)
    const lead = db.leads.find((item) => item.id === input.leadId) || db.leads.find((item) => item.phone_e164 === phone)
    const isDryRun = input.code === 'WELCOME_DRY_RUN' || input.code === 'INSTALL_DRY_RUN'
    event(db, {
      campaign_id: input.campaignId || lead?.campaign_id || null,
      lead_id: input.leadId || lead?.id || null,
      event_type: input.code === 'PROSPECTION_BLOCKED_NOT_ALLOWLISTED'
        ? 'PROSPECTION_BLOCKED_NOT_ALLOWLISTED'
        : input.code === 'PROSPECTION_PANEL2_TRIGGER_DISABLED'
        ? 'PROSPECTION_PANEL2_TRIGGER_DISABLED'
        : isDryRun
        ? input.flow === 'welcome' ? 'WELCOME_DRY_RUN' : 'INSTALL_DRY_RUN'
        : input.flow === 'welcome' ? input.ok ? 'WELCOME_SENT' : 'WELCOME_FAILED' : input.ok ? 'INSTALL_SENT' : 'INSTALL_FAILED',
      message: isDryRun ? 'Flow de prospeccao simulado.' : input.ok ? 'Flow de prospeccao enviado.' : 'Falha ao chamar flow de prospeccao.',
      metadata: { ...(input.metadata || {}), targetPhone: phone, flow: input.flow, device: input.device || null, code: input.code },
    })
    return { ok: true }
  })
}

export async function recordOutboundReply(input: { phone: string; body: string; status: 'sent' | 'dry_run' | 'failed'; leadId?: string | null; campaignId?: string | null; evolutionMessageId?: string | null; error?: string | null; eventType: string }) {
  if (postgresBackend.isEnabled()) return postgresBackend.recordOutboundReply(input)
  return withLock(async (db) => {
    const phone = normalizePhone(input.phone)
    const lead = db.leads.find((item) => item.id === input.leadId) || db.leads.find((item) => item.phone_e164 === phone)
    const timestamp = now()
    db.messages.unshift({
      id: id(),
      campaign_id: input.campaignId || lead?.campaign_id || null,
      lead_id: input.leadId || lead?.id || null,
      direction: 'outbound',
      type: 'manual',
      template_id: null,
      body: input.body,
      status: input.status,
      evolution_message_id: input.evolutionMessageId || null,
      error_message: input.error || null,
      created_at: timestamp,
    })
    event(db, {
      campaign_id: input.campaignId || lead?.campaign_id || null,
      lead_id: input.leadId || lead?.id || null,
      event_type: input.eventType,
      message: input.status === 'failed' ? 'Falha ao responder inbound.' : 'Resposta automatica enviada ou simulada.',
      metadata: { targetPhone: phone, status: input.status, evolutionMessageId: input.evolutionMessageId || null, error: input.error || null },
    })
    return { ok: true }
  })
}

export async function recordInbound(input: { phone: string; text: string; classification: string; device?: string; leadName?: string; messageId?: string | null; instanceName?: string | null }) {
  if (postgresBackend.isEnabled()) return postgresBackend.recordInbound(input)
  const phone = normalizePhone(input.phone)
  if (!phone) throw new Error('Telefone inbound invalido.')
  return withLock(async (db) => {
    if (input.messageId && db.messages.some((message) => message.direction === 'inbound' && message.evolution_message_id === input.messageId)) {
      event(db, { campaign_id: null, lead_id: null, event_type: 'inbound_duplicate', message: 'Mensagem inbound duplicada ignorada.', metadata: { phone, messageId: input.messageId } })
      return { lead: null, duplicate: true }
    }
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
      lead.status = input.classification === 'positive'
        ? 'responded_positive'
        : input.classification === 'wrong_number'
        ? 'wrong_number'
        : input.classification === 'opt_out'
        ? 'opt_out'
        : 'responded'
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
      evolution_message_id: input.messageId || null,
      error_message: null,
      created_at: timestamp,
    }
    db.messages.unshift(message)
    if ((input.classification === 'opt_out' || input.classification === 'wrong_number') && !db.optouts.some((optout) => optout.phone_e164 === phone)) {
      const optout: ProspectionOptout = { id: id(), phone_e164: phone, reason: input.text, created_at: timestamp }
      db.optouts.unshift(optout)
    }
    event(db, { campaign_id: lead?.campaign_id || null, lead_id: lead?.id || null, event_type: `inbound_${input.classification}`, message: 'Resposta recebida.', metadata: { device: input.device || null } })
    return { lead, message }
  })
}

export async function authorizeRealRecipient(input: { phone: string; flow?: string; source?: string }) {
  if (postgresBackend.isEnabled()) return postgresBackend.authorizeRealRecipient(input)
  const config = getProspectionConfig()
  const phone = normalizePhone(input.phone)
  if (!phone) return { ok: false, allowed: false, code: 'INVALID_PHONE', reason: 'Telefone invalido.' }
  if (config.connectedInstancePhone && phone === config.connectedInstancePhone) {
    return { ok: false, allowed: false, code: 'PROSPECTION_BLOCKED_SELF_TARGET', reason: 'Telefone da propria instancia.' }
  }
  const db = await readDb()
  if (db.optouts.some((optout) => optout.phone_e164 === phone)) {
    return { ok: false, allowed: false, code: 'PROSPECTION_BLOCKED_OPTOUT', reason: 'Telefone em opt-out.' }
  }
  const lead = db.leads
    .filter((item) => item.phone_e164 === phone && !['duplicate', 'invalid_phone', 'opt_out'].includes(item.status))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
  if (!lead) return { ok: false, allowed: false, code: 'PROSPECTION_BLOCKED_NOT_IMPORTED', reason: 'Telefone nao existe em lote importado valido.' }
  const campaign = db.campaigns.find((item) => item.id === lead.campaign_id)
  if (!campaign) return { ok: false, allowed: false, code: 'PROSPECTION_BLOCKED_MISSING_CAMPAIGN', reason: 'Campanha do lead nao encontrada.' }
  if (campaign.instance_name !== config.evolutionInstance) {
    return { ok: false, allowed: false, code: 'PROSPECTION_BLOCKED_WRONG_INSTANCE', reason: 'Campanha usa instancia diferente da prospeccao.' }
  }
  return {
    ok: true,
    allowed: true,
    code: 'PROSPECTION_RECIPIENT_AUTHORIZED',
    phone,
    campaignId: campaign.id,
    campaignName: campaign.name,
    leadId: lead.id,
    leadStatus: lead.status,
    instanceName: campaign.instance_name,
  }
}

export async function cleanupTestDryRunData() {
  if (postgresBackend.isEnabled()) return postgresBackend.cleanupTestDryRunData()
  return withLock(async (db) => {
    const testCampaignIds = new Set(
      db.campaigns
        .filter((campaign) => /teste|test|dry-run|dryrun|mock|sample/i.test(campaign.name))
        .map((campaign) => campaign.id),
    )
    for (const message of db.messages) {
      if (message.campaign_id && message.status === 'dry_run') testCampaignIds.add(message.campaign_id)
    }
    for (const eventItem of db.events) {
      const marker = `${eventItem.event_type} ${JSON.stringify(eventItem.metadata)}`
      if (eventItem.campaign_id && /dry_run|dry-run|dryrun|mock|sample|leads_teste/i.test(marker)) testCampaignIds.add(eventItem.campaign_id)
    }
    const before = {
      campaigns: db.campaigns.length,
      leads: db.leads.length,
      messages: db.messages.length,
      events: db.events.length,
    }
    db.campaigns = db.campaigns.filter((campaign) => !testCampaignIds.has(campaign.id))
    db.leads = db.leads.filter((lead) => !testCampaignIds.has(lead.campaign_id))
    db.messages = db.messages.filter((message) => !message.campaign_id || !testCampaignIds.has(message.campaign_id))
    db.events = db.events.filter((eventItem) => !eventItem.campaign_id || !testCampaignIds.has(eventItem.campaign_id))
    return {
      campaigns: before.campaigns - db.campaigns.length,
      leads: before.leads - db.leads.length,
      messages: before.messages - db.messages.length,
      events: before.events - db.events.length,
      optouts: 0,
    }
  })
}
