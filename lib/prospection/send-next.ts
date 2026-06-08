import { getProspectionConfig } from './config'
import { sendProspectionText } from './evolution'
import { completeSend, failSend, reserveNextLead } from './store'

export async function sendNextProspectionLead() {
  const reserved = await reserveNextLead()
  if (!reserved.ok) return reserved
  const { campaign, lead } = reserved
  if (!campaign || !lead) return { ok: false, code: 'RESERVATION_INCOMPLETE' }
  const body = lead.message_preview || ''
  try {
    const send = await sendProspectionText({ phone: lead.phone_e164, message: body })
    if (!send.ok) {
      await failSend({ campaignId: campaign.id, leadId: lead.id, error: `${send.code}: ${send.message || 'Falha no envio.'}` })
      return { ok: false, code: send.code, send }
    }
    const config = getProspectionConfig()
    const completed = await completeSend({
      campaignId: campaign.id,
      leadId: lead.id,
      body,
      templateId: lead.template_id || 1,
      status: config.dryRun || !config.enabled ? 'dry_run' : 'sent',
      evolutionMessageId: 'evolutionMessageId' in send ? send.evolutionMessageId : null,
    })
    return { ok: true, code: config.dryRun || !config.enabled ? 'DRY_RUN_SENT' : 'SENT', result: completed }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await failSend({ campaignId: campaign.id, leadId: lead.id, error: message })
    return { ok: false, code: 'SEND_NEXT_FAILED', message }
  }
}
