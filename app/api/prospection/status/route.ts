import { NextResponse } from 'next/server'
import { getSafetyFlags } from '@/lib/prospection/config'
import { getWhatsappStatus } from '@/lib/prospection/evolution'
import { getQueueSummary, getStatus, secondsUntilNext } from '@/lib/prospection/store'

function toIso(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().replace('Z', '-03:00')
}

function nowIso() {
  return toIso(new Date().toISOString()) || new Date().toISOString()
}

function formatSeconds(seconds: number | null, fallback: string) {
  if (seconds == null) return fallback
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return minutes > 0 ? `${minutes}min ${String(rest).padStart(2, '0')}s` : `${rest}s`
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const campaignId = url.searchParams.get('campaign_id') || url.searchParams.get('campaignId') || undefined
  const [status, queue, whatsapp] = await Promise.all([
    getStatus({ campaignId }),
    getQueueSummary({ campaignId }),
    getWhatsappStatus(),
  ])
  const flags = getSafetyFlags()
  const currentTimeServer = nowIso()
  const queueCount = status.stats.queued + (queue.current ? 1 : 0)
  const campaign = status.activeCampaign
  const current = queue.current
  const rawNextSend = campaign?.status === 'running' || campaign?.status === 'paused' ? campaign.next_send_after || status.stats.nextSend || null : null
  const nextSendAt = toIso(rawNextSend)
  const nextSendInSeconds = campaign?.status === 'running' ? secondsUntilNext(nextSendAt) : null
  const campaignStatus = !campaign
    ? 'no_campaign'
    : campaign.status === 'cancelled'
    ? 'cancelled'
    : campaign.status === 'completed'
    ? 'completed'
    : campaign.status === 'paused'
    ? 'paused'
    : campaign.status === 'running'
    ? queueCount > 0 || current ? 'running_dry_run' : 'waiting_for_leads'
    : queueCount > 0
    ? 'ready'
    : status.stats.imported > 0
    ? 'waiting_for_leads'
    : 'draft'
  const nextSendDisplay =
    campaignStatus === 'running_dry_run' && current
      ? 'Processando envio...'
      : campaignStatus === 'running_dry_run' && nextSendInSeconds === 0
      ? 'Aguardando worker...'
      : campaignStatus === 'running_dry_run'
      ? formatSeconds(nextSendInSeconds, 'Calculando...')
      : campaignStatus === 'paused'
      ? (status as { safetyPauseMessage?: string | null }).safetyPauseMessage || 'Pausado'
      : campaignStatus === 'ready'
      ? 'Aguardando início'
      : campaignStatus === 'waiting_for_leads'
      ? 'Fila vazia'
      : campaignStatus === 'completed'
      ? 'Campanha finalizada'
      : campaignStatus === 'cancelled'
      ? 'Cancelada'
      : campaignStatus === 'draft'
      ? 'Aguardando leads'
      : 'Sem campanha'
  return NextResponse.json({
    ok: true,
    stats: {
      leadsImportados: status.stats.imported,
      naFila: status.stats.queued,
      enviadosHoje: status.stats.sentToday,
      responderam: status.stats.responded,
      optOut: status.stats.optOut,
      numeroErrado: (status.stats as { wrongNumber?: number }).wrongNumber || 0,
      proximoEnvio: nextSendInSeconds,
      proximoEnvioIso: nextSendAt,
    },
    campaign_status: campaignStatus,
    next_send_at: nextSendAt,
    next_send_in_seconds: nextSendInSeconds,
    next_send_display: nextSendDisplay,
    current_time_server: currentTimeServer,
    queue_count: queueCount,
    is_paused: campaignStatus === 'paused',
    is_dry_run: flags.dryRun || !flags.enabled,
    real_sending_allowed: flags.realSendingAllowed,
    whatsapp,
    activeCampaign: status.activeCampaign,
    queue,
    flags,
    safety_pause_message: (status as { safetyPauseMessage?: string | null }).safetyPauseMessage || null,
  })
}
