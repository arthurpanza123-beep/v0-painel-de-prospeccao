export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled'

export type LeadStatus =
  | 'imported'
  | 'queued'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'dry_run_sent'
  | 'responded'
  | 'responded_positive'
  | 'opt_out'
  | 'invalid_phone'
  | 'duplicate'
  | 'error'

export type MessageDirection = 'outbound' | 'inbound'
export type MessageType = 'initial' | 'welcome' | 'install' | 'manual' | 'system'

export interface ProspectionCampaign {
  id: string
  name: string
  status: CampaignStatus
  instance_name: string
  rate_limit_count: number
  rate_limit_window_minutes: number
  min_delay_seconds: number
  max_delay_seconds: number
  allowed_start_time: string
  allowed_end_time: string
  next_send_after?: string | null
  created_at: string
  updated_at: string
}

export interface ProspectionLead {
  id: string
  campaign_id: string
  name: string
  phone_raw: string
  phone_e164: string
  email?: string | null
  city?: string | null
  uf?: string | null
  source_file_name?: string | null
  status: LeadStatus
  template_id?: number | null
  message_preview?: string | null
  scheduled_at?: string | null
  sent_at?: string | null
  responded_at?: string | null
  last_response_text?: string | null
  send_attempts: number
  error_message?: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProspectionMessage {
  id: string
  campaign_id?: string | null
  lead_id?: string | null
  direction: MessageDirection
  type: MessageType
  template_id?: number | null
  body: string
  status: string
  evolution_message_id?: string | null
  error_message?: string | null
  created_at: string
}

export interface ProspectionOptout {
  id: string
  phone_e164: string
  reason: string
  created_at: string
}

export interface ProspectionTemplate {
  id: number
  name: string
  body: string
  active: boolean
  weight: number
  created_at: string
  updated_at: string
}

export interface ProspectionEvent {
  id: string
  campaign_id?: string | null
  lead_id?: string | null
  event_type: string
  message: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ProspectionDb {
  campaigns: ProspectionCampaign[]
  leads: ProspectionLead[]
  messages: ProspectionMessage[]
  optouts: ProspectionOptout[]
  templates: ProspectionTemplate[]
  events: ProspectionEvent[]
}

export interface ImportSummary {
  imported: number
  valid: number
  queued: number
  duplicates: number
  invalid: number
  optOutIgnored: number
  alreadySent: number
  activeClientsBlocked: number
  errors: number
  testReimports: number
  campaignId: string
  details: Array<{
    row: number
    name: string
    phoneRaw: string
    phoneE164: string
    status: LeadStatus
    reason: string
    queued: boolean
  }>
}

export interface ImportRowsOptions {
  campaignId?: string
  forceTestReimport?: boolean
}
