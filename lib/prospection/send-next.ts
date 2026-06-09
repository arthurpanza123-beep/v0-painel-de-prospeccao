import { getProspectionConfig } from './config'
import { sendProspectionText } from './evolution'
import { completeSend, failSend, recordProspectionEvent, reserveNextLead } from './store'

export async function sendNextProspectionLead(input?: { force?: boolean; campaignId?: string }) {
  const reserved = await reserveNextLead(input)
  if (!reserved.ok) return reserved
  const { campaign, lead } = reserved
  if (!campaign || !lead) return { ok: false, code: 'RESERVATION_INCOMPLETE' }
  const body = lead.message_preview || ''
  const config = getProspectionConfig()
  const allowlisted = config.realAllowedPhones.includes(lead.phone_e164)
  const importedCampaignAllowed = Boolean(config.allowImportedRealRecipients && lead.campaign_id === campaign.id)
  if (campaign.instance_name !== config.evolutionInstance) {
    await recordProspectionEvent({
      eventType: 'PROSPECTION_BLOCKED_WRONG_INSTANCE',
      message: 'Envio real bloqueado porque a campanha nao usa a instancia de prospeccao configurada.',
      phone: lead.phone_e164,
      instanceName: campaign.instance_name,
      metadata: { campaignId: campaign.id, leadId: lead.id, expectedInstance: config.evolutionInstance, campaignInstance: campaign.instance_name },
    }).catch(() => null)
    await failSend({ campaignId: campaign.id, leadId: lead.id, error: `PROSPECTION_BLOCKED_WRONG_INSTANCE: campanha=${campaign.instance_name}; esperado=${config.evolutionInstance}` })
    return { ok: false, code: 'PROSPECTION_BLOCKED_WRONG_INSTANCE' }
  }
  await recordProspectionEvent({
    eventType: 'PROSPECTION_REAL_SEND_PREPARED',
    message: 'Envio real preparado para o lead reservado.',
    phone: lead.phone_e164,
    instanceName: campaign.instance_name,
    metadata: {
      campaignId: campaign.id,
      leadId: lead.id,
      campaignName: campaign.name,
      targetPhone: lead.phone_e164,
      instance: campaign.instance_name,
      allowlisted,
      importedCampaignAllowed,
      allowImportedRealRecipients: config.allowImportedRealRecipients,
      dryRun: config.dryRun,
      enabled: config.enabled,
    },
  }).catch(() => null)
  try {
    const send = await sendProspectionText({ phone: lead.phone_e164, message: body, allowCampaignRecipient: importedCampaignAllowed })
    if (!send.ok) {
      if (send.code === 'REAL_SEND_NOT_ALLOWED' || send.code === 'PROSPECTION_BLOCKED_NOT_ALLOWLISTED') {
        await recordProspectionEvent({
          eventType: 'PROSPECTION_BLOCKED_NOT_ALLOWLISTED',
          message: 'Envio real bloqueado fora da allowlist.',
          phone: lead.phone_e164,
          instanceName: campaign.instance_name,
          metadata: { campaignId: campaign.id, leadId: lead.id, code: send.code },
        }).catch(() => null)
      }
      await failSend({ campaignId: campaign.id, leadId: lead.id, error: `${send.code}: ${send.message || 'Falha no envio.'}` })
      return { ok: false, code: send.code, send }
    }
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
