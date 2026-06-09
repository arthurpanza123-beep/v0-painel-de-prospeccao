"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ActionMenu, type MenuAction } from "@/components/prospecting/ActionMenu"
import { ConfirmModal } from "@/components/prospecting/ConfirmModal"
import { ImportMiniCard } from "@/components/prospecting/ImportMiniCard"
import { MetricsBar } from "@/components/prospecting/MetricsBar"
import { QueueMiniCard } from "@/components/prospecting/QueueMiniCard"
import { WhatsAppMiniCard } from "@/components/prospecting/WhatsAppMiniCard"
import {
  type Lead,
  type WhatsAppStatus,
} from "@/lib/mock-data"

type MobileTab = "whatsapp" | "importar" | "fila"
type OperationalStatus = "no_campaign" | "draft" | "ready" | "running_dry_run" | "paused" | "waiting_for_leads" | "completed" | "cancelled" | "error"

type ConfirmDialog = {
  title: string
  text: string
  cancelLabel: string
  confirmLabel: string
  tone?: "primary" | "danger"
  resolve: (confirmed: boolean) => void
}

type ApiStatus = {
  stats?: {
    leadsImportados: number
    naFila: number
    enviadosHoje: number
    responderam: number
    optOut: number
    numeroErrado?: number
    proximoEnvio: number | null
  }
  campaign_status?: OperationalStatus
  next_send_at?: string | null
  next_send_in_seconds?: number | null
  next_send_display?: string
  current_time_server?: string
  queue_count?: number
  is_dry_run?: boolean
  real_sending_allowed?: boolean
  safety_pause_message?: string | null
  whatsapp?: {
    status?: string
    state?: string
    connectionStatus?: string | null
    instance?: string
    number?: string | null
    profileName?: string | null
  }
  activeCampaign?: { id: string; name?: string; status: string } | null
  queue?: {
    current: ApiLead | null
    upcoming: ApiLead[]
    lastSent: ApiLead | null
  }
  flags?: {
    dryRun: boolean
    enabled: boolean
    realSendingAllowed: boolean
  }
}

type ApiLead = {
  id: string
  name: string
  phone_e164: string
  email?: string | null
  city?: string | null
  uf?: string | null
  status: string
  template_id?: number | null
  scheduled_at?: string | null
  sent_at?: string | null
}

const formatCountdown = (seconds?: number | null) => {
  if (seconds == null) return "--:--"
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

const formatHumanCountdown = (seconds?: number | null) => {
  if (seconds == null) return "Aguardando início"
  if (seconds <= 0) return "00s"
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes > 0 ? `${minutes}min ${String(rest).padStart(2, "0")}s` : `${rest}s`
}

const formatRemainingLabel = (seconds?: number | null) => {
  if (seconds == null) return "calculando"
  if (seconds <= 0) return "00s"
  return `faltam ${formatHumanCountdown(seconds)}`
}

const pluralPeople = (value: number) => `${value} ${value === 1 ? "pessoa" : "pessoas"}`

const mapLead = (lead: ApiLead | null, fallbackStatus: Lead["status"]): Lead | null => {
  if (!lead) return null
  return {
    id: lead.id,
    nome: lead.name || "Sem nome",
    telefone: lead.phone_e164,
    email: lead.email || "",
    cidade: lead.city || "",
    uf: lead.uf || "",
    status: fallbackStatus,
    templateIndex: Math.max(0, (lead.template_id || 1) - 1),
    proximoEnvio: lead.scheduled_at ? new Date(lead.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : undefined,
    enviadoEm: lead.sent_at ? new Date(lead.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : undefined,
  }
}

export default function ProspectingPage() {
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>("desconectado")
  const [campaignStatus, setCampaignStatus] = useState<OperationalStatus>("no_campaign")
  const [mobileTab, setMobileTab] = useState<MobileTab>("whatsapp")
  const [stats, setStats] = useState({ leadsImportados: 0, naFila: 0, enviadosHoje: 0, responderam: 0, optOut: 0, numeroErrado: 0, proximoEnvio: "--:--" })
  const [queue, setQueue] = useState<{ current: Lead | null; upNext: Lead[]; lastSent: Lead | null }>({ current: null, upNext: [], lastSent: null })
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [activeCampaignName, setActiveCampaignName] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrUpdatedAt, setQrUpdatedAt] = useState<string | null>(null)
  const [qrRequestState, setQrRequestState] = useState<"idle" | "loading" | "done">("idle")
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [whatsappMeta, setWhatsappMeta] = useState<{ instance?: string; number?: string | null; profileName?: string | null }>({})
  const [runtime, setRuntime] = useState({
    nextSendAt: null as string | null,
    serverNowMs: Date.now(),
    receivedAtMs: Date.now(),
    nextSendDisplay: "Sem campanha",
    queueCount: 0,
    isDryRun: true,
    realSendingAllowed: false,
  })
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null)

  const isRunning = campaignStatus === "running_dry_run"
  const isPaused = campaignStatus === "paused"
  const hasLeadsQueued = stats.naFila > 0 || Boolean(queue.current)
  const nextLead = queue.current || queue.upNext[0] || null
  const realBatchMode = Boolean(runtime.realSendingAllowed && !runtime.isDryRun)
  const campaignLabel = campaignStatus === "no_campaign"
    ? "Sem campanha"
    : campaignStatus === "ready"
    ? "Pronta"
    : campaignStatus === "running_dry_run"
    ? "Campanha ativa"
    : campaignStatus === "paused"
    ? "Pausada"
    : campaignStatus === "waiting_for_leads"
    ? "Aguardando leads"
    : campaignStatus === "completed"
    ? "Campanha finalizada"
    : campaignStatus === "cancelled"
    ? "Cancelada"
    : "Rascunho"

  const localServerNowMs = runtime.serverNowMs + (nowMs - runtime.receivedAtMs)
  const nextSendSeconds = runtime.nextSendAt && isRunning
    ? Math.max(0, Math.ceil((new Date(runtime.nextSendAt).getTime() - localServerNowMs) / 1000))
    : null
  const nextSendHeadline = isRunning
    ? queue.current
      ? "Enviando..."
      : nextSendSeconds == null
      ? "Calculando..."
      : formatCountdown(nextSendSeconds)
    : campaignStatus === "completed"
    ? "Finalizada"
    : runtime.nextSendDisplay
  const nextSendDetail = isRunning && nextLead?.nome
      ? `${nextLead.nome} · ${realBatchMode ? "envio real" : "modo seguro"}`
    : isPaused && nextLead?.nome
    ? `${nextLead.nome} · próximo ao retomar`
    : campaignStatus === "completed" && queue.lastSent?.nome
    ? `${queue.lastSent.nome} · finalizado`
    : realBatchMode
    ? "Envio real liberado"
    : "Modo seguro"
  const nextSendQueueLabel = isRunning ? formatHumanCountdown(nextSendSeconds) : runtime.nextSendDisplay
  const qrAgeSeconds = qrUpdatedAt ? Math.max(0, Math.floor((nowMs - new Date(qrUpdatedAt).getTime()) / 1000)) : null
  const queueSize = Math.max(runtime.queueCount || 0, stats.naFila || 0)
  const averageIntervalSeconds = 215
  const projectionForHours = (hours: number) => Math.min(queueSize, Math.floor((hours * 60 * 60) / averageIntervalSeconds))
  const todayOperationalHours = 9
  const projectionCards = [
    { label: "Próxima 1h", value: projectionForHours(1) },
    { label: "Próximas 5h", value: projectionForHours(5) },
    { label: "Dia útil", value: projectionForHours(todayOperationalHours) },
  ]
  const nextSendFooterLabel = isRunning
    ? nextSendSeconds != null && nextSendSeconds <= 0
      ? "00s - aguardando worker"
      : formatRemainingLabel(nextSendSeconds)
    : isPaused && runtime.nextSendAt
    ? "timer pausado"
    : runtime.nextSendDisplay

  const askConfirmation = useCallback((config: Omit<ConfirmDialog, "resolve">) => (
    new Promise<boolean>((resolve) => {
      setConfirmDialog({ ...config, resolve })
    })
  ), [])

  const closeConfirmation = (confirmed: boolean) => {
    const dialog = confirmDialog
    setConfirmDialog(null)
    dialog?.resolve(confirmed)
  }

  const refresh = useCallback(async () => {
    const statusRes = await fetch("/api/prospection/status", { cache: "no-store" }).then((response) => response.json() as Promise<ApiStatus>)
    setStats({
      leadsImportados: statusRes.stats?.leadsImportados || 0,
      naFila: statusRes.stats?.naFila || 0,
      enviadosHoje: statusRes.stats?.enviadosHoje || 0,
      responderam: statusRes.stats?.responderam || 0,
      optOut: statusRes.stats?.optOut || 0,
      numeroErrado: statusRes.stats?.numeroErrado || 0,
      proximoEnvio: statusRes.next_send_display || formatCountdown(statusRes.stats?.proximoEnvio),
    })
    const rawWhatsappStatus = String(statusRes.whatsapp?.status || "")
    const rawWhatsappState = String(statusRes.whatsapp?.state || statusRes.whatsapp?.connectionStatus || "")
    const nextWhatsappStatus =
      rawWhatsappStatus === "connected"
        ? "conectado"
        : rawWhatsappState === "connecting" || rawWhatsappStatus === "connecting"
        ? "conectando"
        : "desconectado"
    setWhatsappStatus(nextWhatsappStatus)
    setWhatsappMeta({
      instance: statusRes.whatsapp?.instance || "centralplay-leads",
      number: statusRes.whatsapp?.number || null,
      profileName: statusRes.whatsapp?.profileName || null,
    })
    if (nextWhatsappStatus === "conectado") {
      setQrCode(null)
      setQrUpdatedAt(null)
    }
    setActiveCampaignId(statusRes.activeCampaign?.id || null)
    setActiveCampaignName(statusRes.activeCampaign?.name || null)
    setCampaignStatus(statusRes.campaign_status || "no_campaign")
    setRuntime({
      nextSendAt: statusRes.next_send_at || null,
      serverNowMs: statusRes.current_time_server ? new Date(statusRes.current_time_server).getTime() : Date.now(),
      receivedAtMs: Date.now(),
      nextSendDisplay: statusRes.next_send_display || "Sem campanha",
      queueCount: statusRes.queue_count || 0,
      isDryRun: statusRes.is_dry_run ?? true,
      realSendingAllowed: statusRes.real_sending_allowed ?? false,
    })
    setQueue({
      current: mapLead(statusRes.queue?.current || null, "enviando"),
      upNext: (statusRes.queue?.upcoming || []).map((lead) => mapLead(lead, "aguardando")).filter(Boolean) as Lead[],
      lastSent: mapLead(statusRes.queue?.lastSent || null, "enviado"),
    })
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), whatsappStatus === "conectado" ? 10000 : 5000)
    return () => clearInterval(timer)
  }, [refresh, whatsappStatus])

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const createCampaign = async (name: string) => {
    const response = await fetch("/api/prospection/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const payload = await response.json()
    setActiveCampaignId(payload.campaign?.id || null)
    setActiveCampaignName(payload.campaign?.name || null)
    setCampaignStatus("draft")
    await refresh()
    return payload.campaign?.id || null
  }

  const ensureCampaign = async () => {
    if (activeCampaignId && !["completed", "cancelled", "no_campaign"].includes(campaignStatus)) return activeCampaignId
    return createCampaign("Campanha de prospecção")
  }

  const handleNewCampaign = async () => {
    if (!(await askConfirmation({
      title: "Criar campanha limpa?",
      text: "Uma nova campanha será criada sem apagar o histórico anterior. Importe a planilha antes de iniciar.",
      cancelLabel: "Voltar",
      confirmLabel: "Nova campanha",
    }))) return
    await createCampaign("Campanha de prospecção")
  }

  const handleStart = async () => {
    if (!hasLeadsQueued) {
      setMobileTab("importar")
      return
    }
    if (!(await askConfirmation({
      title: realBatchMode ? "Iniciar campanha real?" : "Iniciar em modo seguro?",
      text: realBatchMode
        ? "As mensagens serão enviadas pelo WhatsApp conectado, respeitando intervalo de 2min40s a 4min30s e limite de 15 mensagens a cada 50 minutos.\n\nContatos já abordados, opt-out, duplicados e números errados serão ignorados."
        : "A campanha será processada sem envio real. Use esse modo para validar fila, timer e respostas.",
      cancelLabel: "Cancelar",
      confirmLabel: realBatchMode ? "Iniciar campanha real" : "Iniciar",
    }))) return
    const id = await ensureCampaign()
    if (!id) return
    await fetch(`/api/prospection/campaigns/${id}/start`, { method: "POST" })
    await refresh()
  }

  const handlePause = async () => {
    if (!activeCampaignId) return
    if (!(await askConfirmation({
      title: "Pausar campanha?",
      text: "A fila será interrompida até você retomar.",
      cancelLabel: "Cancelar",
      confirmLabel: "Pausar",
    }))) return
    await fetch(`/api/prospection/campaigns/${activeCampaignId}/pause`, { method: "POST" })
    await refresh()
  }

  const handleResume = async () => {
    if (!activeCampaignId) return
    if (!(await askConfirmation({
      title: "Retomar campanha?",
      text: "A fila continuará a partir do próximo lead disponível.",
      cancelLabel: "Cancelar",
      confirmLabel: "Retomar",
    }))) return
    await fetch(`/api/prospection/campaigns/${activeCampaignId}/resume`, { method: "POST" })
    await refresh()
  }

  const handleCancel = async () => {
    if (!activeCampaignId) return
    if (!(await askConfirmation({
      title: "Cancelar campanha?",
      text: "A campanha será encerrada. Leads já processados continuarão no histórico.",
      cancelLabel: "Voltar",
      confirmLabel: "Cancelar campanha",
      tone: "danger",
    }))) return
    await fetch(`/api/prospection/campaigns/${activeCampaignId}/cancel`, { method: "POST" })
    await refresh()
  }

  const confirmTestReimport = useCallback(() => askConfirmation({
    title: "Reimportar número autorizado?",
    text: "Use apenas para 5522988473304 ou 5522988345946. Leads comuns duplicados continuam bloqueados.",
    cancelLabel: "Cancelar",
    confirmLabel: "Reimportar teste",
  }), [askConfirmation])

  const handleConfigureWhatsApp = useCallback(async () => {
    setQrRequestState("loading")
    setWhatsappStatus("conectando")
    try {
      const response = await fetch("/api/prospection/whatsapp/qr", { method: "POST" })
      const payload = await response.json()
      setQrCode(payload.qrCode || null)
      setQrUpdatedAt(payload.qrUpdatedAt || new Date().toISOString())
      setWhatsappStatus("conectando")
    } finally {
      setQrRequestState("done")
    }
  }, [])

  useEffect(() => {
    if (whatsappStatus !== "conectado" && !qrCode && qrRequestState === "idle") void handleConfigureWhatsApp()
  }, [handleConfigureWhatsApp, qrCode, qrRequestState, whatsappStatus])

  const handleConfirmImport = async (file: File, forceTestReimport = false) => {
    const campaignId = await ensureCampaign()
    const form = new FormData()
    form.append("file", file)
    if (campaignId) form.append("campaignId", campaignId)
    if (forceTestReimport) form.append("forceTestReimport", "true")
    const response = await fetch("/api/prospection/upload", { method: "POST", body: form })
    const payload = await response.json()
    await refresh()
    return payload.summary || null
  }

  const handleCleanupTest = async () => {
    if (!(await askConfirmation({
      title: "Limpar campanha de teste?",
      text: "Somente dados marcados como teste serão limpos.",
      cancelLabel: "Cancelar",
      confirmLabel: "Limpar teste",
      tone: "danger",
    }))) return
    await fetch("/api/prospection/admin/cleanup-test-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "LIMPAR_TESTES_DRY_RUN" }),
    })
    await refresh()
  }

  const handleDisconnectWhatsapp = async () => {
    if (!(await askConfirmation({
      title: "Desconectar WhatsApp?",
      text: "A instância centralplay-leads será desconectada.",
      cancelLabel: "Cancelar",
      confirmLabel: "Desconectar",
      tone: "danger",
    }))) return
    await fetch("/api/prospection/whatsapp/disconnect", { method: "POST" })
    await refresh()
  }

  const primaryLabel = isRunning
    ? "Pausar"
    : isPaused
    ? "Retomar"
    : ["no_campaign", "completed", "cancelled"].includes(campaignStatus)
    ? "Nova campanha"
    : realBatchMode
    ? "Iniciar campanha real"
    : "Iniciar"

  const handlePrimary = () => {
    if (isRunning) return void handlePause()
    if (isPaused) return void handleResume()
    if (["no_campaign", "completed", "cancelled"].includes(campaignStatus)) return void handleNewCampaign()
    return void handleStart()
  }

  const secondaryActions = useMemo(() => {
    const actions: MenuAction[] = []
    if (activeCampaignId && ["ready", "running_dry_run", "paused", "draft", "waiting_for_leads"].includes(campaignStatus)) {
      actions.push({ label: "Cancelar campanha", tone: "danger", onSelect: () => void handleCancel() })
    }
    actions.push({ label: "Limpar teste autorizado", onSelect: () => void handleCleanupTest() })
    actions.push({ label: "Desconectar WhatsApp", tone: "danger", onSelect: () => void handleDisconnectWhatsapp() })
    return actions
  }, [activeCampaignId, campaignStatus])

  const nextLeadName = nextLead?.nome || "Importe leads para começar"
  const nextLeadLabel = isRunning
    ? `Enviando: ${nextLeadName}`
    : hasLeadsQueued
    ? `Próximo: ${nextLeadName}`
    : "Importe leads para começar"

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden">
      <div className="mx-auto flex min-w-0 w-full max-w-6xl flex-1 flex-col px-3 sm:px-5 lg:px-6">
        <header className="flex shrink-0 items-center gap-3 py-4 sm:py-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="btn-glossy flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground" aria-hidden="true">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">Central Play Plus Prospecção</h1>
              <p className="text-xs text-muted-foreground">Fila real, timer e respostas</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handlePrimary}
              disabled={campaignStatus === "error"}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase transition-all sm:text-sm ${
                isRunning
                  ? "border border-border bg-secondary text-foreground hover:bg-muted"
                  : "btn-glossy text-primary-foreground"
              } disabled:opacity-40`}
            >
              {!isRunning && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
              )}
              {primaryLabel}
            </button>
            <ActionMenu actions={secondaryActions} />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-3 pb-6 sm:gap-4">
          <MetricsBar
            stats={stats}
            nextSend={{
              value: nextSendHeadline,
              detail: nextSendDetail,
              tone: isPaused ? "text-[var(--warning)]" : isRunning ? "text-primary" : "text-[var(--warning)]",
            }}
          />

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            <section className="neon-panel flex min-h-[320px] flex-col rounded-xl p-5 lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    Próximo disparo
                  </p>
                  <h2 className="mt-4 text-5xl font-bold leading-none tracking-normal text-foreground sm:text-7xl">
                    {isRunning ? <span className="font-mono tabular-nums">{nextSendHeadline}</span> : campaignLabel}
                  </h2>
                  <p className="mt-4 truncate text-sm text-muted-foreground sm:text-base">
                    {nextLeadLabel}
                  </p>
                </div>
                <button
                  onClick={handlePrimary}
                  aria-label={primaryLabel}
                  className="neon-action grid h-16 w-16 shrink-0 place-items-center rounded-full text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 sm:h-20 sm:w-20"
                >
                  {isRunning ? (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1" aria-hidden="true">
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-auto grid gap-3 pt-7 sm:grid-cols-4">
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Fila ativa</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{queueSize}</p>
                </div>
                {projectionCards.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-secondary/45 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{pluralPeople(item.value)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/35 px-4 py-3 text-xs text-muted-foreground">
                <span>Status: <strong className="font-semibold text-foreground">{campaignLabel}</strong></span>
                <span>Próximo envio: <strong className="font-mono font-semibold tabular-nums text-foreground">{nextSendFooterLabel}</strong></span>
                <span>{realBatchMode ? "Envio real liberado" : "Modo seguro"}</span>
              </div>
            </section>

            <WhatsAppMiniCard
              status={whatsappStatus}
              qrCode={qrCode}
              qrAgeSeconds={qrAgeSeconds}
              instanceName={whatsappMeta.instance || "centralplay-leads"}
              connectedNumber={whatsappMeta.number}
              profileName={whatsappMeta.profileName}
              onRefreshQR={handleConfigureWhatsApp}
            />
          </div>

          <div className="hidden grid-cols-3 gap-3 sm:gap-4 lg:grid">
            <ImportMiniCard
              leadsImportados={stats.leadsImportados}
              onConfirmImport={handleConfirmImport}
              onConfirmTestReimport={confirmTestReimport}
            />
            <div className="lg:col-span-2">
              <QueueMiniCard
                current={queue.current}
                upNext={queue.upNext}
                lastSent={queue.lastSent}
                campaignStatus={campaignStatus}
                nextSendLabel={nextSendQueueLabel}
                emptyLabel={campaignStatus === "paused" ? "Campanha pausada" : "Fila vazia"}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col lg:hidden">
            <div className="flex-1">
              {mobileTab === "whatsapp" && (
                <WhatsAppMiniCard
                  status={whatsappStatus}
                  qrCode={qrCode}
                  qrAgeSeconds={qrAgeSeconds}
                  instanceName={whatsappMeta.instance || "centralplay-leads"}
                  connectedNumber={whatsappMeta.number}
                  profileName={whatsappMeta.profileName}
                  onRefreshQR={handleConfigureWhatsApp}
                />
              )}
              {mobileTab === "importar" && (
                <ImportMiniCard
                  leadsImportados={stats.leadsImportados}
                  onConfirmImport={handleConfirmImport}
                  onConfirmTestReimport={confirmTestReimport}
                />
              )}
              {mobileTab === "fila" && (
                <QueueMiniCard
                  current={queue.current}
                  upNext={queue.upNext}
                  lastSent={queue.lastSent}
                  campaignStatus={campaignStatus}
                  nextSendLabel={nextSendQueueLabel}
                  emptyLabel={campaignStatus === "paused" ? "Campanha pausada" : "Fila vazia"}
                />
              )}
            </div>

            <nav className="mt-3 grid shrink-0 grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1">
              {[
                { id: "whatsapp" as const, label: "WhatsApp" },
                { id: "importar" as const, label: "Importar" },
                { id: "fila" as const, label: "Fila" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMobileTab(tab.id)}
                  aria-pressed={mobileTab === tab.id}
                  className={`rounded-xl py-2 text-xs font-medium transition-colors ${
                    mobileTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </main>
      </div>

      <ConfirmModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title || ""}
        description={confirmDialog?.text || ""}
        cancelLabel={confirmDialog?.cancelLabel}
        confirmLabel={confirmDialog?.confirmLabel || "Confirmar"}
        tone={confirmDialog?.tone || "primary"}
        onClose={() => closeConfirmation(false)}
        onConfirm={() => closeConfirmation(true)}
      />
    </div>
  )
}
