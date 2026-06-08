import { NextResponse } from 'next/server'
import { getSafetyFlags } from '@/lib/prospection/config'
import { getWhatsappStatus } from '@/lib/prospection/evolution'
import { getQueueSummary, getStatus, secondsUntilNext } from '@/lib/prospection/store'

export async function GET() {
  const [status, queue, whatsapp] = await Promise.all([
    getStatus(),
    getQueueSummary(),
    getWhatsappStatus(),
  ])
  return NextResponse.json({
    ok: true,
    stats: {
      leadsImportados: status.stats.imported,
      naFila: status.stats.queued,
      enviadosHoje: status.stats.sentToday,
      responderam: status.stats.responded,
      optOut: status.stats.optOut,
      proximoEnvio: secondsUntilNext(status.stats.nextSend),
      proximoEnvioIso: status.stats.nextSend,
    },
    whatsapp,
    activeCampaign: status.activeCampaign,
    queue,
    flags: getSafetyFlags(),
  })
}
