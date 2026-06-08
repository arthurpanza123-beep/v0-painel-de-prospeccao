export interface ProspectionConfig {
  apiBaseUrl: string
  panel2ApiBaseUrl: string
  dryRun: boolean
  enabled: boolean
  prospectionDatabaseUrl: string
  defaultBatchLimit: number
  defaultWindowMinutes: number
  defaultMinDelaySeconds: number
  defaultMaxDelaySeconds: number
  allowedStartTime: string
  allowedEndTime: string
  evolutionApiUrl: string
  evolutionApiKey: string
  evolutionInstance: string
  prospectionPublicUrl: string
  evolutionTimeoutMs: number
  realAllowedPhones: string[]
  storageFile: string
  supabaseUrl: string
  supabaseServiceRoleKey: string
}

function boolEnv(value: string | undefined, fallback: boolean) {
  if (!value) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function intEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback
}

function listEnv(value: string | undefined) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getProspectionConfig(): ProspectionConfig {
  return {
    apiBaseUrl: String(process.env.PROSPECTION_API_BASE_URL || 'http://127.0.0.1:3003').replace(/\/+$/, ''),
    panel2ApiBaseUrl: String(process.env.PANEL2_API_BASE_URL || 'http://127.0.0.1:3002').replace(/\/+$/, ''),
    dryRun: boolEnv(process.env.PROSPECTION_DRY_RUN, true),
    enabled: boolEnv(process.env.PROSPECTION_ENABLED, false),
    prospectionDatabaseUrl: String(process.env.PROSPECTION_DATABASE_URL || '').trim(),
    defaultBatchLimit: intEnv(process.env.PROSPECTION_DEFAULT_BATCH_LIMIT, 15),
    defaultWindowMinutes: intEnv(process.env.PROSPECTION_DEFAULT_WINDOW_MINUTES, 50),
    defaultMinDelaySeconds: intEnv(process.env.PROSPECTION_DEFAULT_MIN_DELAY_SECONDS, 160),
    defaultMaxDelaySeconds: intEnv(process.env.PROSPECTION_DEFAULT_MAX_DELAY_SECONDS, 270),
    allowedStartTime: String(process.env.PROSPECTION_ALLOWED_START_TIME || '09:00'),
    allowedEndTime: String(process.env.PROSPECTION_ALLOWED_END_TIME || '20:00'),
    evolutionApiUrl: String(process.env.EVOLUTION_API_URL || '').replace(/\/+$/, ''),
    evolutionApiKey: String(process.env.EVOLUTION_API_KEY || ''),
    evolutionInstance: String(process.env.EVOLUTION_PROSPECTION_INSTANCE || 'centralplay-leads'),
    prospectionPublicUrl: String(process.env.PROSPECTION_PUBLIC_URL || 'https://prospeccao.centralplayplus.com.br').replace(/\/+$/, ''),
    evolutionTimeoutMs: intEnv(process.env.EVOLUTION_TIMEOUT_MS, 30000),
    realAllowedPhones: listEnv(process.env.PROSPECTION_REAL_ALLOWED_PHONES),
    storageFile: String(process.env.PROSPECTION_STORAGE_FILE || 'storage/prospection-db.json'),
    supabaseUrl: String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
    supabaseServiceRoleKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
  }
}

export function getSafetyFlags(config = getProspectionConfig()) {
  return {
    dryRun: config.dryRun,
    enabled: config.enabled,
    realSendingAllowed: config.enabled && !config.dryRun && config.realAllowedPhones.length > 0,
  }
}
